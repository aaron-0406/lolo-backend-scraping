import express from 'express';
import { checkPermissions, JWTAuth } from '../../middlewares/auth.handler';
import binnacleSchemas from "../../app/judicial/judicial-binnacle/modules/schemas/judicial-binnacle.schema"
import validatorHandler from '../../middlewares/validator.handler';
import { updateAllBinnacleInformationByScrapingController } from '../../app/judicial/judicial-binnacle/modules/controllers/judicial.binnacle.controller';
const router = express.Router();

const { updateAllBinnacleInformationByScrapingSchema } = binnacleSchemas;

router.post('/:caseFileId/:binnacleId',
  JWTAuth,
  validatorHandler(updateAllBinnacleInformationByScrapingSchema, "params"),
  updateAllBinnacleInformationByScrapingController
);


export default router;