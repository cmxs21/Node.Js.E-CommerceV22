import { USER_ROLES, STAFF_ROLES } from '../constants/roles.constants.js';

export function checkBusinessAccess(business, user) {
  const isAdmin = user.role === USER_ROLES.ADMIN;
  const isOwner = business.owner?.toString() === user.id;
  const isManager = business.staff.some(
    (member) =>
      member.user.toString() === user.id &&
      member.roles === STAFF_ROLES.MANAGER &&
      member.isActive === true
  );

  return { isAdmin, isOwner, isManager, allowed: isAdmin || isOwner || isManager };
}

export function hasBusinessAccess(business, user) {
  return checkBusinessAccess(business, user).allowed;
}
