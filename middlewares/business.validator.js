import { body } from "express-validator";

export const registerBusinessValidation = [
    body('name')
        .notEmpty()
        .withMessage((value, { req }) => req.t('nameCannotBeEmpty'))
        .isLength({ min: 3, max: 100 })
        .withMessage((value, { req }) => req.t('businessNameMinLength'))
        .trim(),
    body('description')
        .optional()
        .isLength({ min: 5, max: 1000 })
        .withMessage((value, { req }) => req.t('descriptionCannotBeEmpty'))
        .trim(),
    body('businessType')
        .notEmpty()
        .withMessage((value, { req }) => req.t('typeCannotBeEmpty'))
        .isLength({ min: 3 })
        .withMessage((value, { req }) => req.t('typeMinLength')),
    body('address.address')
        .notEmpty()
        .withMessage((value, { req }) => req.t('addressCannotBeEmpty'))
        .trim(),
    body('address.city')
        .notEmpty()
        .withMessage((value, { req }) => req.t('cityCannotBeEmpty'))
        .trim(),
    body('address.state')
        .notEmpty()
        .withMessage((value, { req }) => req.t('stateCannotBeEmpty'))
        .trim(),
    body('address.country')
        .notEmpty()
        .withMessage((value, { req }) => req.t('countryCannotBeEmpty'))
        .trim(),
    body('address.postalCode')
        .notEmpty()
        .withMessage((value, { req }) => req.t('postalCodeCannotBeEmpty'))
        .trim(),
    body('address2').optional().trim(),
    body('email')
        .notEmpty()
        .withMessage((value, { req }) => req.t('emailCannotBeEmpty'))
        .isEmail()
        .withMessage((value, { req }) => req.t('validEmailValidation'))
        .trim(),
    body('phoneNumber')
        .notEmpty()
        .withMessage((value, { req }) => req.t('phoneNumberCannotBeEmpty'))
        .matches(/^\+?[0-9]{10,15}$/)
        .withMessage((value, { req }) => req.t('phoneNumberValidation')),
];

export const updateBusinessValidation = [
    body('name')
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage((value, { req }) => req.t('businessNameMinLength'))
        .trim(),
    body('description')
        .optional()
        .isLength({ min: 5, max: 1000 })
        .withMessage((value, { req }) => req.t('descriptionCannotBeEmpty'))
        .trim(),
    body('businessType')
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage((value, { req }) => req.t('businessNameMinLength'))
        .trim(),
    body('address.address')
        .optional()
        .notEmpty()
        .withMessage((value, { req }) => req.t('cityCannotBeEmpty')),
    body('address.city')
        .optional()
        .notEmpty()
        .withMessage((value, { req }) => req.t('cityCannotBeEmpty'))
        .trim(),
    body('address.state')
        .optional()
        .notEmpty()
        .withMessage((value, { req }) => req.t('stateCannotBeEmpty'))
        .trim(),
    body('address.country')
        .optional()
        .notEmpty()
        .withMessage((value, { req }) => req.t('countryCannotBeEmpty'))
        .trim(),
    body('address.postalCode')
        .optional()
        .notEmpty()
        .withMessage((value, { req }) => req.t('postalCodeCannotBeEmpty'))
        .trim(),
    body('address2').optional().trim(),
    body('email')
        .optional()
        .isEmail()
        .withMessage((value, { req }) => req.t('validEmailValidation'))
        .trim(),
    body('phoneNumber')
        .optional()
        .notEmpty()
        .withMessage((value, { req }) => req.t('phoneNumberCannotBeEmpty'))
        .matches(/^\+?[0-9]{10,15}$/)
        .withMessage((value, { req }) => req.t('phoneNumberValidation')),
];

