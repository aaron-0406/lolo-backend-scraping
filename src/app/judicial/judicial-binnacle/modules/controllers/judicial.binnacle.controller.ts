import { Request, Response, NextFunction } from "express";
import { JudicialBinacleService } from "../services/judicial-binacle-personal-scan.service";

const service = new JudicialBinacleService();

export const reScanBinnacleController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    // const caseFiles = await service.findAll();
    // res.json(caseFiles);
  } catch (error) {
    next(error);
  }
};