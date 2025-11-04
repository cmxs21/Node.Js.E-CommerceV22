//Generic Id validation
import { param } from 'express-validator';

export const validateObjectId = [
  param('id')
    .custom((value) => {
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage('Invalid ID format'),
];