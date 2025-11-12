const roleAuth = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, message: req.t('loginRequired') });
      }

      if (!allowedRoles.includes(req.auth.role)) {
        return res.status(403).json({ success: false, message: req.t('insufficientPermissions') });
      }

      next();
    } catch (error) {
      errorHandler(error, req, res);
    }
  };
};

const adminAuth = roleAuth(['admin']);

const merchantAuth = roleAuth(['merchant']);

const merchantAndAdminAuth = roleAuth(['merchant', 'admin']);

const staffAuth = roleAuth(['staff']);

const staffAndAdminAuth = roleAuth(['staff', 'admin']);

const staffMerchantAdminAuth = roleAuth(['staff', 'merchant', 'admin']);

const userAuth = roleAuth(['user']);

const userAndAdminAuth = roleAuth(['user', 'admin']);

export {
  adminAuth,
  merchantAuth,
  merchantAndAdminAuth,
  staffAuth,
  staffAndAdminAuth,
  staffMerchantAdminAuth,
  userAuth,
  userAndAdminAuth,
};
