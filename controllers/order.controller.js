import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import errorHandler from '../middlewares/error.middleware.js';
import { v4 as uuid } from 'uuid';
import { sendEmail } from '../services/email.service.js';
import Business from '../models/business.model.js';
import { hasBusinessAccess } from '../utils/businessAccess.utils.js';
import { getNextOrderNumberForBusiness, formatOrderNumber } from '../services/counter.service.js';
import { isBusinessOpen } from '../utils/time.utils.js';
import Place from '../models/place.model.js';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import { DELIVERY_METHODS } from '../constants/status.constants.js';
import { ORDER_STATUS, ORDER_STATUS_VALID_TRANSITIONS } from '../constants/status.constants.js';
import { releasePlaceIfAllOrdersPaid } from '../services/place.service.js';

export const createOrdersController = async (req, res) => {
  //Create order for each business
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const { orderItems, deliveryMethod, shippingInfo, paymentInfo, shippingPrice } = req.body;
    const { auth: currentUser } = req;
    const userTimezone = req.userTimezone;

    if (
      !orderItems ||
      !Array.isArray(orderItems) ||
      orderItems.length === 0 ||
      !currentUser ||
      !currentUser.id
    ) {
      return res.status(400).json({ status: false, message: req.t('orderItemsRequired') });
    }

    for (const orderItem of orderItems) {
      if (
        !orderItem.product ||
        !orderItem.quantity ||
        orderItem.quantity <= 0 ||
        !Number.isInteger(orderItem.quantity)
      ) {
        return res.status(400).json({ status: false, message: req.t('orderItemValidation') });
      }

      if (!mongoose.Types.ObjectId.isValid(orderItem.product)) {
        return res.status(400).json({
          status: false,
          message: req.t('mongoIdValidation'),
          invalidId: orderItem.product,
        });
      }
    }

    //Verify if products IDs exists in DB
    const productsIds = orderItems.map((item) => item.product);
    const products = await ProductModel.find({ _id: { $in: productsIds } }).populate('business');

    if (products.length !== orderItems.length) {
      return res.status(400).json({
        status: false,
        message: req.t('productNotFound'),
      });
    }

    const itemsWithPricesByBusiness = {};

    //Verify if there is enough stock for the order and group items by business
    for (const orderItem of orderItems) {
      const product = products.find((p) => p._id.toString() === orderItem.product);

      if (!product) continue;

      if (product.productType === 'product') {
        if (product.countInStock < orderItem.quantity) {
          return res.status(400).json({
            status: false,
            message: req.t('notEnoughStock'),
            productId: product._id,
            productName: product.name,
            availableStock: product.countInStock,
            requestedQuantity: orderItem.quantity,
          });
        }
      }

      if (!product.price || product.price <= 0) {
        return res.status(400).json({
          status: false,
          message: req.t('productPriceCannotBeZero', { productName: product.title }),
          productId: product._id,
          productName: product.title,
          productPrice: product.price,
        });
      }

      const businessId = product.business.id.toString();

      if (!itemsWithPricesByBusiness[businessId]) {
        itemsWithPricesByBusiness[businessId] = [];

        const business = product.business;

        //Verify if busines is active or suspended
        if (!business.isActive) {
          return res.status(400).json({
            success: false,
            message: req.t('businessInactive', { businessName: business.name }),
          });
        }

        //Verify if business is open
        const businessOpen = isBusinessOpen(business);

        if (!businessOpen.isOpen) {
          let nextOpeningText = businessOpen.nextOpening
            ? `${req.t(businessOpen.nextOpening.day)}, ${businessOpen.nextOpening.time}`
            : req.t('noNextOpeningAvailable');

          return res.status(400).json({
            success: false,
            message: req.t('businessIsClosed', {
              businessName: business.name,
              nextOpening: nextOpeningText,
            }),
            nextOpening: businessOpen.nextOpening,
          });
        }
      }

      if (product.productType === 'product') {
        itemsWithPricesByBusiness[businessId].push({
          product: product._id,
          productType: 'product',
          comboGroupId: null,
          title: product.title,
          slug: product.title.replaceAll(' ', '-').toLowerCase(),
          quantity: orderItem.quantity,
          price: product.price,
          notes: orderItem.notes,
        });

        //Update product stock
        product.countInStock -= orderItem.quantity;
        await product.save({ session });

        continue;
      }

      //Logic to combos and combos groups
      if (product.productType === 'combo') {
        const comboGroupId = uuid();

        // Add main product of the combo
        itemsWithPricesByBusiness[businessId].push({
          product: product._id,
          productType: 'combo',
          comboGroupId,
          title: product.title,
          slug: product.title.replaceAll(' ', '-').toLowerCase(),
          quantity: orderItem.quantity,
          price: product.price,
          notes: orderItem.notes,
        });

        // Add combo and its products
        for (const comboItem of product.comboProducts) {
          const subProduct = await ProductModel.findById(comboItem.product);

          if (!subProduct) continue;

          const totalQty = comboItem.quantity * orderItem.quantity;

          if (subProduct.countInStock < totalQty) {
            return res.status(400).json({
              status: false,
              message: req.t('notEnoughStock'),
              productId: subProduct._id,
              availableStock: subProduct.countInStock,
              requestedQuantity: totalQty,
            });
          }

          itemsWithPricesByBusiness[businessId].push({
            product: subProduct._id,
            productType: 'product',
            comboGroupId,
            title: subProduct.title,
            slug: subProduct.title.replaceAll(' ', '-').toLowerCase(),
            quantity: totalQty,
            price: 0, // The price of a product in a combo is 0
          });

          // Update subproduct stock
          subProduct.countInStock -= totalQty;
          await subProduct.save({ session });
        }
      }
    }

    //Calculate total price
    const totalPrice = Object.values(itemsWithPricesByBusiness).reduce((acc, items) => {
      const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
      return acc + subtotal;
    }, 0);

    const createdOrders = [];
    const orderGroup = Date.now();

    let businessMap = null;
    const isHereTogoPickup =
      deliveryMethod === DELIVERY_METHODS.HERE ||
      deliveryMethod === DELIVERY_METHODS.TOGO ||
      deliveryMethod === DELIVERY_METHODS.PICKUP;

    if (isHereTogoPickup) {
      const businessIds = Object.keys(itemsWithPricesByBusiness);

      const businesses = await Business.find({ _id: { $in: businessIds } })
        .select('address name owner')
        .populate({
          path: 'owner',
          select: 'userName email phoneNumber',
        });

      businessMap = new Map();

      businesses.forEach((biz) => {
        businessMap.set(biz._id.toString(), biz);
      });
    }

    for (const [businessId, items] of Object.entries(itemsWithPricesByBusiness)) {
      const itemsPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

      const seq = await getNextOrderNumberForBusiness(businessId, session);
      const orderNumber = formatOrderNumber(businessId, seq);

      let finalShippingInfo = {};
      if (isHereTogoPickup) {
        const business = businessMap.get(businessId);

        finalShippingInfo = {
          address: business.address.address,
          city: business.address.city,
          state: business.address.state,
          country: business.address.country,
          postalCode: business.address.postalCode,
        };
      } else if (deliveryMethod === DELIVERY_METHODS.DELIVERY) {
        finalShippingInfo = shippingInfo;
      }

      const newOrder = new OrderModel({
        orderGroup,
        orderNumber,
        business: businessId,
        user: currentUser.id,
        name: currentUser.userName,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber,
        orderItems: items,
        deliveryMethod,
        shippingInfo: finalShippingInfo,
        paymentInfo,
        shippingPrice: shippingPrice || 0,
        totalPrice: itemsPrice,
        timezone: userTimezone,
      });

      const savedOrder = await newOrder.save({ session });

      await savedOrder.populate([
        {
          path: 'orderItems.product',
          select: 'image',
          options: { session },
        },
        {
          path: 'business',
          select: 'name owner',
          populate: {
            path: 'owner',
            select: 'userName email phoneNumber',
            options: { session },
          },
          options: { session },
        },
      ]);

      createdOrders.push(savedOrder);
    }

    await session.commitTransaction();
    //await session.abortTransaction();
    session.endSession();

    if (createdOrders.length > 0) {
      const orderDetailsHtml = createdOrders
        .map((order) => {
          const business = order.business;
          const itemsHtml = order.orderItems
            .map(
              (item) => `
                <tr>
                  <td style="padding: 8px 0; display: flex; align-items: center;">
                    <img src="${
                      item.product.image
                    }" width="45" height="45" style="margin-right: 8px; border-radius: 6px;" />
                    ${item.title}
                  </td>
                  <td style="padding: 8px 0; text-align: right;">${item.quantity}</td>
                  <td style="padding: 8px 0; text-align: right;">$${(
                    item.price * item.quantity
                  ).toFixed(2)}</td>
                </tr>
              `
            )
            .join('');

          return `
            <div style="margin-bottom: 40px;">
              <h3 style="color:#333;">${business.name}</h3>
              <table style="width:100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #ddd;">
                    <th style="text-align:left; padding: 8px 0;">${req.t('product')}</th>
                    <th style="text-align:right; padding: 8px 0;">${req.t('quantity')}</th>
                    <th style="text-align:right; padding: 8px 0;">${req.t('price')}</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <p style="margin-top:10px;"><strong>${req.t(
                'tax'
              )}:</strong> $${order.taxPrice.toFixed(2)}</p>
              <p style="margin-top:10px;"><strong>${req.t(
                'shipping'
              )}:</strong> $${order.shippingPrice.toFixed(2)}</p>
              <p style="margin-top:10px;"><strong>${req.t(
                'total'
              )}:</strong> $${order.totalPrice.toFixed(2)}</p>
              <p><strong>${req.t('orderNumber')}:</strong> ${order.orderNumber}</p>
              <p style="margin-top:15px; font-size: 13px; color: #555;">
                ${req.t('merchant')}: ${business.owner.userName} <br/>
                ${req.t('contact')}: ${business.owner.email} | ${business.owner.phoneNumber}
              </p>
              <hr style="border:0; border-top:1px solid #eee; margin: 20px 0;" />
            </div>
          `;
        })
        .join('');

      const htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color:#333; background-color:#fafafa; padding: 30px;">
          <div style="max-width:600px; margin:auto; background:white; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1); overflow:hidden;">
            <div style="background-color:#ff6b00; color:white; padding:20px; text-align:center;">
              <h2 style="margin:0;">${req.t('orderCreatedTitle')}</h2>
            </div>
            <div style="padding: 30px;">
              <p>${req.t('hello')}, <strong>${currentUser.userName}</strong></p>
              <p>${req.t('orderCreatedBody', { appName: req.t('appName') })}</p>
              <p>${req.t('belowOrderDetails')}</p>

              ${orderDetailsHtml}

              <p style="margin-top:30px;">${req.t('orderCreatedFooter')}</p>
            </div>
            <div style="background-color:#f1f1f1; padding:15px; text-align:center; font-size:12px; color:#666;">
              © ${new Date().getFullYear()} ${{ appName: req.t('appName') }} — ${req.t(
        'allRightsReserved'
      )}
            </div>
          </div>
        </div>
      `;

      await sendEmail({
        to: currentUser.email,
        bcc: 'ctecia.reports@gmail.com',
        subject: req.t('orderCreatedSubject', { appName: req.t('appName') }),
        html: htmlBody,
        text: req.t('orderCreatedBody', { appName: req.t('appName') }),
      });
    }

    return res.status(201).json({
      status: true,
      message: req.t('orderCreatedSuccessfully'),
      data: createdOrders,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();

    errorHandler(error, req, res);
  } finally {
    await session.endSession();
  }
};

export const getOrCreateHereOrder = async (req, res) => {
  try {
    const currentUser = req.user;
    const { businessId, placeId } = req.body;

    const business = await Business.findById(businessId).select('owner staff timezone');
    if (!business) {
      return res.status(404).json({ success: false, message: req.t('businessNotFound') });
    }

    const place = await Place.findOne({ _id: placeId, business: businessId });

    if (!place) {
      return res.status(404).json({ success: false, message: req.t('placeNotFound') });
    }

    // Try to get existing active order
    let order = await OrderModel.findOne({
      user: currentUser.id,
      business: businessId,
      place: placeId,
      deliveryMethod: 'here',
      status: { $ne: 'paid' },
    });

    if (!order) {
      order = await OrderModel.create({
        business: businessId,
        place: placeId,
        placeName: place.name,
        placeStatusSnapshot: place.status,
        user: currentUser.id,
        name: currentUser.userName,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber,
        timezone: business.timezone,
        deliveryMethod: 'here',
        paymentInfo: { method: 'cash_on_delivery', status: 'pending' },
        status: place.status === 'confirmed' ? 'process' : 'pending',
        items: [],
        total: 0,
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    errorHandler(error, req, res);
  }
};

export const addItemToOrder = async (req, res) => {
  try {
    const currentUser = req.user;
    const { orderId, productId, quantity, notes, isToGo } = req.body;

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: req.t('orderNotFound') });
    }

    const business = await Business.findById(order.business).select('owner staff');
    if (!business) {
      return res.status(404).json({ success: false, message: req.t('businessNotFound') });
    }

    // Validate product belongs to the same business
    const product = await ProductModel.findOne({ _id: productId, business: order.business });

    if (!product) {
      return res.status(404).json({ success: false, message: req.t('productNotFound') });
    }

    // Stock validation
    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: req.t('stockNotAvailable') });
    }

    // HERE flow: check place status
    const place = await Place.findById(order.place);

    if (order.deliveryMethod === 'here') {
      if (!place) {
        return res.status(404).json({ success: false, message: req.t('placeNotFound') });
      }

      order.placeStatusSnapshot = place.status;
      order.status = place.status === 'confirmed' ? 'process' : 'pending';
    }

    // Add or update item
    //const existingItem = order.items.find((item) => item.product.toString() === productId);

    // if (existingItem) {
    //   existingItem.quantity += quantity;
    // } else {
    order.orderItems.push({
      product: productId,
      quantity,
      price: product.price,
      productStatus: place.status === 'confirmed' ? 'process' : 'pending',
      notes: isToGo ? `TO GO. ${notes || ''}` : notes || null,
    });
    //}

    // Recalculate total
    order.total = order.orderItems
      .filter((orderItem) => orderItem.productStatus !== 'cancelled')
      .reduce((sum, orderItem) => sum + orderItem.quantity * orderItem.price, 0);

    await order.save();

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
};

export const payOrder = async (req, res) => {
  try {
    const currentUser = req.user;
    const { orderId } = req.params;
    const { paymentMethod } = req.body; // 'card' | 'cash'

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: req.t('orderNotFound') });
    }

    if (order.status === 'paid') {
      return res.status(400).json({ success: false, message: req.t('orderAlreadyPaid') });
    }

    const business = await Business.findById(order.business).select('owner staff');
    if (!business) {
      return res.status(404).json({ success: false, message: req.t('businessNotFound') });
    }

    // If endpoint is /pay (USER)
    const isStaffPayment = req.originalUrl.includes('pay-by-staff');

    // Validate user / staff belongs to business (or admin)
    if (isStaffPayment && !hasBusinessAccess(business, currentUser)) {
      return res.status(403).json({ success: false, message: req.t('accessDenied') });
    }

    /**
     * ==========================================
     * PAYMENT VALIDATION
     * ==========================================
     */
    if (!isStaffPayment && paymentMethod !== 'card') {
      return res.status(400).json({ success: false, message: req.t('invalidPaymentMethod') });
    }

    if (isStaffPayment && !['cash', 'card'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: req.t('invalidPaymentMethod') });
    }

    /**
     * ==========================================
     * FINALIZE PAYMENT
     * ==========================================
     */

    order.paymentInfo = {
      method: paymentMethod,
      id: paymentMethod === 'card' ? req.body.paymentId : null,
      status: 'paid',
      provider: paymentMethod === 'card' ? req.body.paymentProvider : null,
      paidAt: new Date(),
    };

    order.status = 'consumed';

    await order.save();

    /**
     * ==========================================
     * HERE FLOW – AUTO RELEASE PLACE
     * ==========================================
     */
    if (order.deliveryMethod === 'here' && order.place) {
      await releasePlaceIfAllOrdersPaid(order.place);
    }

    res.json({
      success: true,
      message: req.t('orderPaidSuccessfully'),
      order,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
};

export const patchOrderStatus = async (req, res) => {
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
        $or: [
          { owner: currentUser.id },
          {
            staff: {
              $elemMatch: {
                user: currentUser.id,
                isActive: true,
              },
            },
          },
        ],
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
};

export const getGlobalOrders = async (req, res) => {
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
        $or: [
          { owner: currentUser.id },
          {
            staff: {
              $elemMatch: {
                user: currentUser.id,
                isActive: true,
              },
            },
          },
        ],
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

    orders.forEach((order) => {
      order.createdAt = DateTime.fromJSDate(order.createdAt, { zone: order.timezone }).toFormat(
        'yyyy-MM-dd HH:mm'
      );
      order.updatedAt = DateTime.fromJSDate(order.updatedAt, { zone: order.timezone }).toFormat(
        'yyyy-MM-dd HH:mm'
      );
      if (order.deliveryAssignedAt) {
        order.deliveryAssignedAt = DateTime.fromJSDate(order.deliveryAssignedAt, {
          zone: order.timezone,
        }).toFormat('yyyy-MM-dd HH:mm');
      }
      if (order.paymentInfo.paidAt) {
        order.paymentInfo.paidAt = DateTime.fromJSDate(order.paymentInfo.paidAt, {
          zone: order.timezone,
        }).toFormat('yyyy-MM-dd HH:mm');
      }
    });

    res.status(200).json({ success: true, data: orders, ...shareDataResponse });
  } catch (error) {
    errorHandler(error, req, res);
  }
};

export const getOrderById = async (req, res) => {
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
      // Owner or Staff, search for businesses where the user is involved
      const businesses = await Business.find({
        $or: [
          { owner: currentUser.id },
          {
            staff: {
              $elemMatch: {
                user: currentUser.id,
                isActive: true,
              },
            },
          },
        ],
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
};
