export const getTimezone = (req, res, next) => {
  req.userTimezone = 'America/Mexico_City'; //req.headers['x-user-timezone'] || 'UTC';
  next();
};
