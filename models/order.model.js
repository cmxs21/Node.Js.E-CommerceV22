import mongoose from 'mongoose';
import { addCommonVirtuals } from './plugins/mongooseTransform.js';
import {
  ORDER_STATUS,
  DELIVERY_METHODS,
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
    default: null,
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
  notes: {
    type: String,
    required: false,
    maxlength: [100, 'Order notes cannot be more than 100 characters.'],
    default: null,
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
      enum: Object.values(ORDER_STATUS),
      message: `Invalid status. Must be one of: ${Object.values(ORDER_STATUS).join(', ')}`,
      default: 'pending',
    },
    orderNotes: {
      type: String,
      required: false,
      maxlength: [250, 'Order notes cannot be more than 250 characters.'],
      default: null,
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
      enum: Object.values(DELIVERY_METHODS),
      message: `Invalid delivery method. Must be one of: ${Object.values(DELIVERY_METHODS).join(
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
      state: {
        type: String,
      },
      country: {
        type: String,
      },
      postalCode: {
        type: String,
      },
    },
    deliveryMan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deliveryAssignedAt: {
      type: Date,
      default: null,
    },
    paymentInfo: {
      method: {
        type: String,
        enum: Object.values(PAYMENT_METHOD),
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
        enum: Object.values(PAYMENT_STATUS),
        message: `Invalid payment status. Must be one of: ${Object.values(PAYMENT_STATUS).join(
          ', '
        )}`,
        default: 'pending',
      },
      provider: {
        type: String, // 'Stripe', 'PayPal', 'MercadoPago', etc.
        default: null,
      },
      paidAt: {
        type: Date,
        default: null,
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
    timezone: {
      type: String,
      required: true,
      message: 'Timezone is required.',
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
  //If business has free shipping then keep it as $0.00
  if (this.shippingPrice == null || isNaN(this.shippingPrice)) {
    this.shippingPrice = this.itemsPrice * 0.05;
  }
  this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice;

  return this.totalPrice;
};

//Pre-save middleware: runs automatically before saving the order
orderSchema.pre('save', async function (next) {
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
