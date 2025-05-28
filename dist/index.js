"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const judicial_binacle_service_1 = require("./app/judicial/judicial-binnacle/modules/services/judicial-binacle.service");
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const ip_handler_1 = __importDefault(require("./middlewares/ip.handler"));
const error_handler_1 = __importDefault(require("./middlewares/error.handler"));
const node_cron_1 = __importDefault(require("node-cron"));
const routes_1 = __importDefault(require("./routes"));
const customer_user_service_1 = __importDefault(require("./app/dash/services/customer-user.service"));
const user_message_subscriptions_service_1 = __importDefault(require("./app/settings/services/user-message-subscriptions.service"));
const service = new judicial_binacle_service_1.JudicialBinacleService();
const serviceCustomer = new customer_user_service_1.default();
const userMessageSubscriptionsService = new user_message_subscriptions_service_1.default();
const { boomErrorHandler, logErrors, ormErrorHandler, errorHandler } = error_handler_1.default;
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use(express_1.default.json());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.urlencoded({ extended: false }));
//CORS
const whitelist = [
    "http://localhost:3000",
    "http://localhost:5000",
    "http://192.168.1.24:3000",
    "http://192.168.0.10:3000",
    "https://lolobank.com",
    "http://lolobank.com",
];
// nodemailer.createTestAccount().then((account) => {
//   console.log("Test account created:", account);
// });
app.use(express_1.default.static(path_1.default.join(__dirname, "/public")));
app.use(express_1.default.static(path_1.default.join(__dirname, "/public/build")));
app.use(ip_handler_1.default);
// app.use((req: Request, res: Response, next: NextFunction) => {
//   res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
//   res.setHeader("Pragma", "no-cache");
//   res.setHeader("Expires", "0");
//   next();
// });
app.use(logErrors);
app.use(boomErrorHandler);
app.use(ormErrorHandler);
app.use(errorHandler);
app.listen(process.env.PORT || 3000, () => {
    console.log(`🚀 Server is running on port ${process.env.PORT || 3000}`);
    const options = {
        origin: (origin, callback) => {
            if (whitelist.includes(origin !== null && origin !== void 0 ? origin : "") || !origin) {
                callback(null, true);
            }
            else {
                callback(new Error("no permitido"));
            }
        },
    };
    app.use((0, cors_1.default)(options));
    (0, routes_1.default)(app);
    app.get("/ping", (_req, res) => {
        res.send("Hello World! 2");
    });
    // (async () => {
    //   console.log("Using manual boot scan 🚀")
    //   await service.resetAllCaseFiles()
    //   await service.main()
    //   await service.resetCaseFilesByCustomerHasBankId();
    // }
    // )();
    // (async() => await caseFilesService.currencyExchange())();
    // Crear una cuenta de prueba
    // cron.schedule('* * * * *', async () => { // ejecutar cada minuto
    //   await runSendeding();
    //   console.log('cron job iniciado: 11:30 am');
    //   // await runCompleteProcess();
    //   console.log('✅ todos los case files procesados y cron finalizado.');
    // }, {
    //   timezone: 'america/lima'
    // });
    const runSendeding = async () => {
        console.log("Sending messages to subscribers");
        await userMessageSubscriptionsService.sendMessagesToSubscribers();
    };
    node_cron_1.default.schedule('30 8 * * *', async () => {
        await service.resetAllCaseFiles();
        console.log('cron job iniciado: 11:30 am');
        await runCompleteProcess();
        console.log('✅ todos los case files procesados y cron finalizado.');
        console.log("📨 Sending messages to subscribers");
        await userMessageSubscriptionsService.sendMessagesToSubscribers();
    }, {
        timezone: 'america/lima'
    });
    async function runCompleteProcess() {
        async function processCaseFiles() {
            const { notScanedCaseFiles, errorsCounter } = await service.main();
            if (notScanedCaseFiles > 0 && errorsCounter > 4) {
                console.log("Case files with no scan, retrying in 30 minutes...");
                // Espera 30 minutos y vuelve a intentar
                await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000));
                return processCaseFiles();
            }
            else {
                console.log("All case files scanned.");
            }
        }
        return processCaseFiles();
    }
    console.log("server is running on port", process.env.PORT || 3000);
});
