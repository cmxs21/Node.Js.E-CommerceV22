import { USER_ROLES, STAFF_ROLES, ALL_ROLES_ARRAY } from '../constants/roles.constants.js';
import errorHandler from '../middlewares/error.middleware.js';

const roleAuth = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, message: req.t('loginRequired') });
      }

      const userRoles = [
        req.auth.role,         // user/admin
        ...(req.auth.roles || []) // owner/kitchen/etc.
      ];

      const hasPermission = userRoles.some((role) => allowedRoles.includes(role));
      
      if (!hasPermission) {
        return res.status(403).json({ success: false, message: req.t('insufficientPermissions') });
      }

      next();
    } catch (error) {
      errorHandler(error, req, res);
    }
  };
};

//User roles: admin, user
//Staff roles: owner, reception, waiter, kitchen, delivery, cashier, manager, etc.

// ------------------------------------------------------------------------------------
// DYNAMIC ROLE BUILDER
// Automatically generates middleware for any combination.
// Always automatically includes ADMIN (unless admin = false)
// ------------------------------------------------------------------------------------
const roleAuthBuilder = {
  // free combination
  any(roles = [], { includeAdmin = true } = {}) {
    const allowed = [...roles];
    if (includeAdmin) allowed.push(USER_ROLES.ADMIN);
    return roleAuth(allowed);
  },

  // admin
  admin(options = {}) {
    return this.any([USER_ROLES.ADMIN], { includeAdmin: false, ...options });
  },

  // base user
  user(options = {}) {
    return this.any([USER_ROLES.USER], options);
  },

  // owner
  owner(options = {}) {
    return this.any([STAFF_ROLES.OWNER], options);
  },

  // all staff
  staff(options = {}) {
    return this.any(Object.values(STAFF_ROLES), options);
  },

  // specific staff role
  staffRole(roleName, options = {}) {
    if (!Object.values(STAFF_ROLES).includes(roleName)) {
      throw new Error(`Staff role not found: ${roleName}`);
    }
    return this.any([roleName], options);
  },

  // users + staff combination
  userAndStaff(options = {}) {
    return this.any([USER_ROLES.USER, ...Object.values(STAFF_ROLES)], options);
  },

  // two staff roles combination
  staffCombo(roleA, roleB, options = {}) {
    return this.any([roleA, roleB], options);
  },

  allRoles(options = {}) {
    return this.any([...ALL_ROLES_ARRAY], options);
  }
};

export { roleAuth, roleAuthBuilder };

/*
const adminAuth = roleAuth(['admin']);

const ownerAuth = roleAuth(['owner']);

const ownerAndAdminAuth = roleAuth(['owner', 'admin']);

const staffAuth = roleAuth(['staff']);

const staffAndAdminAuth = roleAuth(['staff', 'admin']);

const staffOwnerAdminAuth = roleAuth(['staff', 'owner', 'admin']);

const userAuth = roleAuth(['user']);

const userAndAdminAuth = roleAuth(['user', 'admin']);

export {
  adminAuth,
  ownerAuth,
  ownerAndAdminAuth,
  staffAuth,
  staffAndAdminAuth,
  staffOwnerAdminAuth,
  userAuth,
  userAndAdminAuth,
};
*/
