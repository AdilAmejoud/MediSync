import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use(cors());
  app.use(helmet());

  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    message: { success: false, message: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', globalLimiter);

  return app;
};

const attachRoutes = (app, routeBase, router) => {
  app.use(routeBase, router);
};

export { createTestApp, attachRoutes };
