import { STAFF_ROLES } from '../constants/roles.constants.js';

export const cleanAndValidateRoles = (roles) => {
  if (!Array.isArray(roles)) {
    throw new Error('rolesMustBeArray');
  }

  // Remove empty
  const cleanedRoles = roles.map((r) => String(r).trim()).filter((r) => r.length > 0);

  if (cleanedRoles.length === 0) {
    throw new Error('rolesCannotBeEmpty');
  }

  // Validate allowed roles
  const invalidRoles = cleanedRoles.filter((role) => !Object.values(STAFF_ROLES).includes(role));

  if (invalidRoles.length > 0) {
    throw new Error(`invalidRoles: ${invalidRoles.join(', ')}`);
  }

  return cleanedRoles;
};
