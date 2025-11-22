import mongoose from 'mongoose';
import express from 'express';
import errorHandler from '../middlewares/error.middleware.js';
import { roleAuthBuilder } from '../middlewares/roles.middleware.js';
import { USER_ROLES, STAFF_ROLES } from '../constants/roles.constants.js';
import { validateObjectId, validateObjectIds } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import { assignOrderValidation } from '../middlewares/delivery.validator.js';
import Business from '../models/business.model.js';
import Order from '../models/order.model.js';
import User from '../models/user.model.js';

const router = express.Router();

router.get(
  '/delivery-man-users/:id',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const businessId = req.params.id;

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: req.t('businessIdRequired'),
        });
      }

      const business = await Business.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId.createFromHexString(businessId),
          },
        },
        // Convertir _id del business → id
        {
          $addFields: {
            id: '$_id',
          },
        },
        {
          $project: {
            _id: 0,
            id: 1,
            staff: 1,
          },
        },
        // Filtrar staff (solo delivery + isActive true)
        {
          $project: {
            id: 1,
            staff: {
              $filter: {
                input: '$staff',
                as: 's',
                cond: {
                  $and: [{ $in: ['delivery', '$$s.roles'] }, { $eq: ['$$s.isActive', true] }],
                },
              },
            },
          },
        },
        // Lookup a users (pero limitado a 3 campos)
        {
          $lookup: {
            from: 'users',
            localField: 'staff.user',
            foreignField: '_id',
            as: 'staffUsers',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  userName: 1,
                  email: 1,
                  phoneNumber: 1,
                },
              },
            ],
          },
        },
        // Unir staff con staffUsers
        {
          $addFields: {
            staff: {
              $map: {
                input: '$staff',
                as: 'st',
                in: {
                  user: {
                    $let: {
                      vars: {
                        userObj: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$staffUsers',
                                as: 'u',
                                cond: { $eq: ['$$u._id', '$$st.user'] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: {
                        id: '$$userObj._id',
                        userName: '$$userObj.userName',
                        email: '$$userObj.email',
                        phoneNumber: '$$userObj.phoneNumber',
                      },
                    },
                  },
                  roles: '$$st.roles',
                  isActive: '$$st.isActive',
                  addedAt: '$$st.addedAt',
                },
              },
            },
          },
        },
        // Limpiar staffUsers del output
        { $project: { staffUsers: 0 } },
      ]);

      if (!business || business.length === 0) {
        return res.status(404).json({
          success: false,
          message: req.t('businessNotFound'),
        });
      }

      if (!business[0].staff || business[0].staff.length === 0) {
        return res.status(404).json({
          success: false,
          message: req.t('notDeliveryManActive'),
        });
      }

      res.status(200).json({ success: true, data: business });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

// Assign order to delivery man
router.post(
  '/assign',
  roleAuthBuilder.staff({ includeAdmin: true }),
  assignOrderValidation,
  validateRequest,
  async (req, res) => {
    try {
      const currentUser = req.auth;
      const { orderId, deliveryManId } = req.body;

      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ success: false, message: req.t('orderNotFound') });

      if (order.status !== 'ready') {
        return res.status(404).json({ success: false, message: req.t('orderNotReadyToAssign') });
      }

      const deliveryMan = await User.findById(deliveryManId);
      if (!deliveryMan) {
        return res.status(404).json({ success: false, message: req.t('userNotFound') });
      }

      // Validate user belongs to business
      const business = await Business.findById(order.business);

      if (!business) {
        return res.status(404).json({ success: false, message: req.t('businessNotFound') });
      }

      //Current user is business owner or staff
      const isOwner = business.owner?.toString() === currentUser.id.toString();

      const staffEntry = business.staff.find(
        (s) =>
          s.user.toString() === currentUser.id.toString() &&
          s.isActive === true
      );

      if (!isOwner && !staffEntry) {
        return res.status(403).json({
          success: false,
          message: req.t('accessDeniedNotBusinessMember'),
        });
      }

      // Delivery man is staff member
      const staffMember = business.staff.find(
        (s) => s.user.toString() === deliveryManId.toString()
      );

      if (!staffMember) {
        return res.status(403).json({ success: false, message: req.t('deliveryManNotRegistered') });
      }

      // Validate roles and status
      if (!staffMember.roles.includes('delivery') || !staffMember.isActive) {
        return res
          .status(403)
          .json({ success: false, message: req.t('userNotAnActiveDeliveryStaff') });
      }

      order.status = 'assignedToShip';
      order.deliveryMan = deliveryManId;
      order.deliveryAssignedAt = new Date();

      await order.save();

      res.status(201).json({
        success: true,
        message: req.t('orderAssignedSuccessfully'),
        data: order,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

// Get assigned orders to delivery man
router.get('/my-orders', roleAuthBuilder.staff({ includeAdmin: true }), async (req, res) => {
  try {
    const currentUser = req.auth;
    const deliveryManId = currentUser.id;

    const orders = await Order.find({
      deliveryMan: deliveryManId,
      status: 'assignedToShip',
    }).sort({ deliveryAssignedAt: 1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: req.t('noOrdersFound') });
    }

    // Group orders by business
    const groups = {};
    for (const order of orders) {
      const bId = order.business.toString();

      if (!groups[bId]) groups[bId] = [];

      groups[bId].push(order);
    }

    // Convert grouping to an array sorted by the age of the first element
    const sorted = Object.entries(groups)
      .map(([businessId, orders]) => ({
        businessId,
        oldest: orders[0].deliveryAssignedAt,
        orders,
      }))
      .sort((a, b) => new Date(a.oldest) - new Date(b.oldest));

    res.json({ results: sorted });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

export default router;
