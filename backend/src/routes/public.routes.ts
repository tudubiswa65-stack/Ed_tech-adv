import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getPublicLeaderboard } from '../controllers/public/leaderboard.controller';

const router = Router();

// Tighter rate limit for the public endpoint — no auth barrier protects it
const publicLeaderboardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

router.get('/leaderboard', publicLeaderboardLimiter, getPublicLeaderboard);

export default router;
