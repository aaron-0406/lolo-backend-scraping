"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const judicial_binacle_service_1 = require("./jobs/judicial/judicial-binnacle/modules/services/judicial-binacle.service");
const path_1 = __importDefault(require("path"));
const service = new judicial_binacle_service_1.JudicialBinacleService();
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get("/ping", (_req, res) => {
    res.send("Hello World! 2");
});
app.use(express_1.default.static(path_1.default.join(__dirname, "/public")));
app.use(express_1.default.static(path_1.default.join(__dirname, "/public/build")));
app.listen(process.env.PORT || 3000, () => {
    console.log(`🚀 Server is running on port ${process.env.PORT || 3000}`);
    //Jobs
    // import("./jobs/cron-jobs").then((cronJobs) => cronJobs.inizializeCronJobs());
    (async () => await service.main())();
    console.log("server is running on port", process.env.PORT || 3000);
});
