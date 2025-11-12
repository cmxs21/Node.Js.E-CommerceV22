import mongoose from 'mongoose';
import { addCommonVirtuals } from './plugins/mongooseTransform.js';

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, message: 'Business name is required.' },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      message: 'Business owner is required.',
    },
    staff: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['staff'], default: 'staff' },
        isActive: { type: Boolean, default: true },
      },
    ],
    description: { type: String },
    logo: { type: String, default: 'noBusinessLogo.png' },
    coverImage: { type: String, default: 'noBusinessCoverImage.png' },
    businessType: {
      type: String,
      enum: ['restaurant', 'tech', 'fashion', 'accessories', 'grocery', 'pets', 'health', 'others'],
      default: 'others',
    },
    address: {
      address: {
        type: String,
        required: true,
        message: 'Business address is required.',
      },
      city: {
        type: String,
        required: true,
        message: 'Business city is required.',
      },
      state: {
        type: String,
        required: true,
        message: 'Business country is required.',
      },
      country: {
        type: String,
        required: true,
        message: 'Business country is required.',
      },
      postalCode: {
        type: String,
        required: true,
        message: 'Business postal code is required.',
      },
    },
    address2: { type: String, default: '' },
    email: { type: String, required: true, message: 'Business email is required.' },
    phoneNumber: { type: String, required: true, message: 'Business phone is required.' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// _id -> id
businessSchema.plugin(addCommonVirtuals);

businessSchema.set('toJSON', {
  virtuals: true, // para incluir 'id'
  versionKey: false, // elimina __v
  transform: function (doc, ret) {
    // Elimina _id
    delete ret._id;

    // Ordena los campos manualmente
    return {
      id: ret.id,
      name: ret.name,
      description: ret.description,
      logo: ret.logo,
      coverImage: ret.coverImage,
      businessType: ret.businessType,
      address: ret.address,
      address2: ret.address2,
      email: ret.email,
      phoneNumber: ret.phoneNumber,
      owner: ret.owner,
      isActive: ret.isActive,
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
    };
  },
});

export default mongoose.model('Business', businessSchema);
