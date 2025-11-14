import mongoose from 'mongoose';
import { sendEmail } from '../services/email.service.js';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import { getNextOrderNumberForBusiness, formatOrderNumber } from '../services/counter.service.js';
import errorHandler from '../middlewares/error.middleware.js';
import { isBusinessOpen } from '../utils/time.utils.js';

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

        //Verify if business is open
        const business = product.business;
        const businessOpen = isBusinessOpen(business);
        if (businessOpen.isOpen === false) {
          let nextOpeningText = '';

          if (businessOpen.nextOpening) {
            nextOpeningText = `${req.t(businessOpen.nextOpening.day)}, ${
              businessOpen.nextOpening.time
            }`;
          } else {
            nextOpeningText = req.t('noNextOpeningAvailable');
          }

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
              <p>${req.t('orderCreatedBody', { appName: 'Tengo Hambre' })}</p>
              <p>${req.t('belowOrderDetails')}</p>

              ${orderDetailsHtml}

              <p style="margin-top:30px;">${req.t('orderCreatedFooter')}</p>
            </div>
            <div style="background-color:#f1f1f1; padding:15px; text-align:center; font-size:12px; color:#666;">
              © ${new Date().getFullYear()} Tengo Hambre — ${req.t('allRightsReserved')}
            </div>
          </div>
        </div>
      `;

      await sendEmail({
        to: currentUser.email,
        bcc: 'ctecia.reports@gmail.com',
        subject: req.t('orderCreatedSubject', { appName: 'Tengo Hambre' }),
        html: htmlBody,
      });
    }

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
