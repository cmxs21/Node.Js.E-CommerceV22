import Counter from '../models/counter.model.js';
import mongoose from 'mongoose';

export async function getNextOrderNumberForBusiness(businessId, session) {
  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    throw new Error('Invalid business id for counter');
  }

  const updated = await Counter.findOneAndUpdate(
    { business: businessId },
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true, session }
  ).exec();

  return updated.sequenceValue;
}

/**
 * Generates an order number in the format B-XXXX-000123
 */
export function formatOrderNumber(businessId, seq) {
  const shortId = businessId.toString().slice(-4).toUpperCase();
  return `B-${shortId}-${String(seq).padStart(6, '0')}`;
}
