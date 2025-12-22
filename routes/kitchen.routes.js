import express from 'express';
import validateRequest from '../middlewares/validateRequest.js';
import { validateObjectIds } from '../middlewares/validateObjectId.js';
import { roleAuthBuilder } from '../middlewares/roles.middleware.js';
import { STAFF_ROLES } from '../constants/roles.constants.js';

import { listKitchenItems, updateProductStatus } from '../controllers/kitchen.controller.js';

const router = express.Router();

/**
 * STAFF / KITCHEN
 * List order items by status
 * ?status=pending|process|ready
 */
router.get(
  '/business/items/:businessId',
  roleAuthBuilder.staff({ includeAdmin: true }),
  validateObjectIds('businessId'),
  validateRequest,
  listKitchenItems
);

/**
 * STAFF / KITCHEN
 * Update product status
 */
router.patch(
  '/order-item/status/:orderItemId',
  roleAuthBuilder.staff({ includeAdmin: true }),
  validateObjectIds('orderItemId'),
  validateRequest,
  updateProductStatus
);

export default router;
