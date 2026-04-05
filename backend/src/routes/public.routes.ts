import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getPublicLeaderboard } from '../controllers/public/leaderboard.controller';
import { getPublicGallery } from '../controllers/public/gallery.controller';

const router = Router();

// Tighter rate limit for the public endpoint — no auth barrier protects it
const publicLeaderboardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Gallery is less write-heavy; allow up to 60 reads per minute
const publicGalleryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

router.get('/leaderboard', publicLeaderboardLimiter, getPublicLeaderboard);
router.get('/gallery', publicGalleryLimiter, getPublicGallery);

export default router;
