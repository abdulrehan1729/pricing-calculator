import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';

const saltRounds = Number(process.env.SALT_ROUND ?? 12);

if (!Number.isInteger(saltRounds) || saltRounds < 4) {
  throw new Error('SALT_ROUND must be an integer of at least 4');
}

export async function signup(email: string, password: string): Promise<string> {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Email already registered', 409, null);
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const user = await User.create({ email, password: hashedPassword });

  return generateToken(user._id.toString());
}


export async function login(email: string, password: string): Promise<string> {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('Invalid email or password', 401, null);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AppError('Invalid email or password', 401, null);
  }

  return generateToken(user._id.toString());
}


function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}
