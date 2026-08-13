import { Router, Request, Response } from 'express';
import { signup, login } from '../services/authService';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema, signupSchema } from '../validation/authSchema';

const router = Router();

router.post('/signup', validate(signupSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const token = await signup(email, password);
  res.status(201).json({ token });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const token = await login(email, password);
  res.json({ token });
}));

export default router;
