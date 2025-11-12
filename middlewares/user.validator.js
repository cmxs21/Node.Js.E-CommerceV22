import { body } from 'express-validator';

export const updateUserValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage((value, { req }) => req.t('validEmailValidation')),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage((value, { req }) => req.t('passwordMustBeAtLeast6Characters')),
  body('role')
    .optional()
    .isIn(['admin', 'merchant', 'staff', 'user'])
    .withMessage((value, { req }) => req.t('roleMustBeAdminOrUser')),
  body('userName')
    .optional()
    .isLength({ min: 3 })
    .withMessage((value, { req }) => req.t('userNameCannotBeEmpty')),
  body('city')
    .optional()
    .notEmpty()
    .withMessage((value, { req }) => req.t('cityCannotBeEmpty')),
  body('postalCode')
    .optional()
    .notEmpty()
    .withMessage((value, { req }) => req.t('postalCodeCannotBeEmpty')),
  body('addressLine1')
    .optional()
    .notEmpty()
    .withMessage((value, { req }) => req.t('addressLine1CannotBeEmpty')),
  body('addressLine2').optional(),
  body('phoneNumber')
    .optional()
    .notEmpty()
    .withMessage((value, { req }) => req.t('phoneNumberCannotBeEmpty'))
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage((value, { req }) => req.t('phoneNumberValidation')),
];
