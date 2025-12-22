import errorHandler from '../middlewares/error.middleware.js';
import Place from '../models/place.model.js';
import Order from '../models/order.model.js';
import Business from '../models/business.model.js';
import { hasBusinessAccess } from '../utils/businessAccess.utils.js';

/**
 * OWNER / MANAGER
 * Create place for business
 */
export const createPlace = async (req, res) => {
  try {
    const currentUser = req.auth;
    const { businessId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: req.t('placeNameRequired') });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: req.t('businessNotFound') });
    }

    if (!hasBusinessAccess(business, currentUser)) {
      return res.status(403).json({ success: false, message: req.t('accessDenied') });
    }

    const place = await Place.create({
      business: businessId,
      name,
    });

    res.status(201).json(place);
  } catch (error) {
    errorHandler(error, req, res);
  }
};

/**
 * Get places by business
 */
export const getPlacesByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;

    const places = await Place.find({ business: businessId }).sort({
      name: 1,
    });

    res.json(places);
  } catch (error) {
    errorHandler(error, req, res);
  }
};

/**
 * USER
 * Select place (status pending)
 */
export const selectPlace = async (req, res) => {
  try {
    const { placeId } = req.params;
    const userId = req.user.id;

    const place = await Place.findById(placeId);
    if (!place) {
      return res.status(404).json({ message: req.t('placeNotFound') });
    }

    // Not allowed if place is confirmed
    // if (place.status === 'confirmed') {
    //   return res.status(400).json({ message: req.t('placeAlreadyConfirmed') });
    // }

    // Add if not exists
    if (!place.currentUsers.includes(userId)) {
      place.currentUsers.push(userId);
    }

    place.status = 'pending';
    await place.save();

    res.json({
      message: req.t('placePending'),
      place,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
};

/**
 * STAFF
 * Confirm place
 */
export const confirmPlace = async (req, res) => {
  try {
    const currentUser = req.auth;
    const { placeId } = req.params;
    const staffId = req.user.id;

    const place = await Place.findById(placeId).populate('business');
    if (!place) {
      return res.status(404).json({ message: req.t('placeNotFound') });
    }

    const business = await Business.findById(place.business.id);
    if (!business) {
      return res.status(404).json({ message: req.t('businessNotFound') });
    }

    if (!hasBusinessAccess(business, currentUser)) {
      return res.status(403).json({ success: false, message: req.t('accessDenied') });
    }

    place.status = 'confirmed';
    place.confirmedBy = staffId;
    place.confirmedAt = new Date();

    await place.save();

    /**
     * ALL pending orders for this place
     * change status to process
     */
    await Order.updateMany(
      {
        place: place._id,
        status: 'pending',
        deliveryMethod: 'here',
      },
      {
        $set: {
          status: 'process',
          placeStatusSnapshot: 'confirmed',
        },
      }
    );

    res.json({
      message: req.t('placeSuccessfullyConfirmed'),
      place,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
};

/**
 * STAFF / OWNER
 * Release place (when all users paid)
 */
export const releasePlace = async (req, res) => {
  try {
    const currentUser = req.auth;
    const { placeId } = req.params;

    const place = await Place.findById(placeId);
    if (!place) {
      return res.status(404).json({ message: req.t('placeNotFound') });
    }

    const business = await Business.findById(place.business.id);
    if (!business) {
      return res.status(404).json({ message: req.t('businessNotFound') });
    }

    if (!hasBusinessAccess(business, currentUser)) {
      return res.status(403).json({ success: false, message: req.t('accessDenied') });
    }

    place.status = 'available';
    place.currentUsers = [];
    place.confirmedBy = null;
    place.confirmedAt = null;

    await place.save();

    res.json({
      message: req.t('placeReleased'),
      place,
    });
  } catch (error) {
    errorHandler(error, req, res);
  }
};
