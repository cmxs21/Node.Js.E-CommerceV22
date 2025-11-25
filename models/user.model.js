import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { addCommonVirtuals } from './plugins/mongooseTransform.js';
import { USER_STATUS } from '../constants/status.constants.js';

const addressSubSchema = new mongoose.Schema({
  label: { type: String, default: 'Added' },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String, default: '' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  phoneNumber: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
  notes: { type: String, default: '' },
});

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      message: `Invalid user status. Must be one of: ${Object.values(USER_STATUS).join(', ')}`,
      default: 'pending',
    },
    phoneVerifiedAt: {
      type: Date,
      default: null,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    addresses: { type: [addressSubSchema], default: [] },
  },
  {
    timestamps: true, // add createdAt and updatedAt fields
  }
);

//Hash the password before saving the user with if not modified condition go next, then use try catch to handle errors
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

//Instance method password comparison
userSchema.methods.comparePassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw error;
  }
};

//Create method to JSON the user virtuals without password
userSchema.methods.toJSON = function () {
  const user = this.toObject({
    virtuals: true,
  });
  delete user.password;
  return user;
};

// Helper: get default address (returns object or null)
userSchema.methods.getDefaultAddress = function () {
  if (this.addresses && this.addresses.length > 0) {
    const def = this.addresses.find((a) => a.isDefault);
    if (def) return def;
    return this.addresses[0];
  }

  // fallback to legacy single-address fields if present
  if (this.addressLine1) {
    return {
      label: 'Primary',
      addressLine1: this.addressLine1,
      addressLine2: this.addressLine2 || '',
      city: this.city || '',
      state: this.state || '',
      postalCode: this.postalCode || '',
      country: this.country || '',
      phoneNumber: this.phoneNumber || '',
      isDefault: true,
    };
  }

  return null;
};

// _id -> id
userSchema.plugin(addCommonVirtuals);

export default mongoose.model('User', userSchema);
