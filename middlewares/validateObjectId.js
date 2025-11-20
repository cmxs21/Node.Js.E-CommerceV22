import { param } from 'express-validator';

export const validateObjectId = [
  param('id')
    .custom((value) => {
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage('Invalid ID format'),
];

export const validateObjectIds = (...paramNames) => {
  return paramNames.map((name) =>
    param(name)
      .custom((value) => {
        if (!value) return true; //If empty, return true, if not evaluate format on next line
        return /^[0-9a-fA-F]{24}$/.test(value);
      })
      .withMessage(`${name} has invalid ID format`)
  );
};
