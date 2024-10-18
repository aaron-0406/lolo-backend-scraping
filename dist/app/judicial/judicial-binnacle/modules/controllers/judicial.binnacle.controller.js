"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAllBinnacleInformationByScrapingController = void 0;
const judicial_binacle_personal_scan_service_1 = require("../services/judicial-binacle-personal-scan.service");
const service = new judicial_binacle_personal_scan_service_1.JudicialBinaclePersonalScanService();
const updateAllBinnacleInformationByScrapingController = async (req, res, next) => {
    try {
        const { caseFileId, binnacleId } = req.params;
        const binnacle = await service.main(Number(caseFileId), Number(binnacleId));
        res.json(binnacle);
    }
    catch (error) {
        next(error);
    }
};
exports.updateAllBinnacleInformationByScrapingController = updateAllBinnacleInformationByScrapingController;
