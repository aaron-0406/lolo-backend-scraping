"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reScanBinnacleController = void 0;
const judicial_binacle_personal_scan_service_1 = require("../services/judicial-binacle-personal-scan.service");
const service = new judicial_binacle_personal_scan_service_1.JudicialBinacleService();
const reScanBinnacleController = async (req, res, next) => {
    try {
        const { id } = req.params;
        // const caseFiles = await service.findAll();
        // res.json(caseFiles);
    }
    catch (error) {
        next(error);
    }
};
exports.reScanBinnacleController = reScanBinnacleController;
