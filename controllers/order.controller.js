import mongoose from 'mongoose';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import Counter from '../models/counter.model.js';
import { getNextOrderNumberForBusiness, formatOrderNumber } from '../services/counter.service.js';
import errorHandler from '../middlewares/error.middleware.js';

export const createOrdersGroupedByBusiness = async (req, res) => {
  //Create order for each business
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderItems, deliveryMethod, shippingInfo, paymentInfo, shippingPrice } = req.body;
    const { auth: currentUser } = req;

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
        !Number.isInteger(orderItem.quantity) ||
        !orderItem.price ||
        orderItem.price <= 0
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
      const product = await products.find((p) => p._id.toString() === orderItem.product);

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

      const businesId = product.business.id.toString();
      if (!itemsWithPricesByBusiness[businesId]) {
        itemsWithPricesByBusiness[businesId] = [];
      }

      itemsWithPricesByBusiness[businesId].push({
        product: product._id,
        title: product.title,
        slug: product.title.replaceAll(' ', '-').toLowerCase(),
        quantity: orderItem.quantity,
        price: product.price,
      });

      //Update product stock
      product.countInStock -= orderItem.quantity;
      await product.save({ session });
    }

    //Calculate total price
    const totalPrice = Object.values(itemsWithPricesByBusiness).reduce((acc, items) => {
      const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
      return acc + subtotal;
    }, 0);

    const createdOrders = [];
    const orderGroup = Date.now();

    for (const [businessId, items] of Object.entries(itemsWithPricesByBusiness)) {
      const itemsPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

      const seq = await getNextOrderNumberForBusiness(businessId, session);
      const orderNumber = formatOrderNumber(businessId, seq);

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
        shippingInfo,
        paymentInfo,
        shippingPrice: shippingPrice || 0,
        totalPrice: itemsPrice,
      });

      const savedOrder = await newOrder.save({ session });

      await savedOrder.populate([
        { path: 'orderItems.product', select: 'image', options: { session } },
      ]);

      createdOrders.push(savedOrder);
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: true,
      message: req.t('orderCreatedSuccessfully'),
      data: createdOrders,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }

    errorHandler(error, req, res);
  }
};
