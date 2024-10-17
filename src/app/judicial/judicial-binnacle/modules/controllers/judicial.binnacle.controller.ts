import { Request, Response, NextFunction } from "express";
import { JudicialBinaclePersonalScanService } from "../services/judicial-binacle-personal-scan.service";

const service = new JudicialBinaclePersonalScanService();

export const updateAllBinnacleInformationByScrapingController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { caseFileId, binnacleId } = req.params;
    const binnacle = await service.main( Number(caseFileId), Number(binnacleId));
    res.json(binnacle);
  } catch (error) {
    next(error);
  }
};