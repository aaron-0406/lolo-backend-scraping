"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const judicial_binacle_service_1 = require("./app/judicial/judicial-binnacle/modules/services/judicial-binacle.service");
const path_1 = __importDefault(require("path"));
const node_cron_1 = __importDefault(require("node-cron"));
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
    let thereAreCaseFilesWithNoScan = true;
    (async () => await service.main())();
    node_cron_1.default.schedule('0 6 * * *', async () => {
        await service.resetAllCaseFiles();
        console.log('Cron job iniciado: 6 AM');
        await processCaseFiles();
        async function processCaseFiles() {
            const { notScanedCaseFiles, errorsCounter } = await service.main();
            if (notScanedCaseFiles || errorsCounter > 4) {
                console.log("Case files with no scan, retrying in 30 minutes.");
                setTimeout(async () => {
                    await processCaseFiles();
                }, 30 * 60 * 1000);
            }
            else {
                console.log("All case files scanned.");
            }
        }
    });
    console.log("server is running on port", process.env.PORT || 3000);
});
