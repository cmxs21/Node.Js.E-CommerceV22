import express from 'express';
import ProductModel from '../models/product.model.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import { createProductValidation, updateProductValidation } from '../middlewares/product.validator.js';
import {
  adminAuth,
  userAndAdminAuth,
} from '../middlewares/roles.middleware.js';
import errorHandler from '../middlewares/error.middleware.js';
import {
  uploadSingleImage,
  uploadMultipleImages,
  getFileURL,
  handleUploadError,
} from '../middlewares/upload.middleware.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.post(
  '/',
  adminAuth,
  uploadMultipleImages,
  handleUploadError,
  createProductValidation,
  validateRequest,
  async (req, res) => {
    try {
      let imageURLs = [];
      if (req.files && req.files.length > 0) {
        imageURLs = req.files.map((file) => getFileURL(req, file.filename));
      }

      const newProduct = new ProductModel({
        title: req.body.title,
        category: req.body.category,
        price: parseFloat(req.body.price),
        description: req.body.description,
        image: imageURLs,
        countInStock: parseInt(req.body.countInStock),
      });

      const product = await newProduct.save();

      return res.status(201).json({
        success: true,
        message: req.t('productCreatedSuccessfully'),
        data: product,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.get('/', userAndAdminAuth, async (req, res) => {
  try {
    const search = req.query.search;
    const categoryId = req.query.categoryId;

    //Add pagination params from query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit; // 0, 10, 20 items to skip

    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } }, // $regex: search, $options: 'i' means case insensitive
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (categoryId) {
      filter.category = categoryId;
    }

    const totalProducts = await ProductModel.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await ProductModel.find(filter)
      .populate(
        'category'
      ).skip(skip)
      .limit(limit);

    const shareDataResponse = {
      search: search,
      categoryId: categoryId,
      page: page,
      limit: limit,
      totalPages: totalPages,
      totalProducts: totalProducts,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }

    if (!products || products.length === 0) {
      return res.status(200).json({
        success: false,
        message: req.t('productSearchNotFound'),
        data: [],
        ...shareDataResponse
      });
    }

    return res.status(200).json({
      success: true,
      data: products,
      ...shareDataResponse
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

router.get(
  '/:id',
  userAndAdminAuth,
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const product = await ProductModel
        .findByIdAndUpdate(
          req.params.id,
          { $inc: { views: 1 } },
          { new: true }
        )
        .populate(
          'category'
        );

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: req.t('productNotFound') });
      }

      return res.status(200).json({ success: true, data: product });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.delete(
  '/:id',
  adminAuth,
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const product = await ProductModel.findByIdAndDelete(req.params.id);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: req.t('productNotFound') });
      }
      return res
        .status(200)
        .json({ success: true, message: req.t('productDeletedSuccessfully') });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.put(
  '/:id',
  adminAuth,
  validateObjectId,
  uploadMultipleImages,
  handleUploadError,
  updateProductValidation,
  validateRequest,
  async (req, res) => {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: req.t('productNotFound') });
      }

      Object.keys(req.body).forEach((key) => {
        if (key !== 'image') {
          product[key] = req.body[key];
        }
      });

      if (req.files && req.files.length > 0) {
        const imageURLs = req.files.map((file) => getFileURL(req, file.filename));

        const replaceImages = req.body.replaceImages === 'true';

        if (replaceImages) {
          product.image = imageURLs;
        } else {
          product.image = [...(product.image || []), ...imageURLs];
        }
      } else if (req.file) {
        const imageURL = getFileURL(req, req.file.filename);

        if (req.body.replaceImages === 'true') {
          product.image = [imageURL];
        } else {
          product.image = [...(product.image || []), imageURL];
        }
      }

      const updatedProduct = await product.save();

      return res.status(200).json({
        success: true,
        message: req.t('productUpdatedSuccessfully'),
        data: updatedProduct,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

export default router;
