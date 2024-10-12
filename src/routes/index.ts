import express, { Express } from 'express';

import judicialBinnacleRoutes from './judicial/judicial-binnacle.routes';
const router = express.Router();

export const routerApi = (app: Express) => {
  app.use('/api/scraping/v1', router);

  router.use("/judicial/binnacle", judicialBinnacleRoutes);
}

export default routerApi;