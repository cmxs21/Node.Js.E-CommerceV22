import { body } from 'express-validator';

export const assignOrderValidation = [
  body('orderId').isMongoId().withMessage((value, { req }) => req.t('mongoIdValidation')),
  body('deliveryManId').isMongoId().withMessage((value, { req }) => req.t('mongoIdValidation')),
];
