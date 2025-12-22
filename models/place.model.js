import mongoose from "mongoose";
import { addCommonVirtuals } from './plugins/mongooseTransform.js';

const placeSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  status: {
    type: String,
    enum: ["available", "pending", "confirmed"],
    default: "available"
  },

  currentUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User" // staff
  },

  confirmedAt: Date

}, { timestamps: true });

// _id -> id
placeSchema.plugin(addCommonVirtuals);

export default mongoose.model("Place", placeSchema);
