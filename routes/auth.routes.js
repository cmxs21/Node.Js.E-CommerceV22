import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  registerValidation,
  loginValidation,
} from '../middlewares/auth.validator.js';
import { generateToken } from '../config/jwt.js';
import errorHandler from '../middlewares/error.middleware.js';

const router = express.Router();

router.post(
  '/register',
  registerValidation,
  validateRequest,
  async (req, res) => {
    try {
      const user = new User(req.body);

      const emailExists = await User.findOne({ email: user.email });
      if (emailExists) {
        return res
          .status(400)
          .json({ success: false, message: req.t('emailAlreadyExists') });
      }

      await user.save();

      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        message: req.t('userRegisteredSuccessfully'),
        data: {
          user: user.toJSON(),
          token: token,
        },
      });
    } catch (error) {
      errorHandler(error, req, res);
      //   console.error('Registration error:', error);
      //   return res.status(400).send({ message: error.message });
    }
  }
);

//Create router post login
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: req.t('invalidEmailOrPassword') });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: req.t('invalidEmailOrPassword') });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: req.t('loginSuccessful'),
      data: {
        user: user.toJSON(),
        token: token,
      },
    });
  } catch (error) {
    errorHandler(error, req, res);
    // console.error('Login error:', error);
    // return res.status(400).send({ message: error.message });
  }
});

export default router;
