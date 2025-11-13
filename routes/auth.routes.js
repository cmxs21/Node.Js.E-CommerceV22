import express from 'express';
import bcrypt from 'bcrypt';
import validateRequest from '../middlewares/validateRequest.js';
import { sendEmail } from '../services/email.service.js';
import { registerValidation, loginValidation } from '../middlewares/auth.validator.js';
import User from '../models/user.model.js';
import { generateToken } from '../config/jwt.js';
import errorHandler from '../middlewares/error.middleware.js';

const router = express.Router();

router.post('/register', registerValidation, validateRequest, async (req, res) => {
  try {
    const user = new User(req.body);

    const emailExists = await User.findOne({ email: user.email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: req.t('emailAlreadyExists') });
    }

    await user.save();

    const token = generateToken(user);

    await sendEmail({
      to: 'ctecia.reports@gmail.com', //order.user.email,
      subject: 'New user registered - Tengo Hambre App',
      text: 'New user registered - Tengo Hambre App',
      html:
        '<p>New user registered - Tengo Hambre App</p> <p>Username: ' +
        user.userName +
        '</p> <p>Role: ' +
        user.role +
        '</p> <p>Email: ' +
        user.email +
        '</p> <p>Phone number: ' +
        user.phoneNumber +
        '</p> <p>Location: ' +
        user.city +
        ' ' +
        user.postalCode,
    });

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
  }
});

//Create router post login
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: req.t('invalidEmailOrPassword') });
    }

    if (user.status !== 'active') {
      return res
        .status(401)
        .json({ success: false, message: req.t('userInactive'), status: user.status });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: req.t('invalidEmailOrPassword') });
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
  }
});

export default router;
