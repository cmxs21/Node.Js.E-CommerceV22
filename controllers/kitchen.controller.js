import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import Business from '../models/business.model.js';
import { hasBusinessAccess } from '../utils/businessAccess.utils.js';
import errorHandler from '../middlewares/error.middleware.js';
import {
  ORDER_ITEM_STATUS,
  ORDER_ITEM_STATUS_VALID_TRANSITIONS,
} from '../constants/status.constants.js';

/**
 * List kitchen items by status (pending, process, ready)
 */
export const listKitchenItems = async (req, res) => {
  try {
    const currentUser = req.user;
    const { businessId } = req.params;
    const { status } = req.query;

    if (status && !Object.values(ORDER_ITEM_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: req.t('invalidProductStatus'),
      });
    }

    const business = await Business.findById(businessId).select('owner staff');
    if (!business) {
      return res.status(404).json({
        success: false,
        message: req.t('businessNotFound'),
      });
    }

    if (!hasBusinessAccess(business, currentUser)) {
      return res.status(403).json({
        success: false,
        message: req.t('accessDenied'),
      });
    }

    const businessObjectId = mongoose.Types.ObjectId.isValid(businessId)
      ? mongoose.Types.ObjectId.createFromHexString(businessId)
      : null;

    const kitchenItems = await Order.aggregate([
      {
        $match: {
          business: businessObjectId,
          'paymentInfo.status': { $ne: 'cancelled' },
        },
      },

      // Flatten orderItems
      { $unwind: '$orderItems' },

      // Filter by item status
      {
        $match: {
          'orderItems.productStatus': status,
        },
      },

      // Priority: HERE first, TOGO later
      {
        $addFields: {
          deliveryPriority: {
            $cond: [{ $eq: ['$deliveryMethod', 'here'] }, 0, 1],
          },
        },
      },

      // Sort items FIFO
      {
        $sort: {
          deliveryPriority: 1, // HERE first
          'orderItems.createdAt': 1, // FIFO
        },
      },

      // Group by product inside place
      {
        $group: {
          _id: {
            place: '$place',
            product: '$orderItems.product',
          },
          items: {
            $push: {
              orderId: '$_id',
              itemId: '$orderItems._id',
              quantity: '$orderItems.quantity',
              notes: '$orderItems.notes',
              productStatus: '$orderItems.productStatus',
              createdAt: '$orderItems.createdAt',
              deliveryMethod: '$deliveryMethod',
            },
          },
          firstItemAt: { $min: '$orderItems.createdAt' },
          deliveryPriority: { $first: '$deliveryPriority' },
        },
      },

      // Group by place
      {
        $group: {
          _id: '$_id.place',
          products: {
            $push: {
              productId: '$_id.product',
              items: '$items',
            },
          },
          placeFirstItemAt: { $min: '$firstItemAt' },
          deliveryPriority: { $min: '$deliveryPriority' },
        },
      },

      // Sort places
      {
        $sort: {
          deliveryPriority: 1, // HERE places first
          placeFirstItemAt: 1, // Oldest first
        },
      },

      // Populate references
      {
        $lookup: {
          from: 'places',
          localField: '_id',
          foreignField: '_id',
          as: 'place',
        },
      },
      { $unwind: { path: '$place', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          as: 'productsData',
        },
      },
    ]);

    res.json({
      success: true,
      items: kitchenItems,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
};

/**
 * ==========================================
 * UPDATE PRODUCT STATUS
 * ==========================================
 */
export const updateProductStatus = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    const { status } = req.body;
    const currentUser = req.auth;

    if (!Object.values(ORDER_ITEM_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: req.t('invalidProductStatus'),
      });
    }

    const order = await Order.findOne({
      'orderItems._id': orderItemId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: req.t('orderItemNotFound'),
      });
    }

    const orderItem = order.orderItems.id(orderItemId);

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: req.t('orderItemNotFound'),
      });
    }

    const businessHasAccess = await Business.findById(order.business).select('owner staff');

    if (!hasBusinessAccess(businessHasAccess, currentUser)) {
      return res.status(403).json({
        success: false,
        message: req.t('accessDenied'),
      });
    }

    if (orderItem.productStatus === ORDER_ITEM_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: req.t('orderReactivationNotAllowed'),
        currentStatus: order.orderItems.productStatus,
      });
    }

    const allowedNextStatuses = ORDER_ITEM_STATUS_VALID_TRANSITIONS[orderItem.productStatus];

    if (!allowedNextStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: req.t('orderItemInvalidStatusTransition', {
          from: orderItem.productStatus,
          to: status.toLowerCase(),
        }),
      });
    }

    //const item = order.orderItems.id(orderItemId);
    orderItem.productStatus = status;
    orderItem.statusHistory.push({ status, setBy: currentUser.id, setAt: new Date() });

    if (status === ORDER_ITEM_STATUS.READY) {
      orderItem.readyAt = new Date();
    }

    await order.save();

    return res.json({
      success: true,
      message: req.t('productStatusUpdated'),
      data: order,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
};
