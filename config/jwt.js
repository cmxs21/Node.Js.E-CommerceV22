import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const generateToken = async (user) => {
  const roles = [user.role];

  const ownedBusinesses = await Business.find({
    isActive: true,
    owner: user._id
  }).select('_id');

  if (ownedBusinesses.length > 0) {
    roles.push('owner');
  }

  const staffBusinesses = await Business.find({
    isActive: true,
    'staff.user': user._id,
    'staff.isActive': true
  }).select('_id');

  staffBusinesses.forEach((biz) => {
    const staffEntry = biz.staff.find((s) => s.user.toString() === user._id.toString() && s.isActive === true);

    if (staffEntry && staffEntry.roles?.length > 0) {
      roles.push(...staffEntry.roles);
    }
  });

  const uniqueRoles = [...new Set(roles)];
  
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      userName: user.userName,
      phoneNumber: user.phoneNumber,
      roles: uniqueRoles
    },
    process.env.SECRET,
    {
      expiresIn: '15d',
    }
  );
};
