import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import validateRequest from '../middlewares/validateRequest.js';
import { sendEmail } from '../services/email.service.js';
import { registerValidation, loginValidation } from '../middlewares/auth.validator.js';
import User from '../models/user.model.js';
import { generateToken } from '../config/jwt.js';
import errorHandler from '../middlewares/error.middleware.js';
import { emailRegisterConfirmation } from '../templates/emailRegister.template.js';
import {
  emailVerifiedSuccessfully,
  emailVerificationError,
  emailVerificationUserNotFound,
  emailVerificationSuspendedAccount,
  emailVerificationEmailAlreadyVerified,
  EmailVerificationNoToken
}
  from '../templates/emailVerification.template.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.post('/register', registerValidation, validateRequest, async (req, res) => {
  try {
    const user = new User(req.body);

    const emailExists = await User.findOne({ email: user.email });

    if (emailExists) {
      return res.status(400).json({ success: false, message: req.t('emailAlreadyExists') });
    }

    await user.save();

    const token = await generateToken(user);

    // Send email confirmation
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

    const htmlContent = emailRegisterConfirmation(req, user, verificationUrl);

    await sendEmail({
      to: user.email,
      bcc: 'ctecia.reports@gmail.com',
      subject: req.t('emailVerificationSubject', { appName: req.t('appName') }),
      text: req.t('emailVerificationMessage'),
      html: htmlContent
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

//Create router login
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: req.t('invalidEmailOrPassword') });
    }

    if (user.status !== 'pending') {
      return res.status(401).json({ success: false, message: req.t('userPending') });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: req.t('userInactive') });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: req.t('invalidEmailOrPassword') });
    }

    const token = await generateToken(user);

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

// ACTIVATE USER ACCOUNT
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(EmailVerificationNoToken(req));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET);
    } catch (err) {
      return res.status(400).send(emailVerificationError(req));
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).send(emailVerificationUserNotFound(req));
    }

    if (user.status === 'suspended') {
      return res.status(403).send(emailVerificationSuspendedAccount(req));
    }

    if (user.status === 'active') {
      return res.status(200).send(emailVerificationEmailAlreadyVerified(req));
    }

    user.status = 'active';
    user.emailVerifiedAt = new Date();
    await user.save();

    return res.status(200).send(emailVerifiedSuccessfully);

  } catch (error) {
    errorHandler(error, req, res);
  }
});

export default router;
