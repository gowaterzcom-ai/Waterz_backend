import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Generate JWT Token
export const generateToken = (userId: string, role: string): string => {
  const payload = { id: userId, role };
  const secret = process.env.JWT_SECRET as string;

  return jwt.sign(payload, secret);
};

// Verify JWT Token
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const secret = process.env.JWT_SECRET as string;
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    return null;
  }
};

// Hash Password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

// Compare Password
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};