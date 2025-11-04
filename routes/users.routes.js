//Create administration users routes for get and update
import express from 'express';
import User from '../models/user.model.js';
import validateRequest from '../middlewares/validateRequest.js';
import { updateUserValidation } from '../middlewares/user.validator.js';
import errorHandler from '../middlewares/error.middleware.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).select('-password'); //Select all fields except password

    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: req.t('userNotFound') });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

router.put(
  '/profile',
  updateUserValidation,
  validateRequest,
  async (req, res) => {
    try {
      const user = await User.findById(req.auth.id);

      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: req.t('userNotFound') });
      }

      if (req.body.email) {
        const emailExists = await User.findOne({
          email: req.body.email,
          _id: { $ne: user._id },
        });
        if (emailExists) {
          return res
            .status(400)
            .json({ success: false, message: req.t('emailAlreadyExists') });
        }
      }

      Object.keys(req.body).forEach((key) => {
        user[key] = req.body[key];
      });

      await user.save();

      res
        .status(200)
        .json({ success: true, message: req.t('userUpdatedSuccessfully') });
    } catch (error) {
      errorHandler(error, req, res);
    }
  }
);

export default router;
