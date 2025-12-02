import express from 'express';
import errorHandler from '../middlewares/error.middleware.js';
import { roleAuthBuilder } from '../middlewares/roles.middleware.js';
import { USER_ROLES, STAFF_ROLES } from '../constants/roles.constants.js';
import { PRODUCT_TYPE } from '../constants/status.constants.js';
import { validateObjectId, validateObjectIds, validateBodyObjectIds } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import Business from '../models/business.model.js';
import { hasBusinessAccess } from '../utils/businessAccess.utils.js';
import ProductModel from '../models/product.model.js';
import {
  createProductValidation,
  updateProductValidation,
} from '../middlewares/product.validator.js';
import {
  uploadSingleImage,
  uploadMultipleImages,
  getFileURL,
  handleUploadError,
} from '../middlewares/upload.middleware.js';

const router = express.Router();

router.post(
  '/',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  uploadMultipleImages,
  handleUploadError,
  createProductValidation,
  validateRequest,
  async (req, res) => {
    try {
      const currentUser = req.auth;

      let imageURLs = [];
      if (req.files && req.files.length > 0) {
        imageURLs = req.files.map((file) => getFileURL(req, file.filename));
      }

      const allowed = await hasBusinessAccess(req.body.business, currentUser);

      if (currentUser.role === USER_ROLES.ADMIN) allowed = true;

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: req.t('accessDenied'),
        });
      }

      const newProduct = new ProductModel({
        title: req.body.title,
        business: req.body.business,
        category: req.body.category,
        productType: req.body.productType,
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

router.post(
  '/combo/add-product/:comboId',
  validateObjectIds('comboId'),
  validateBodyObjectIds('productId'),
  validateRequest,
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  async (req, res) => {
    try {
      const currentUser = req.auth;
      const comboId = req.params.comboId;
      const { productId, quantity = 1 } = req.body;

      // ---------------- VALIDATIONS ----------------

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: req.t('productRequired'),
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: req.t('quantityInvalid'),
        });
      }

      const combo = await ProductModel.findById(comboId);

      if (!combo) {
        return res.status(404).json({
          success: false,
          message: req.t('comboNotFound'),
        });
      }

      if (combo.productType !== PRODUCT_TYPE.COMBO) {
        return res.status(400).json({
          success: false,
          message: req.t('productIsNotCombo'),
        });
      }

      // ---------------- ACCESS CONTROL ----------------

      const business = await Business.findById(combo.business);

      if (!business) {
        return res.status(404).json({
          success: false,
          message: req.t('businessNotFound'),
        });
      }

      let allowed = await hasBusinessAccess(business, currentUser);
      if (currentUser.role === USER_ROLES.ADMIN) allowed = true;

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: req.t('accessDenied'),
        });
      }

      // ---------------- PRODUCT VALIDATIONS ----------------

      const product = await ProductModel.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: req.t('productNotFound'),
        });
      }

      if (product.productType !== PRODUCT_TYPE.PRODUCT) {
        return res.status(400).json({
          success: false,
          message: req.t('comboCannotContainCombos'),
        });
      }

      if (combo.business.toString() !== product.business.toString()) {
        return res.status(400).json({
          success: false,
          message: req.t('productDoesNotBelongToBusiness'),
        });
      }

      // ---------------- ADD / UPDATE PRODUCT ----------------

      const existing = combo.comboProducts.find(
        (p) => p.product.toString() === productId.toString()
      );

      if (existing) {
        // If already exists, update quantity
        existing.quantity = quantity;
      } else {
        // Add new product + quantity
        combo.comboProducts.push({
          product: product._id,
          quantity,
        });
      }

      await combo.save();

      return res.status(200).json({
        success: true,
        message: req.t('productAddedToCombo'),
        data: combo,
      });

    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.post(
  '/combo/remove-product/:comboId',
  validateObjectIds('comboId'),
  validateBodyObjectIds('productId'),
  validateRequest,
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  async (req, res) => {
    try {
      const currentUser = req.auth;
      const comboId = req.params.comboId;
      const productId = req.body.productId;

      // ---------------- VALIDATION ----------------

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: req.t('productRequired'),
        });
      }

      const combo = await ProductModel.findById(comboId);

      if (!combo) {
        return res.status(404).json({
          success: false,
          message: req.t('comboNotFound'),
        });
      }

      if (combo.productType !== PRODUCT_TYPE.COMBO) {
        return res.status(400).json({
          success: false,
          message: req.t('productIsNotCombo'),
        });
      }

      // ---------------- ACCESS CONTROL ----------------

      const business = await Business.findById(combo.business);

      if (!business) {
        return res.status(404).json({
          success: false,
          message: req.t('businessNotFound'),
        });
      }

      let allowed = await hasBusinessAccess(business, currentUser);
      if (currentUser.role === USER_ROLES.ADMIN) allowed = true;

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: req.t('accessDenied'),
        });
      }

      // ---------------- REMOVE PRODUCT ----------------

      const exists = combo.comboProducts.some(
        (p) => p.product.toString() === productId.toString()
      );

      if (!exists) {
        return res.status(400).json({
          success: false,
          message: req.t('productNotInCombo'),
        });
      }

      combo.comboProducts = combo.comboProducts.filter(
        (p) => p.product.toString() !== productId.toString()
      );

      await combo.save();

      return res.status(200).json({
        success: true,
        message: req.t('productRemovedFromCombo'),
        data: combo,
      });

    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.get(
  '/products-admin/:businessId{/:categoryId}',
  roleAuthBuilder.any(
    [STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER, STAFF_ROLES.CASHIER, STAFF_ROLES.WAITER],
    { includeAdmin: true }
  ),
  async (req, res) => {
    try {
      const currentUser = req.auth;
      const requestedBusinessId = req.params.businessId;
      const categoryId = req.params.categoryId;

      if (!requestedBusinessId) {
        return res.status(400).json({
          success: false,
          message: req.t('businessIdRequired'),
        });
      }

      const search = req.query.search;

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

      if (currentUser.role === USER_ROLES.ADMIN) {
        if (requestedBusinessId) {
          filter.business = requestedBusinessId;
        }
      } else {
        if (requestedBusinessId) {
          const allowed = await hasBusinessAccess(requestedBusinessId, currentUser);
          if (!allowed) {
            return res.status(403).json({
              success: false,
              message: req.t('accessDenied'),
            });
          }

          filter.business = requestedBusinessId;
        } else {
          const userBusinesses = await Business.find({
            $or: [
              { owner: currentUser.id },
              {
                staff: {
                  $elemMatch: {
                    user: currentUser.id,
                    isActive: true,
                  },
                },
              },
            ],
          }).select('_id');

          const businessIds = userBusinesses.map((b) => b._id);

          filter.business = { $in: businessIds };
        }
      }

      const totalProducts = await ProductModel.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / limit);

      const products = await ProductModel.find(filter)
        .populate('category')
        .populate('business', 'name')
        .populate({
          path: 'comboProducts.product',
          select: 'title',
        })
        .skip(skip)
        .limit(limit);

      const shareDataResponse = {
        search,
        categoryId,
        businessId: requestedBusinessId || null,
        page,
        limit,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      if (!products || products.length === 0) {
        return res.status(200).json({
          success: false,
          message: req.t('productSearchNotFound'),
          data: [],
          ...shareDataResponse,
        });
      }

      return res.status(200).json({
        success: true,
        data: products,
        ...shareDataResponse,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

//Products buyer
router.get(
  '/:businessId{/:categoryId}',
  validateObjectIds('businessId', 'categoryId'),
  validateRequest,
  async (req, res) => {
    try {
      const businessId = req.params.businessId;
      const categoryId = req.params.categoryId;
      const search = req.query.search;

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: req.t('businessIdRequired'),
        });
      }

      const filter = { business: businessId };

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      if (categoryId) {
        filter.category = categoryId;
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const totalProducts = await ProductModel.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / limit);

      const products = await ProductModel.find(filter)
        .populate('category')
        .populate('business', 'name')
        .populate({
          path: 'comboProducts.product',
          select: 'title',
        })
        .skip(skip)
        .limit(limit);

      const shareDataResponse = {
        search,
        categoryId,
        businessId,
        page,
        limit,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      if (!products || products.length === 0) {
        return res.status(200).json({
          success: false,
          message: req.t('productSearchNotFound'),
          data: [],
          ...shareDataResponse,
        });
      }

      return res.status(200).json({
        success: true,
        data: products,
        ...shareDataResponse,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.get('/:id', validateObjectId, validateRequest, async (req, res) => {
  try {
    const product = await ProductModel.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('category')
      .populate('business', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: req.t('productNotFound') });
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

router.delete(
  '/:id',
  roleAuthBuilder.admin(),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const product = await ProductModel.findByIdAndDelete(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: req.t('productNotFound') });
      }
      return res.status(200).json({ success: true, message: req.t('productDeletedSuccessfully') });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.put(
  '/:id',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  uploadMultipleImages,
  handleUploadError,
  updateProductValidation,
  validateRequest,
  async (req, res) => {
    try {
      const currentUser = req.auth;

      const product = await ProductModel.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ success: false, message: req.t('productNotFound') });
      }

      if (currentUser.role !== USER_ROLES.ADMIN) {
        const allowed = await hasBusinessAccess(product.business, currentUser);

        if (!allowed) {
          return res.status(403).json({
            success: false,
            message: req.t('accessDenied'),
          });
        }
      }

      Object.keys(req.body).forEach((key) => {
        if (key !== 'productType' && key !== 'image') {
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
      } else if (product.image.length === 0) {
        product.image = 'noProductImage.png';
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
