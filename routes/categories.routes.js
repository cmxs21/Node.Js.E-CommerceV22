import express from 'express';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import Category from '../models/category.model.js';
import { adminAuth } from '../middlewares/roles.middleware.js';

const router = express.Router();

router.post('/', adminAuth, async (req, res) => {
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

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();

    if (!categories || categories.length === 0) {
      return res.status(404).send({ success: false, message: req.t('noCategories') });
    }

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.delete(
  '/:id',
  adminAuth,
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const category = await Category.findByIdAndDelete(req.params.id);

      if (!category) {
        return res.status(404).send({ message: req.t('categoryNotFound') });
      }

      return res
        .status(200)
        .send({ message: req.t('categoryDeletedSuccessfully') });
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }
);

router.put(
  '/:id',
  adminAuth,
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

      return res
        .status(200)
        .send({ message: req.t('categoryUpdatedSuccessfully') });
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }
);

export default router;
