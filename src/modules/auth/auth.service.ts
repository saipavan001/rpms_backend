import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const loginUser = async (
  username: string,
  password: string
) => {

  // Find user
  const user = await prisma.user.findUnique({
    where: {
      username
    }
  });

  if (!user) {
    throw new Error('Invalid username or password');
  }

  // Compare password
  const isPasswordValid = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new Error('Invalid username or password');
  }

  // Generate JWT
  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '1d'
    }
  );

  return {
    token
  };
};