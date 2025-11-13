import express from 'express';
import { userAuth } from '../middlewares/roles.middleware.js';
import errorHandler from '../middlewares/error.middleware.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import { sendEmail } from '../services/email.service.js';
import Business from '../models/business.model.js';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import { createOrdersGroupedByBusiness } from '../controllers/order.controller.js';
import { ORDER_STATUS, ORDER_STATUS_VALID_TRANSITIONS } from '../constants/status.constants.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.post('/create', userAuth, createOrdersGroupedByBusiness);

router.get('/', async (req, res) => {
  try {
    const currentUser = req.auth;
    const search = req.query.search;
    let baseFilters = {};
    let accessFilters = {};

    //Pagination params from query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (currentUser.role === 'admin') {
      // Admin see all
      accessFilters = {};
    } else if (currentUser.role === 'user') {
      // Buyer see only his orders
      accessFilters = { user: currentUser.id };
    } else {
      // Merchant o Staff, search for businesses where the user is involved
      const businesses = await Business.find({
        $or: [{ owner: currentUser.id }, { 'staff.user': currentUser.id }],
      }).select('_id');

      const businessIds = businesses.map((b) => b._id);

      accessFilters = { business: { $in: businessIds } };
    }

    if (search && Object.values(ORDER_STATUS).includes(search.toLowerCase())) {
      baseFilters.status = search.toLowerCase();
    }

    const filters = { ...baseFilters, ...accessFilters };

    const [orders, totalOrders] = await Promise.all([
      OrderModel.find(filters)
        //.populate('user', 'name email phoneNumber')
        //.populate('orderItems.product', 'images')
        .populate('business', 'name logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // lean() returns a plain JavaScript object
      OrderModel.countDocuments(filters),
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    const shareDataResponse = {
      page,
      limit,
      totalPages,
      totalOrders,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      filter: req.query,
    };

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .send({ status: false, message: req.t('noOrdersFound'), ...shareDataResponse });
    }

    res.status(200).json({ success: true, data: orders, ...shareDataResponse });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

router.get('/:id', validateObjectId, validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.auth;
    let accessFilters = {};

    if (currentUser.role === 'admin') {
      // Admin see all
      accessFilters = {};
    } else if (currentUser.role === 'user') {
      // Buyer see only his orders
      accessFilters = { user: currentUser.id };
    } else {
      // Merchant o Staff, search for businesses where the user is involved
      const businesses = await Business.find({
        $or: [{ owner: currentUser.id }, { 'staff.user': currentUser.id }],
      }).select('_id');

      const businessIds = businesses.map((b) => b._id);

      accessFilters = { business: { $in: businessIds } };
    }

    const filters = { _id: id, ...accessFilters };

    const order = await OrderModel.findOne(filters)
      //.populate('user', 'name email phoneNumber')
      .populate('orderItems.product', 'images')
      .populate('business', 'name logo')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: req.t('orderNotFound') });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

router.patch('/:id/status', validateObjectId, validateRequest, async (req, res) => {
  try {
    const currentUser = req.auth;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: req.t('statusRequired') });
    }

    if (!Object.values(ORDER_STATUS).includes(status.toLowerCase())) {
      return res.status(400).json({ success: false, message: req.t('invalidStatus') });
    }

    if (currentUser.role === 'user' && status !== ORDER_STATUS.CANCELLED) {
      return res.status(403).json({
        success: false,
        message: req.t('userCanOnlyUseCancelStatus'),
      });
    }

    const orderPreviousData = await OrderModel.findById(id)
      .populate('business', 'name logo')
      .lean();

    if (!orderPreviousData) {
      return res.status(404).json({ success: false, message: req.t('orderNotFound') });
    }

    if (orderPreviousData.status === ORDER_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: req.t('orderReactivationNotAllowed'),
        currentStatus: orderPreviousData.status,
      });
    }

    const allowedNextStatuses = ORDER_STATUS_VALID_TRANSITIONS[orderPreviousData.status];

    if (!allowedNextStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: req.t('orderInvalidStatusTransition', {
          from: orderPreviousData.status,
          to: status.toLowerCase(),
        }),
      });
    }

    if (status === orderPreviousData.status) {
      return res.status(400).json({
        success: false,
        message: req.t('orderAlreadyHasTheStatus'),
        currentStatus: orderPreviousData.status,
      });
    }

    if (currentUser.role === 'staff' && status === ORDER_STATUS.CANCELLED) {
      return res.status(403).json({
        success: false,
        message: req.t('ordersCanOnlyBeCancelledByMerchantOrBuyer'),
      });
    }

    let accessFilters = {};

    if (currentUser.role === 'admin') {
      // Admin see all
      accessFilters = {};
    } else if (currentUser.role === 'user') {
      // Buyer see only his orders
      accessFilters = { user: currentUser.id, status: ORDER_STATUS.PENDING };
    } else {
      // Merchant o Staff, search for businesses where the user is involved
      const businesses = await Business.find({
        $or: [{ owner: currentUser.id }, { 'staff.user': currentUser.id }],
      }).select('_id');

      const businessIds = businesses.map((b) => b._id);

      accessFilters = { business: { $in: businessIds }, status: { $ne: ORDER_STATUS.CANCELLED } };
    }

    const filters = { _id: id, ...accessFilters };

    const order = await OrderModel.findOneAndUpdate(filters, { status }, { new: true });

    if (!order) {
      //Verify if order belongs to the user to inform the current status
      if (currentUser.role === 'user') {
        const currentOrder = await OrderModel.findOne({ _id: id, user: currentUser.id }).select(
          'status'
        );

        if (currentOrder && currentOrder.status !== ORDER_STATUS.PENDING) {
          return res.status(200).json({
            success: false,
            message: req.t('userCanOnlyCancelPendingOrders'),
            currentStatus: order.status,
          });
        }
      }

      return res.status(404).json({ success: false, message: req.t('orderNotFound') });
    }

    //Return stock for cancellation
    if (status === ORDER_STATUS.CANCELLED && orderPreviousData.status !== ORDER_STATUS.CANCELLED) {
      const updates = order.orderItems.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { countInStock: item.quantity } },
        },
      }));

      await ProductModel.bulkWrite(updates);

      await sendEmail({
        to: 'ctecia.reports@gmail.com', //order.user.email,
        subject: req.t('orderStatusUpdatedSuccessfully', { status: req.t(status) }),
        text: req.t('orderStatusUpdatedSuccessfully', { status: req.t(status) }),
        html: req.t('orderStatusUpdatedSuccessfullyNotification', {
          businessName: orderPreviousData.business.name,
          name: orderPreviousData.name,
          orderId: orderPreviousData._id,
          status: req.t(status),
        }),
      });
    }

    res.status(200).json({
      success: true,
      message: req.t('orderStatusUpdatedSuccessfully', { status: req.t(status) }),
      data: order,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

export default router;
