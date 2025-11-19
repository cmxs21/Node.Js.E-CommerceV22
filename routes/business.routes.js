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
// import {
//   merchantAndAdminAuth,
//   merchantAuth,
//   staffMerchantAdminAuth,
// } from '../middlewares/roles.middleware.js';
import { roleAuthBuilder } from '../middlewares/roles.middleware.js';
import { rangesOverlap } from '../utils/time.utils.js';
import { STAFF_ROLES } from '../constants/roles.constants.js';
import { hasBusinessAccess } from '../utils/businessAccess.utils.js';

dotenv.config();

const router = express.Router();

router.post(
  '/',
  roleAuthBuilder.owner(),
  registerBusinessValidation,
  validateRequest,
  async (req, res) => {
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
  }
);

router.put(
  '/upload-logo/:id',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
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
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
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

router.put(
  '/:id',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  validateRequest,
  async (req, res) => {
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
  }
);

router.get(
  '/',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  async (req, res) => {
    try {
      const userId = req.auth.id;

      let filters = {};

      if (!req.auth.roles?.includes(USER_ROLES.ADMIN)) {
        filters.$or = [
          // Owner del negocio
          { owner: userId },

          // Staff and active
          { 'staff.user': userId, 'staff.isActive': true },
        ];
      }

      const businesses = await Business.find(filters);

      res.status(200).json({ success: true, data: businesses });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.get(
  '/:id',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.auth.id;

      let filters = { _id: req.params.id };

      if (!req.auth.roles?.includes(USER_ROLES.ADMIN)) {
        filters.$or = [
          // Owner del negocio
          { owner: userId },

          // Staff and active
          { 'staff.user': userId, 'staff.isActive': true },
        ];
      }

      const business = await Business.findOne(filters);

      if (!business) {
        return res.status(404).json({ status: false, message: req.t('businessNotFound') });
      }

      res.status(200).json({ success: true, data: business });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.post(
  '/:id/opening-hours',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { day, ranges } = req.body;
      const currentUser = req.auth;

      const business = await Business.findById(id);
      if (!business) {
        return res.status(404).json({ success: false, message: req.t('businessNotFound') });
      }

      if (!hasBusinessAccess(business, currentUser)) {
        return res.status(403).json({ success: false, message: req.t('accessDenied') });
      }

      if (rangesOverlap(ranges)) {
        return res.status(400).json({ success: false, message: req.t('rangeOverlapNotAllowed') });
      }

      const exists = business.openingHours.find((d) => d.day === day);

      if (exists) {
        return res.status(400).json({ success: false, message: req.t('dayAlreadyExists') });
      }

      business.openingHours.push({ day, ranges });
      await business.save();

      res.status(201).json({ success: true, data: business.openingHours });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.put(
  '/:id/opening-hours/:day',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const { id, day } = req.params;
      const { ranges } = req.body;
      const currentUser = req.auth;

      const business = await Business.findById(id);
      if (!business) {
        return res.status(404).json({ success: false, message: req.t('businessNotFound') });
      }

      if (!hasBusinessAccess(business, currentUser)) {
        return res.status(403).json({ success: false, message: req.t('accessDenied') });
      }

      if (rangesOverlap(ranges)) {
        return res.status(400).json({ success: false, message: req.t('rangeOverlapNotAllowed') });
      }

      const dayObj = business.openingHours.find((d) => d.day === day);
      if (!dayObj) {
        return res.status(404).json({ success: false, message: req.t('openingHoursDayNotFound') });
      }

      dayObj.ranges = ranges; // replace existing ranges
      await business.save();

      res.status(200).json({ success: true, data: dayObj });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.delete(
  '/:id/opening-hours/:day',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const { id, day } = req.params;
      const currentUser = req.auth;

      const business = await Business.findById(id);
      if (!business) {
        return res.status(404).json({ success: false, message: req.t('businessNotFound') });
      }

      if (!hasBusinessAccess(business, currentUser)) {
        return res.status(403).json({ success: false, message: req.t('accessDenied') });
      }

      business.openingHours = business.openingHours.filter((d) => d.day !== day);
      await business.save();

      res.status(200).json({ success: true, message: req.t('openingHoursDeletedSuccessfully') });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

//Add staff to business
router.post(
  '/:id/staff',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { user } = req.body;
      const currentUser = req.auth;

      const business = await Business.findById(id);
      if (!business) {
        return res.status(404).json({ success: false, message: req.t('businessNotFound') });
      }

      if (!hasBusinessAccess(business, currentUser)) {
        return res.status(403).json({ success: false, message: req.t('accessDenied') });
      }

      const exists = business.staff.find((s) => s.user.toString() === user);
      if (exists) {
        return res.status(400).json({ success: false, message: req.t('staffAlreadyExists') });
      }

      business.staff.push({ user });
      await business.save();

      res.status(201).json({ success: true, data: business.staff });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

export default router;
