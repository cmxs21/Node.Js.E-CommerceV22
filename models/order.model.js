import mongoose from 'mongoose';
import { addCommonVirtuals } from './plugins/mongooseTransform.js';
//import Counter from './counter.model.js';
import {
  ORDER_STATUS,
  DELIVERY_METHOD,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
} from '../constants/status.constants.js';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: false,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required.'],
    min: [1, 'Quantity must be at least 1.'],
    max: [999, 'Quantity must be at most 999.'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required.'],
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderGroup: {
      type: String,
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: false,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ORDER_STATUS), // ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      message: `Invalid status. Must be one of: ${Object.values(ORDER_STATUS).join(', ')}`,
      default: 'pending',
    },
    orderItems: [orderItemSchema],
    itemsPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required.'],
      default: 0,
    },
    deliveryMethod: {
      type: String,
      required: true,
      enum: Object.values(DELIVERY_METHOD), // ['delivery', 'pickup'],
      message: `Invalid delivery method. Must be one of: ${Object.values(DELIVERY_METHOD).join(
        ', '
      )}`,
      default: 'delivery',
    },
    shippingInfo: {
      address: {
        type: String,
      },
      city: {
        type: String,
      },
      postalCode: {
        type: String,
      },
      country: {
        type: String,
      },
    },
    paymentInfo: {
      method: {
        type: String,
        enum: Object.values(PAYMENT_METHOD), // ['card', 'cash_on_delivery', 'pickup_payment'],
        message: `Invalid payment method. Must be one of: ${Object.values(PAYMENT_METHOD).join(
          ', '
        )}`,
        required: true,
      },
      id: {
        type: String, // Payment ID if using a payment gateway (Stripe, PayPal, etc.)
      },
      status: {
        type: String,
        enum: Object.values(PAYMENT_STATUS), // ['pending', 'paid', 'failed', 'refunded'],
        message: `Invalid payment status. Must be one of: ${Object.values(PAYMENT_STATUS).join(
          ', '
        )}`,
        default: 'pending',
      },
      provider: {
        type: String, // 'Stripe', 'PayPal', 'MercadoPago', etc.
      },
      paidAt: {
        type: Date,
      },
      cashPaymentInfo: {
        amountGiven: { type: Number }, // client payment quantity
        changeDue: { type: Number }, // change to be returned to the client
      },
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ business: 1, orderNumber: 1 }, { unique: true });

// _id -> id
orderSchema.plugin(addCommonVirtuals);

//Calculate total price of all order items and taxPrice and shippingPrice
orderSchema.methods.calculateTotalPrice = function () {
  this.itemsPrice = this.orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  this.taxPrice = this.itemsPrice * 0.16;
  if (!this.shippingPrice || isNaN(this.shippingPrice)) {
    this.shippingPrice = this.itemsPrice * 0.05;
  }
  this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice;

  return this.totalPrice;
};

//Pre-save middleware: runs automatically before saving the order
orderSchema.pre('save', async function (next) {
  // if (this.isNew) {
  //   const nextNumber = await Counter.findOneAndUpdate(
  //     { business: this.business },
  //     { $inc: { sequenceValue: 1 } },
  //     { new: true, upsert: true }
  //   );
  //   this.orderNumber = nextNumber.sequenceValue;
  // }

  if (this.isModified('orderItems') || !this.totalPrice) {
    const totalPrice = this.calculateTotalPrice();
    this.totalPrice = totalPrice;

    if (
      this.paymentInfo.method === 'cash_on_delivery' &&
      this.paymentInfo.cashPaymentInfo?.amountGiven
    ) {
      this.paymentInfo.cashPaymentInfo.changeDue = totalPrice || 0;
      const amountGiven = this.paymentInfo.cashPaymentInfo.amountGiven;

      this.paymentInfo.cashPaymentInfo.changeDue =
        amountGiven > totalPrice ? amountGiven - totalPrice : 0;
    }
  }

  next();
});

export default mongoose.model('Order', orderSchema);
