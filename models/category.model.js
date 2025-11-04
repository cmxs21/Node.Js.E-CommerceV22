import mongoose from 'mongoose';
import { addCommonVirtuals } from './plugins/mongooseTransform.js';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

// _id -> id
categorySchema.plugin(addCommonVirtuals);

const Category = mongoose.model('Category', categorySchema);

export default Category;
