import express from 'express';
import User from '../models/user.model.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import validateRequest from '../middlewares/validateRequest.js';
import { updateUserValidation } from '../middlewares/user.validator.js';
import errorHandler from '../middlewares/error.middleware.js';

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

//Add user addresses route
router.post('/addresses', async (req, res) => {
  try {
    const user = await User.findById(req.auth.id);

    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: req.t('userNotFound') });
    }

    user.addresses.push(req.body);

    await user.save();

    res.status(200).json({ success: true, message: req.t('addressAddedSuccessfully') });

  } catch (error) {
    errorHandler(error, req, res);
  }
});

//Edit user addresses route
router.put('/addresses/:id', validateObjectId, validateRequest, async (req, res) => {
  try {
    const user = await User.findById(req.auth.id);

    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: req.t('userNotFound') });
    }

    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res
        .status(404)
        .json({ status: false, message: req.t('addressNotFound') });
    }

    Object.keys(req.body).forEach((key) => {
      address[key] = req.body[key];
    });

    await user.save();

    res.status(200).json({ success: true, message: req.t('addressUpdatedSuccessfully') });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

//Delete user addresses route
router.delete('/addresses/:id', validateObjectId, validateRequest, async (req, res) => {
  try {
    const user = await User.findById(req.auth.id);

    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: req.t('userNotFound') });
    }

    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res
        .status(404)
        .json({ status: false, message: req.t('addressNotFound') });
    }

    user.addresses.pull(address);

    await user.save();

    res.status(200).json({ success: true, message: req.t('addressDeletedSuccessfully') });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

//Set default address route
router.put('/addresses/default/:id', validateObjectId, validateRequest, async (req, res) => {
  try {
    const user = await User.findById(req.auth.id);

    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: req.t('userNotFound') });
    }

    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res
        .status(404)
        .json({ status: false, message: req.t('addressNotFound') });
    }

    user.addresses.forEach((a) => {
      a.isDefault = false;
    });

    address.isDefault = true;

    await user.save();

    res.status(200).json({ success: true, message: req.t('addressUpdatedSuccessfully') });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

//Get user addresses route
router.get('/addresses', async (req, res) => {
  try {
    const user = await User.findById(req.auth.id);

    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: req.t('userNotFound') });
    }

    res.status(200).json({ success: true, data: user.addresses });
  } catch (error) {
    errorHandler(error, req, res);
  }
});

export default router;
