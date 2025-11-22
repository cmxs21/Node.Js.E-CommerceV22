import express from 'express';
import { roleAuthBuilder } from '../middlewares/roles.middleware.js';
import { USER_ROLES, STAFF_ROLES } from '../constants/roles.constants.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import errorHandler from '../middlewares/error.middleware.js';
import Business from '../models/business.model.js';
import { hasBusinessAccess } from '../utils/businessAccess.utils.js';
import { cleanAndValidateRoles } from '../utils/role.utils.js';

const router = express.Router();

//Add staff to business
router.post(
  '/add-staff/:id',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectId,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.auth;
      const { user, roles } = req.body;

      const business = await Business.findById(id);
      if (!business) {
        return res.status(404).json({ success: false, message: req.t('businessNotFound') });
      }

      if (!hasBusinessAccess(business, currentUser)) {
        return res.status(403).json({ success: false, message: req.t('accessDenied') });
      }

      let cleanedRoles;
      try {
        cleanedRoles = cleanAndValidateRoles(roles);
      } catch (err) {
        return res.status(400).json({ success: false, message: req.t(err.message) });
      }

      const existingStaff = business.staff.find((s) => s.user.toString() === user);

      if (existingStaff) {
        // If exists add left roles
        const newRoles = cleanedRoles.filter((r) => !existingStaff.roles.includes(r));

        if (newRoles.length === 0) {
          return res.status(400).json({
            success: false,
            message: req.t('staffAlreadyExistsWithRoles'),
          });
        }

        existingStaff.roles.push(...newRoles);

        await business.save();

        return res.status(200).json({
          success: true,
          message: req.t('staffRolesUpdatedSuccessfully'),
          data: existingStaff,
        });
      }

      //If not exists add all
      business.staff.push({
        user,
        roles,
        isActive: true,
      });

      await business.save();

      res.status(201).json({
        success: true,
        message: req.t('staffAddedSuccessfully'),
        data: business.staff,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.delete(
  '/remove-staff',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  async (req, res) => {
    try {
      const currentUser = req.auth;
      const { businessId, userId } = req.body;

      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({ success: false, message: req.t('businessNotFound') });
      }

      if (!hasBusinessAccess(business, currentUser)) {
        return res.status(403).json({ success: false, message: req.t('accessDenied') });
      }

      const staffIndex = business.staff.findIndex((s) => s.user.toString() === userId);

      if (staffIndex === -1) {
        return res.status(404).json({
          success: false,
          message: req.t('staffUserNotFound'),
        });
      }

      // Delete from business staff array
      business.staff.splice(staffIndex, 1);

      await business.save();

      return res.status(200).json({
        success: true,
        message: req.t('staffRemovedSuccessfully'),
        data: business.staff,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

router.delete(
  '/remove-staff-role',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  async (req, res) => {
    try {
      const currentUser = req.auth;
      const { businessId, userId, roleToRemove } = req.body;

      if (!businessId || !userId || !roleToRemove) {
        return res.status(400).json({
          success: false,
          message: req.t('missingRequiredFields'),
        });
      }

      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: req.t('businessNotFound'),
        });
      }

      if (!hasBusinessAccess(business, currentUser)) {
        return res.status(403).json({
          success: false,
          message: req.t('accessDenied'),
        });
      }

      const staffEntry = business.staff.find(
        (s) => s.user.toString() === userId
      );

      if (!staffEntry) {
        return res.status(404).json({
          success: false,
          message: req.t('staffUserNotFound'),
        });
      }

      if (!staffEntry.roles.includes(roleToRemove)) {
        return res.status(404).json({
          success: false,
          message: req.t('staffRoleNotFound'),
        });
      }

      // Remove single role
      staffEntry.roles = staffEntry.roles.filter((r) => r !== roleToRemove);

      // If no more roles left, remove user
      if (staffEntry.roles.length === 0) {
        business.staff = business.staff.filter((s) => s.user.toString() !== userId);
      }

      await business.save();

      return res.status(200).json({
        success: true,
        message: req.t('staffRoleRemovedSuccessfully'),
        data: business.staff,
      });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

export default router;
