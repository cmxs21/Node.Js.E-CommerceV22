import { body } from 'express-validator';

export const createProductValidation = [
  body('title')
    .notEmpty()
    .withMessage((value, { req }) => req.t('productTitleCannotBeEmpty'))
    .isLength({ min: 3, max: 100 })
    .withMessage((value, { req }) => req.t('productTitleMinLength'))
    .trim(),
  body('category')
    .notEmpty()
    .withMessage((value, { req }) => req.t('productCategoryCannotBeEmpty'))
    .isMongoId()
    .withMessage((value, { req }) => req.t('mongoIdValidation')),
  body('price')
    .notEmpty()
    .withMessage((value, { req }) => req.t('productPriceMinimum'))
    .isFloat({ min: 0 })
    .withMessage((value, { req }) => req.t('productPriceMinimum')),
  body('description')
    .notEmpty()
    .withMessage((value, { req }) => req.t('descriptionCannotBeEmpty'))
    .isLength({ min: 5, max: 1000 })
    .withMessage((value, { req }) => req.t('descriptionCannotBeEmpty'))
    .trim(),
  body('countInStock')
    .notEmpty()
    .withMessage((value, { req }) => req.t('countInStockCannotBeEmpty'))
    .isInt({ min: 0, max: 99999 })
    .withMessage((value, { req }) => req.t('countInStockCannotBeEmpty')),
  body('rating.count')
    .optional()
    .isInt({ min: 0 })
    .withMessage((value, { req }) => req.t('productRatingCountMinimum')),
];

export const updateProductValidation = [
  body('title')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage((value, { req }) => req.t('productTitleMinLength'))
    .trim(),
  body('category')
    .optional()
    .isMongoId()
    .withMessage((value, { req }) => req.t('mongoIdValidation')),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage((value, { req }) => req.t('productPriceMinimum')),
  body('description')
    .optional()
    .isLength({ min: 5, max: 1000 })
    .withMessage((value, { req }) => req.t('descriptionCannotBeEmpty'))
    .trim(),
  body('countInStock')
    .optional()
    .isInt({ min: 0, max: 99999 })
    .withMessage((value, { req }) => req.t('countInStockCannotBeEmpty')),
];
