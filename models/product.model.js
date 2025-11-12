import mongoose from 'mongoose';
import { addCommonVirtuals } from './plugins/mongooseTransform.js';

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required.'],
      trim: true,
      minLength: [3, 'Product title must be at least 3 characters long.'],
      maxLength: [100, 'Product title must be at most 100 characters long.'],
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required.'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required.'],
      min: [0, 'Price must be at least 0.'],
    },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      minLength: [5, 'Description must be at least 5 characters long.'],
      maxLength: [1000, 'Description must be at most 1000 characters long.'],
    },
    image: {
      type: [String],
      required: [true, 'At least one image is required.'], // Array of images.
      default: ['noProductImage.png'],
    },
    countInStock: {
      type: Number,
      required: [true, 'Count in stock is required.'],
      min: [0, 'Count in stock must be at least 0.'],
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views must be at least 0.'],
    },
    rating: {
      average: {
        type: Number,
        default: 5,
        min: [1, 'Rating must be at least 1.'],
        max: [5, 'Rating must be at most 5.'],
      },
      count: {
        type: Number,
        default: 0,
        min: [0, 'Rating count must be at least 0.'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// _id -> id
productSchema.plugin(addCommonVirtuals);

export default mongoose.model('Product', productSchema);
