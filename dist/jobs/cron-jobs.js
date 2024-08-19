"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inizializeCronJobs = void 0;
const index_1 = require("../app-test/judicial/judicial-binnacle/jobs/index");
const inizializeCronJobs = () => {
    (0, index_1.JudicialBinacleJob)();
};
exports.inizializeCronJobs = inizializeCronJobs;
