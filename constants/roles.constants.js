export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',  
};

export const STAFF_ROLES = {
  OWNER: 'owner',          
  RECEPTION: 'reception',
  WAITER: 'waiter',
  KITCHEN: 'kitchen',
  DELIVERY: 'delivery',
  CASHIER: 'cashier',
  MANAGER: 'manager',
};

export const ALL_ROLES = {
  ...USER_ROLES,
  ...STAFF_ROLES,
};

export const ALL_ROLES_ARRAY = Object.values(ALL_ROLES);
