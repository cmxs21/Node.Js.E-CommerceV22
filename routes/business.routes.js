import express from 'express';
import { roleAuthBuilder } from '../middlewares/roles.middleware.js';
import { USER_ROLES, STAFF_ROLES } from '../constants/roles.constants.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import { sendEmail } from '../services/email.service.js';
import errorHandler from '../middlewares/error.middleware.js';
import Business from '../models/business.model.js';
import { registerBusinessValidation } from '../middlewares/business.validator.js';
import { rangesOverlap } from '../utils/time.utils.js';
import { hasBusinessAccess } from '../utils/businessAccess.utils.js';
import fs from 'fs';
import path from 'path';
import {
  uploadSingleImage,
  getFileURL,
  handleUploadError,
} from '../middlewares/upload.middleware.js';

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

      await sendEmail({
        to: currentUser.email,
        bcc: 'ctecia.reports@gmail.com',
        subject: req.t('businessRegisteredSuccessfullySubject', { appName: req.t('appName') }),
        text: req.t('businessRegisteredSuccessfullyText', {
          appName: req.t('appName'),
          businessName: req.body.name,
        }),
        html: `
          <p><strong>${req.t('businessRegisteredSuccessfullyTitle', {
            appName: req.t('appName'),
          })}</strong></p>
          <p>${req.t(
            'businessRegisteredSuccessfullyBody',
            { appName: req.t('appName') },
            { businessName: req.body.name }
          )}</p>
          <p><strong>${req.t('userName')}:</strong> ${currentUser.userName}</p>
          <p><strong>${req.t('businessName')}:</strong> ${req.body.name}</p>
          <p><strong>${req.t('email')}:</strong> ${req.body.email}</p>
          <p><strong>${req.t('phoneNumber')}:</strong> ${req.body.phoneNumber}</p>
        `,
      });

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
  validateRequest,
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
  validateRequest,
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
      console.log(STAFF_ROLES.OWNER + ' ' + STAFF_ROLES.MANAGER + ' ' + USER_ROLES.ADMIN);

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

export default router;
