import express from 'express';
import Business from '../models/business.model.js';
import fs from 'fs';
import path from 'path';
import {
  uploadSingleImage,
  getFileURL,
  handleUploadError,
} from '../middlewares/upload.middleware.js';
import validateRequest from '../middlewares/validateRequest.js';
import { registerBusinessValidation } from '../middlewares/business.validator.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import errorHandler from '../middlewares/error.middleware.js';
import dotenv from 'dotenv';
import {
  merchantAndAdminAuth,
  merchantAuth,
  staffMerchantAdminAuth,
} from '../middlewares/roles.middleware.js';
dotenv.config();

const router = express.Router();

router.post('/', merchantAuth, registerBusinessValidation, validateRequest, async (req, res) => {
  try {
    const { auth: currentUser } = req;

    const newBusiness = new Business({
      name: req.body.name,
      owner: currentUser.id,
      description: req.body.description,
      businessType: req.body.businessType,
      address: {
        address: req.body.address.address,
        city: req.body.address.city,
        state: req.body.address.state,
        country: req.body.address.country,
        postalCode: req.body.address.postalCode,
      },
      address2: req.body.address2,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
    });

    const savedBusiness = await newBusiness.save();

    res.status(201).json({
      success: true,
      message: req.t('businessRegisteredSuccessfully'),
      data: savedBusiness,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

router.put(
  '/upload-logo/:id',
  merchantAuth,
  validateObjectId,
  uploadSingleImage,
  handleUploadError,
  async (req, res) => {
    try {
      const business = await Business.findById(req.params.id);

      if (!business) {
        return res.status(404).json({ status: false, message: req.t('businessNotFound') });
      }

      if (business.logo && business.logo !== 'noBusinessLogo.png') {
        const oldFilename = path.basename(business.logo);
        const oldFilePath = path.join(uploadDir, oldFilename);

        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log(`File deleted logo: ${oldFilename}`);
        }
      }

      const logo = req.file && req.file.filename ? req.file.filename : 'noBusinessLogo.png';

      business.logo = getFileURL(req, logo);

      const updatedBusiness = await business.save();

      res.status(200).json({
        success: true,
        message: req.t('fileUploadSuccessfully'),
        data: updatedBusiness,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.put(
  '/upload-cover/:id',
  merchantAuth,
  validateObjectId,
  uploadSingleImage,
  handleUploadError,
  async (req, res) => {
    try {
      const business = await Business.findById(req.params.id);

      if (!business) {
        return res.status(404).json({ status: false, message: req.t('businessNotFound') });
      }

      if (business.coverImage && business.coverImage !== 'noBusinessCoverImage.png') {
        const oldFilename = path.basename(business.coverImage);
        const oldFilePath = path.join(uploadDir, oldFilename);

        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log(`File deleted cover image: ${oldFilename}`);
        }
      }

      const coverImage =
        req.file && req.file.filename ? req.file.filename : 'noBusinessCoverImage.png';

      business.coverImage = getFileURL(req, coverImage);

      const updatedBusiness = await business.save();

      res.status(200).json({
        success: true,
        message: req.t('fileUploadSuccessfully'),
        data: updatedBusiness,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.put('/:id', merchantAuth, validateObjectId, validateRequest, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ status: false, message: req.t('businessNotFound') });
    }

    Object.keys(req.body).forEach((key) => {
      if (key !== 'logo' && key !== 'coverImage') {
        business[key] = req.body[key];
      }
    });

    const updatedBusiness = await business.save();

    res.status(200).json({
      success: true,
      message: req.t('businessUpdatedSuccessfully'),
      data: updatedBusiness,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

router.get('/', staffMerchantAdminAuth, async (req, res) => {
  try {
    let filters = {};

    if (req.auth.role !== 'admin') {
      filters.$or = [{ owner: req.auth.id }, { 'staff.user': req.auth.id }];
    }

    const businesses = await Business.find(filters);

    res.status(200).json({ success: true, data: businesses });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

router.get('/:id', staffMerchantAdminAuth, validateObjectId, validateRequest, async (req, res) => {
  try {
    let filters = { _id: req.params.id };

    if (req.auth.role !== 'admin') {
      filters.$or = [{ owner: req.auth.id }, { 'staff.user': req.auth.id }];
    }

    const business = await Business.findOne(filters);

    if (!business) {
      return res.status(404).json({ status: false, message: req.t('businessNotFound') });
    }

    res.status(200).json({ success: true, data: business });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

export default router;
