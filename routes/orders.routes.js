import express from 'express';
import { getTimezone } from '../middlewares/getTimeZone.middleware.js';
import { validateObjectId, validateObjectIds } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import { roleAuthBuilder } from '../middlewares/roles.middleware.js';
import { createOrderValidation } from '../middlewares/order.validator.js';
import { createOrdersController } from '../controllers/order.controller.js';
import {
  getOrCreateHereOrder,
  addItemToOrder,
  payOrder,
  patchOrderStatus,
  getGlobalOrders,
  getOrderById,
} from '../controllers/order.controller.js';

const router = express.Router();

router.post('/create', createOrderValidation, getTimezone, createOrdersController);

/**
 * USER
 * Get or create active HERE order for a place
 * - deliveryMethod = here
 * - status depends on place confirmation
 */
router.post('/here', getOrCreateHereOrder);

/**
 * USER
 * Add item to an order (HERE / TOGO)
 * - Each item is independent (productStatus starts as PENDING)
 * - Multiple same products allowed
 * - Stock validated
 */
router.post('/add-item', addItemToOrder);

/**
 * USER
 * Pay order via card in app
 */
router.post('/pay/:orderId', validateObjectIds('orderId'), validateRequest, payOrder);

/**
 * OWNER / MANAGER / ADMIN
 * Mark order as paid (cash or card)
 */
router.post(
  '/pay-by-staff/:orderId',
  validateObjectIds('orderId'),
  validateRequest,
  roleAuthBuilder.staff({ includeAdmin: true }),
  payOrder
);

/**
 * OWNER / MANAGER / ADMIN
 * Update order status
 */
router.patch('/:id/status', validateObjectId, validateRequest, patchOrderStatus);

/**
 * Global orders list, all users can see their orders
 * - Admin can see all orders
 * - Buyer can see only his orders
 * - Merchant and Staff can see orders for businesses where the user is involved
 */
router.get('/', getGlobalOrders);

/**
 * Get order by id
 */
router.get('/:id', validateObjectId, validateRequest, getOrderById);

export default router;
