import express from 'express';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import { hasBusinessAccess } from '../utils/businessAccess.utils.js';
import Category from '../models/category.model.js';
//import { adminAuth } from '../middlewares/roles.middleware.js';
import { STAFF_ROLES } from '../constants/roles.constants.js';
import { roleAuthBuilder } from '../middlewares/roles.middleware.js';

const router = express.Router();

router.post('/', roleAuthBuilder.owner(), async (req, res) => {
  try {
    if (!req.body.name || req.body.name.length < 3) {
      return res.status(400).send({ message: req.t('categoryNameValidation') });
    }

    const category = await Category.create({ name: req.body.name });

    return res.status(201).send(category);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

router.get(
  '/categories-admin/:businessId',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  async (req, res) => {
    try {
      const currentUser = req.auth;
      const userId = req.auth.id;
      const isAdmin = req.auth.roles.includes(USER_ROLES.ADMIN);
      const requestedBusinessId = req.query.businessId;

      if (!requestedBusinessId) {
        return res.status(400).json({
          success: false,
          message: req.t('businessIdRequired'),
        });
      }

      if (isAdmin) {
        const categories = await Category.find({ business: { $in: requestedBusinessId } }).populate('business', 'name');
        return res.status(200).json({ success: true, data: categories });
      }

      const allowed = await hasBusinessAccess(requestedBusinessId, currentUser);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: req.t('accessDenied')
        });
      }

      const categories = await Category.find({ business: { $in: requestedBusinessId } }).populate('business', 'name');

      if (!categories || categories.length === 0) {
        return res.status(404).send({ success: false, message: req.t('noCategories') });
      }

      return res.status(200).json({ success: true, data: categories });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
);

//User (buyer) categories
router.get(
  '/:businessId',
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const { businessId } = req.params;

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: req.t('businessIdRequired'),
        });
      }

      const categories = await Category.find({ business: businessId })
        .populate('business', 'name');

      if (!categories || categories.length === 0) {
        return res.status(404).json({
          success: false,
          message: req.t('noCategories'),
        });
      }

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);


router.delete(
  '/:id',
  roleAuthBuilder.admin(),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const category = await Category.findByIdAndDelete(req.params.id);

      if (!category) {
        return res.status(404).send({ message: req.t('categoryNotFound') });
      }

      return res.status(200).send({ message: req.t('categoryDeletedSuccessfully') });
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }
);

router.put('/:id',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const category = await Category.findByIdAndUpdate(req.params.id, {
        name: req.body.name,
        business: req.body.business,
      });

      if (!category) {
        return res.status(404).send({ message: req.t('categoryNotFound') });
      }

      return res.status(200).send({ message: req.t('categoryUpdatedSuccessfully') });
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  });

export default router;
