import { body } from 'express-validator';

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage((value, { req }) => req.t('validEmailValidation')),
  body('password')
    .isLength({ min: 6 })
    .withMessage((value, { req }) => req.t('passwordMustBeAtLeast6Characters')),
  body('role')
    .isIn(['admin', 'user'])
    .withMessage((value, { req }) => req.t('roleMustBeAdminOrUser')),
  body('userName')
    .isLength({ min: 3 })
    .withMessage((value, { req }) => req.t('userNameCannotBeEmpty')),
  body('city')
    .notEmpty()
    .withMessage((value, { req }) => req.t('cityCannotBeEmpty')),
  body('postalCode')
    .notEmpty()
    .withMessage((value, { req }) => req.t('postalCodeCannotBeEmpty')),
  body('addressLine1')
    .notEmpty()
    .withMessage((value, { req }) => req.t('addressLine1CannotBeEmpty')),
  body('addressLine2').optional(),
  body('phoneNumber')
    .notEmpty()
    .withMessage((value, { req }) => req.t('phoneNumberCannotBeEmpty'))
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage((value, { req }) => req.t('phoneNumberValidation')),
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage((value, { req }) => req.t('validEmailValidation')),
  body('password')
    .notEmpty()
    .withMessage((value, { req }) => req.t('passwordRequired')),
];
