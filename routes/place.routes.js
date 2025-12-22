import express from 'express';
import { roleAuthBuilder } from '../middlewares/roles.middleware.js';
import { validateObjectIds } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import { STAFF_ROLES } from '../constants/roles.constants.js';
import {
  createPlace,
  getPlacesByBusiness,
  selectPlace,
  confirmPlace,
  releasePlace,
} from '../controllers/place.controller.js';

const router = express.Router();

/**
 * OWNER / MANAGER
 * Create a new place for a business
 */
router.post(
  '/business/:businessId',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectIds('businessId'),
  validateRequest,
  createPlace
);

/**
 * PUBLIC / AUTHENTICATED USER
 * Get all places for a business
 */
router.get(
  '/business/:businessId',
  validateObjectIds('businessId'),
  validateRequest,
  getPlacesByBusiness
);

/**
 * AUTHENTICATED USER
 * Select a place (status becomes PENDING)
 */
router.post('/:placeId/select', validateObjectIds('placeId'), validateRequest, selectPlace);

/**
 * STAFF ONLY
 * Confirm a place (physical validation)
 */
router.post(
  '/:placeId/confirm',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectIds('placeId'),
  validateRequest,
  confirmPlace
);

/**
 * STAFF / OWNER
 * Release a place after payment completion
 */
router.post(
  '/:placeId/release',
  roleAuthBuilder.any([STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER], { includeAdmin: true }),
  validateObjectIds('placeId'),
  validateRequest,
  releasePlace
);

export default router;
