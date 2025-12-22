export const WEEKDAYS = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
};

export const STAFF_ROLES = {
  RECEPTION: 'reception',
  WAITER: 'waiter',
  KITCHEN: 'kitchen',
  DELIVERY: 'delivery',
  CASHIER: 'cashier',
  MANAGER: 'manager',
};

export const BUSINESS_TYPE = {
  RESTAURANT: 'restaurant',
  TECH: 'tech',
  FASHION: 'fashion',
  ACCESSORIES: 'accessories',
  GROCERY: 'grocery',
  PETS: 'pets',
  HEALTH: 'health',
  OTHERS: 'others',
};

export const PRODUCT_TYPE = {
  PRODUCT: 'product',
  COMBO: 'combo',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESS: 'process',
  READY: 'ready',
  ASSIGNEDTOSHIPP: 'assignedToShip',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CONSUMED: 'consumed',
  CANCELLED: 'cancelled',
};

export const ORDER_ITEM_STATUS = {
  PENDING: 'pending',
  PROCESS: 'process',
  READY: 'ready',
  CANCELLED: 'cancelled',
};

export const ORDER_PLACE_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
};

export const ORDER_ITEM_STATUS_VALID_TRANSITIONS = {
  [ORDER_ITEM_STATUS.PENDING]: [ORDER_ITEM_STATUS.PROCESS, ORDER_ITEM_STATUS.CANCELLED],
  [ORDER_ITEM_STATUS.PROCESS]: [ORDER_ITEM_STATUS.READY],
  [ORDER_ITEM_STATUS.READY]: [],
  [ORDER_ITEM_STATUS.CANCELLED]: [],
};

export const ORDER_STATUS_VALID_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESS, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESS]: [ORDER_STATUS.READY],
  [ORDER_STATUS.READY]: [
    ORDER_STATUS.ASSIGNEDTOSHIPP,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
  ],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [], // Last status
  [ORDER_STATUS.CANCELLED]: [], // Last status
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const DELIVERY_METHODS = {
  HERE: 'here',
  TOGO: 'togo',
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
};

export const PAYMENT_METHODS = {
  CARD: 'card',
  CASH: 'cash',
  CARD_ON_DELIVERY: 'card_on_delivery',
  CASH_ON_DELIVERY: 'cash_on_delivery',
  PICKUP_PAYMENT: 'pickup_payment',
};
