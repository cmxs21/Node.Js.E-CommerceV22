import mongoose from 'mongoose';
import { addCommonVirtuals } from './plugins/mongooseTransform.js';

const userAddressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, default: 'Home' }, // e.g. Home, Work
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phoneNumber: { type: String, default: '' }, // optional override per address
    isDefault: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

userAddressSchema.plugin(addCommonVirtuals);

export default mongoose.model('UserAddress', userAddressSchema);
