import Order from '../models/order.model.js';
import Place from '../models/place.model.js';

/**
 * Check if all HERE orders for a place are paid.
 * If so, release the place.
 */
export const releasePlaceIfAllOrdersPaid = async (placeId) => {
  if (!placeId) return;

  // Check if there is any unpaid HERE order for this place
  const unpaidOrder = await Order.findOne({
    place: placeId,
    deliveryMethod: 'here',
    status: { $ne: 'paid' },
  }).select('_id');

  // If any unpaid order exists, do nothing
  if (unpaidOrder) {
    return;
  }

  // Otherwise, release the place
  await Place.findByIdAndUpdate(placeId, {
    $set: {
      status: 'available',
      confirmedBy: null,
      confirmedAt: null,
      currentUsers: [],
    },
  });
};
