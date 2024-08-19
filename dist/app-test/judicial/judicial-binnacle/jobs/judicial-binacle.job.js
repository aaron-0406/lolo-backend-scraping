"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JudicialBinacleJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const judicial_binacle_service_1 = require("../modules/services/judicial-binacle.service");
const service = new judicial_binacle_service_1.JudicialBinacleService();
const JudicialBinacleJob = () => {
    node_cron_1.default.schedule('* * * * *', () => {
        service.main();
    });
};
exports.JudicialBinacleJob = JudicialBinacleJob;
