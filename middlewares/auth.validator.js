import { body } from 'express-validator';

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage((value, { req }) => req.t('validEmailValidation')),
  body('password')
    .isLength({ min: 6 })
    .withMessage((value, { req }) => req.t('passwordMustBeAtLeast6Characters')),
  body('role')
    .isIn(['admin', 'merchant', 'staff', 'user'])
    .withMessage((value, { req }) => req.t('roleMustBeAdminOrUser')),
  body('userName')
    .isLength({ min: 3 })
    .withMessage((value, { req }) => req.t('userNameCannotBeEmpty')),
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
