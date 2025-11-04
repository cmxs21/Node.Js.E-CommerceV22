import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      userName: user.userName,
      phoneNumber: user.phoneNumber,
    },
    process.env.SECRET,
    {
      expiresIn: '15d',
    }
  );
};
