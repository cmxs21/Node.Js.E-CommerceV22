import { body } from 'express-validator';

export const createOrderValidation = [
  body('business')
    .notEmpty()
    .withMessage((value, { req }) => req.t('businessIdRequired'))
    .isMongoId()
    .withMessage((value, { req }) => req.t('mongoIdValidation')),

  body('user')
    .notEmpty()
    .withMessage((value, { req }) => req.t('userIdRequired'))
    .isMongoId()
    .withMessage((value, { req }) => req.t('mongoIdValidation')),

  body('name')
    .notEmpty()
    .withMessage((value, { req }) => req.t('nameCannotBeEmpty'))
    .isLength({ min: 2, max: 100 })
    .withMessage((value, { req }) => req.t('nameLengthError'))
    .trim(),

  body('email')
    .notEmpty()
    .withMessage((value, { req }) => req.t('emailCannotBeEmpty'))
    .isEmail()
    .withMessage((value, { req }) => req.t('validEmailValidation'))
    .trim(),

  body('phoneNumber')
    .notEmpty()
    .withMessage((value, { req }) => req.t('phoneNumberCannotBeEmpty'))
    .isLength({ min: 8, max: 20 })
    .withMessage((value, { req }) => req.t('phoneNumberValidation'))
    .trim(),

  body('timezone')
    .notEmpty()
    .withMessage((value, { req }) => req.t('timezoneCannotBeEmpty'))
    .trim(),

  // Optional general notes
  body('orderNotes')
    .optional()
    .isLength({ max: 250 })
    .withMessage((value, { req }) => req.t('orderNotesMaxLength')),

  // DELIVERY METHOD
  body('deliveryMethod')
    .notEmpty()
    .withMessage((value, { req }) => req.t('deliveryMethodRequired'))
    .isIn(['delivery', 'pickup'])
    .withMessage((value, { req }) => req.t('deliveryMethodInvalid')),

  // PAYMENT INFO
  body('paymentInfo.method')
    .notEmpty()
    .withMessage((value, { req }) => req.t('paymentMethodRequired'))
    .isIn(['card', 'cash_on_delivery', 'pickup_payment'])
    .withMessage((value, { req }) => req.t('paymentMethodInvalid')),

  body('paymentInfo.status')
    .optional()
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage((value, { req }) => req.t('paymentStatusInvalid')),

  // SHIPPING INFO (optional)
  body('shippingInfo.address').optional().isString().trim(),
  body('shippingInfo.city').optional().isString().trim(),
  body('shippingInfo.postalCode').optional().isString().trim(),
  body('shippingInfo.country').optional().isString().trim(),

  // ORDER ITEMS ------------------------------------
  body('orderItems')
    .isArray({ min: 1 })
    .withMessage((value, { req }) => req.t('orderItemValidation')),

  body('orderItems.*.product')
    .notEmpty()
    .withMessage((value, { req }) => req.t('orderItemValidation'))
    .isMongoId()
    .withMessage((value, { req }) => req.t('mongoIdValidation')),

  body('orderItems.*.title')
    .notEmpty()
    .withMessage((value, { req }) => req.t('productTitleCannotBeEmpty')),

  body('orderItems.*.quantity')
    .notEmpty()
    .withMessage((value, { req }) => req.t('quantityMustBeAtLeast1'))
    .isInt({ min: 1, max: 999 })
    .withMessage((value, { req }) => req.t('quantityMustBeAtLeast1')),

  body('orderItems.*.price')
    .notEmpty()
    .withMessage((value, { req }) => req.t('priceRequired'))
    .isFloat({ min: 0 })
    .withMessage((value, { req }) => req.t('priceInvalid')),

  body('orderItems.*.notes')
    .optional()
    .isLength({ max: 100 })
    .withMessage((value, { req }) => req.t('itemNotesMaxLength')),
];
