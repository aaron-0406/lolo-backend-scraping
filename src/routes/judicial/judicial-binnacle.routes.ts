import express from 'express';
import { checkPermissions, JWTAuth } from '../../middlewares/auth.handler';

const router = express.Router();


router.get('/:caseFileId/:binnacleId',
  JWTAuth,
  
  // controller
);


export default router;