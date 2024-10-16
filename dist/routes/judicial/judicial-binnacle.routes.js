"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const judicial_binnacle_schema_1 = __importDefault(require("../../app/judicial/judicial-binnacle/modules/schemas/judicial-binnacle.schema"));
const validator_handler_1 = __importDefault(require("../../middlewares/validator.handler"));
const judicial_binnacle_controller_1 = require("../../app/judicial/judicial-binnacle/modules/controllers/judicial.binnacle.controller");
const router = express_1.default.Router();
const { updateAllBinnacleInformationByScrapingSchema } = judicial_binnacle_schema_1.default;
router.post('/:caseFileId/:binnacleId', 
// JWTAuth,
(0, validator_handler_1.default)(updateAllBinnacleInformationByScrapingSchema, "params"), judicial_binnacle_controller_1.updateAllBinnacleInformationByScrapingController);
exports.default = router;
