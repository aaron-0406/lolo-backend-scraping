"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const caseFileId = joi_1.default.number().required();
const binnacleId = joi_1.default.number().required();
const updateAllBinnacleInformationByScrapingSchema = joi_1.default.object({
    caseFileId,
    binnacleId,
});
exports.default = {
    updateAllBinnacleInformationByScrapingSchema
};
