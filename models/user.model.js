/**
 * User Model
 * Create the mongoose userSchema model with the required fields: email require unique, password min 6, role enum(admin (default), user),
 * userName required trim unique, city required trim, postalCode required trim, addressLine1 required trim, addressLine2 required trim default empty,
 * phoneNumber required trim
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { addCommonVirtuals } from './plugins/mongooseTransform.js';

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
      unique: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: '',
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
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

// _id -> id
userSchema.plugin(addCommonVirtuals);

export default mongoose.model('User', userSchema);
