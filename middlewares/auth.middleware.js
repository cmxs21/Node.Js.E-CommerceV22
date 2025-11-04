import jwt from 'jsonwebtoken';
import errorHandler from './error.middleware.js';
import dotenv from 'dotenv';
dotenv.config();

const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export const authMiddleware = (req, res, next) => {
  try {
    const cleanPath = req.path.replace(/^\/api\/v\d+\//, '/');

    if (publicRoutes.includes(cleanPath)) {
      return next();
    }

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res
        .status(401)
        .json({ status: false, message: req.t('loginRequired') });
    }

    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = decoded;
    req.auth = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      userName: decoded.userName,
      phoneNumber: decoded.phoneNumber,
    };

    next();
  } catch (error) {
    errorHandler(error, req, res);
    //return res.status(401).json({ message: 'Unauthorized' });
  }
};
