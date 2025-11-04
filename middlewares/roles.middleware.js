const roleAuth = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.auth) {
        return res
          .status(401)
          .json({ success: false, message: req.t('loginRequired') });
      }

      if (!allowedRoles.includes(req.auth.role)) {
        return res
          .status(403)
          .json({ success: false, message: req.t('insufficientPermissions') });
      }

      next();
    } catch (error) {
      errorHandler(error, req, res);
    }
  };
};

const adminAuth = roleAuth(['admin']);

const userAuth = roleAuth(['user']);

const userAndAdminAuth = roleAuth(['user', 'admin']);

export { adminAuth, userAuth, userAndAdminAuth };
