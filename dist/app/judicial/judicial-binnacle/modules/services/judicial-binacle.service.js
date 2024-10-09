"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JudicialBinacleService = void 0;
const sequelize_1 = require("sequelize");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const stream_1 = require("stream");
const sequelize_2 = __importDefault(require("../../../../../libs/sequelize"));
const extractPnlSeguimientoData_1 = require("./judicial-binacle.service.libs/extractPnlSeguimientoData");
const getCaseFileInfo_1 = require("./judicial-binacle.service.libs/getCaseFileInfo/getCaseFileInfo");
const setupBrowser_1 = require("./judicial-binacle.service.libs/main/setupBrowser");
const validateAndNavigateCaseFile_1 = require("./judicial-binacle.service.libs/main/validateAndNavigateCaseFile");
const helpers_1 = require("../../../../../libs/helpers");
const aws_bucket_1 = require("../../../../../libs/aws_bucket");
const get_nine_types_1 = require("../libs/get-nine-types");
const deleteFolderContents_1 = require("./judicial-binacle.service.libs/main/deleteFolderContents");
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../../../../../config/config"));
const nodemailer = __importStar(require("nodemailer"));
const generateHtmlStructureToNewBinnacle_1 = require("../assets/html-templates/generateHtmlStructureToNewBinnacle");
const { models } = sequelize_2.default;
// ! THINGS TO FIX
// 1. detect if normar captcha is solved
// 2. detect if bot is detected where it shouldn't be
// 3. detect if case file is valid
class JudicialBinacleService {
    constructor() { }
    // async getAllCaseFiles(): Promise<CaseFiles> {
    //   return caseFilesData as CaseFiles;
    // }
    async resetAllCaseFiles() {
        await models.JUDICIAL_CASE_FILE.update({ wasScanned: false }, { where: { isScanValid: true } });
    }
    //? Puppeteer
    async getAllCaseFilesDB() {
        try {
            const hidalgoCustomersIds = await models.CUSTOMER_HAS_BANK.findAll({
                where: {
                    customer_id_customer: 1,
                },
            });
            const caseFiles = await models.JUDICIAL_CASE_FILE.findAll({
                where: {
                    customer_has_bank_id: {
                        [sequelize_1.Op.in]: hidalgoCustomersIds.map((customer) => customer.dataValues.id),
                    },
                    [sequelize_1.Op.and]: [
                        { is_scan_valid: true }, // caseFile.dataValues.isScanValid
                        { was_scanned: false }, // caseFile.dataValues.wasScanned
                        { process_status: "Activo" }, // caseFile.dataValues.processStatus
                    ]
                    // number_case_file:"01331-2024-0-1601-JP-CI-05"
                },
                include: [
                    {
                        model: models.JUDICIAL_BINNACLE,
                        as: "judicialBinnacle",
                        include: [
                            {
                                model: models.JUDICIAL_BIN_NOTIFICATION,
                                as: "judicialBinNotifications",
                                attributes: {
                                    exclude: ["judicialBinnacleId"],
                                },
                            },
                        ],
                    },
                    {
                        model: models.CUSTOMER_HAS_BANK,
                        as: "customerHasBank",
                        include: [
                            {
                                model: models.CUSTOMER,
                                as: "customer",
                            },
                        ],
                    },
                    {
                        model: models.CLIENT,
                        as: "client",
                    },
                    {
                        model: models.CUSTOMER_USER,
                        as: "customerUser",
                    },
                ],
            });
            // console.log(
            //   caseFiles.map(
            //     (caseFileData: any) => caseFileData.dataValues.customerUser.dataValues.email
            //   )
            // );
            return caseFiles;
        }
        catch (error) {
            console.error("Error during connection to database", error);
            return [];
        }
    }
    async main() {
        let errorsCounter = 0;
        try {
            const downloadPath = path_1.default.join(__dirname, "../../../../../public/docs");
            if (!fs_1.default.existsSync(downloadPath))
                fs_1.default.mkdirSync(downloadPath);
            const caseFiles = await this.getAllCaseFilesDB();
            const { browser } = await (0, setupBrowser_1.setupBrowser)(downloadPath);
            if (errorsCounter > 4)
                return { notScanedCaseFiles: 0, errorsCounter: errorsCounter };
            for (const caseFile of caseFiles) {
                if (!caseFile.dataValues.isScanValid ||
                    caseFile.dataValues.wasScanned ||
                    !caseFile.dataValues.processStatus ||
                    caseFile.dataValues.processStatus === "Concluido")
                    continue;
                const page = await browser.newPage();
                try {
                    page.on('dialog', async (dialog) => {
                        console.log('Dialog detected:', dialog.message());
                        await dialog.accept();
                    });
                    const client = await page.target().createCDPSession();
                    await client.send('Page.setDownloadBehavior', {
                        behavior: 'allow',
                        downloadPath: downloadPath,
                    });
                    const binnacleTypes = await models.JUDICIAL_BIN_TYPE_BINNACLE.findAll({
                        where: {
                            customer_has_bank_id_customer_has_bank: caseFile.dataValues.customerHasBankId,
                        },
                    });
                    if (!binnacleTypes) {
                        console.log("Binnacle type not found");
                        continue;
                    }
                    const proceduralStages = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.findAll({
                        where: {
                            customer_has_bank_id_customer_has_bank: caseFile.dataValues.customerHasBankId,
                        },
                    });
                    if (!proceduralStages) {
                        console.log("Procedural stage not found");
                        continue;
                    }
                    let isValidCaseFile;
                    isValidCaseFile = await (0, validateAndNavigateCaseFile_1.validateAndNavigateCaseFile)(page, caseFile);
                    if (!isValidCaseFile) {
                        await caseFile.update({
                            isScanValid: false
                        });
                        if (!page.isClosed()) {
                            await page.close();
                        }
                        continue;
                    }
                    await page.waitForSelector("#command > button");
                    await page.click("#command > button");
                    // TODO: Save case file
                    const caseFileInfo = await (0, getCaseFileInfo_1.getCaseFileInfo)(page);
                    const caseFileBinacles = await (0, extractPnlSeguimientoData_1.extractPnlSeguimientoData)(page);
                    let binnaclesFromDB = [];
                    let prevBinnaclesIndexs = [];
                    let newBinnaclesFound = [];
                    prevBinnaclesIndexs = caseFile.dataValues.judicialBinnacle
                        .filter((binnacle) => binnacle.dataValues.index !== null)
                        .map((binnacle) => binnacle.dataValues.index);
                    binnaclesFromDB = caseFile.dataValues.judicialBinnacle
                        .filter((binnacle) => binnacle.dataValues.index !== null)
                        .map((binnacle) => binnacle);
                    const newBinnaclesIndex = caseFileBinacles.map((binnacle) => binnacle.index);
                    if (newBinnaclesIndex.length > prevBinnaclesIndexs.length) {
                        const contNewBinnacles = newBinnaclesIndex.length - prevBinnaclesIndexs.length;
                        // Actualizar los índices de las bitácoras previas
                        const prevBinnacles = caseFile.dataValues.judicialBinnacle
                            .filter((binnacle) => binnacle.dataValues.index !== null)
                            .map((binnacle) => binnacle);
                        await Promise.all(prevBinnacles.map(async (prevBinnacle) => {
                            await prevBinnacle.update({
                                index: prevBinnacle.dataValues.index + contNewBinnacles
                            });
                        }));
                        // Actualizar los índices previos en memoria
                        prevBinnaclesIndexs = prevBinnaclesIndexs.map((index) => index + contNewBinnacles);
                        // Obtener las bitácoras nuevas desde la base de datos filtrando por índice
                        binnaclesFromDB = await models.JUDICIAL_BINNACLE.findAll({
                            where: {
                                judicial_file_case_id_judicial_file_case: caseFile.dataValues.id,
                            },
                            include: [
                                {
                                    model: models.JUDICIAL_BIN_NOTIFICATION,
                                    as: "judicialBinNotifications",
                                    attributes: {
                                        exclude: ["judicialBinnacleId"]
                                    }
                                }
                            ]
                        });
                    }
                    if (newBinnaclesIndex.length < prevBinnaclesIndexs.length) {
                        const contNewBinnacles = newBinnaclesIndex.length - prevBinnaclesIndexs.length;
                        // Find the eliminated binnacle by index
                    }
                    newBinnaclesFound = caseFileBinacles.filter((binnacle) => !prevBinnaclesIndexs.includes(binnacle.index));
                    console.log(" New binnacles found ", newBinnaclesFound);
                    // ! Read only new binnacles to create
                    if (newBinnaclesFound.length) {
                        await Promise.all(newBinnaclesFound.map(async (binnacle) => {
                            var _a;
                            console.log("Adding binnacles to database... 📁");
                            const resolutionDate = (0, moment_timezone_1.default)(binnacle.resolutionDate, "DD/MM/YYYY HH:mm").isValid()
                                ? moment_timezone_1.default
                                    .tz(binnacle.resolutionDate, "DD/MM/YYYY HH:mm", "America/Lima")
                                    .format("YYYY-MM-DD HH:mm:ss")
                                : null;
                            const entryDate = (0, moment_timezone_1.default)(binnacle.entryDate, "DD/MM/YYYY HH:mm").isValid()
                                ? moment_timezone_1.default
                                    .tz(binnacle.entryDate, "DD/MM/YYYY HH:mm", "America/Lima")
                                    .format("YYYY-MM-DD HH:mm:ss")
                                : null;
                            const provedioDate = (0, moment_timezone_1.default)(binnacle.proveido, "DD/MM/YYYY HH:mm").isValid()
                                ? moment_timezone_1.default
                                    .tz(binnacle.proveido, "DD/MM/YYYY HH:mm", "America/Lima")
                                    .format("YYYY-MM-DD HH:mm:ss")
                                : null;
                            const binnacleType = binnacle.resolutionDate
                                ? binnacleTypes.find((binnacleType) => binnacleType.dataValues.typeBinnacle === "RESOLUCION")
                                : binnacleTypes.find((binnacleType) => binnacleType.dataValues.typeBinnacle === "ESCRITO");
                            const proceduralStage = proceduralStages[0].dataValues.id;
                            const folios = typeof binnacle.folios === "string" ? Number(binnacle.folios) : null;
                            const fojas = typeof binnacle.fojas === "string" ? Number(binnacle.fojas) : null;
                            const judicialBinnacleData = await models.JUDICIAL_BINNACLE.create({
                                judicialBinProceduralStageId: proceduralStage,
                                lastPerformed: (_a = binnacle.sumilla) !== null && _a !== void 0 ? _a : '',
                                binnacleTypeId: binnacleType === null || binnacleType === void 0 ? void 0 : binnacleType.dataValues.id,
                                date: new Date(),
                                judicialFileCaseId: caseFile.dataValues.id,
                                customerHasBankId: caseFile.dataValues.customerHasBankId,
                                index: binnacle.index,
                                resolutionDate: resolutionDate,
                                entryDate: entryDate,
                                notificationType: binnacle.notificationType,
                                acto: binnacle.acto,
                                fojas: fojas,
                                folios: folios,
                                provedioDate: provedioDate,
                                userDescription: binnacle.userDescription,
                                createdBy: "BOT",
                                totalTariff: 0,
                                tariffHistory: "[]",
                            });
                            if (judicialBinnacleData) {
                                try {
                                    const extensions = [".pdf", ".docx"];
                                    const originalFilePath = path_1.default.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${binnacle.index}`);
                                    const newBinnacleName = `[BBD]-${(0, uuid_1.v4)()}`;
                                    for (const extension of extensions) {
                                        const fileWithExtension = `${originalFilePath}${extension}`;
                                        if (fs_1.default.existsSync(fileWithExtension)) {
                                            console.log("Archivo encontrado:", fileWithExtension);
                                            const fileStats = fs_1.default.statSync(fileWithExtension);
                                            const fileExtension = path_1.default.extname(fileWithExtension);
                                            // **Renombrar el archivo localmente**
                                            const newLocalFilePath = path_1.default.join(__dirname, `../../../../../public/docs/${newBinnacleName}${fileExtension}`);
                                            fs_1.default.renameSync(fileWithExtension, newLocalFilePath);
                                            console.log("Archivo renombrado localmente:", newLocalFilePath);
                                            const newBinFile = await models.JUDICIAL_BIN_FILE.create({
                                                judicialBinnacleId: judicialBinnacleData.dataValues.id,
                                                originalName: `${newBinnacleName}${fileExtension}`,
                                                nameOriginAws: "",
                                                customerHasBankId: judicialBinnacleData.dataValues.customerHasBankId,
                                                size: fileStats.size,
                                            });
                                            const fileBuffer = fs_1.default.readFileSync(newLocalFilePath);
                                            const fileStream = stream_1.Readable.from(fileBuffer);
                                            const file = {
                                                fieldname: "document",
                                                originalname: `${newBinnacleName}${fileExtension}`,
                                                encoding: "7bit",
                                                mimetype: (0, get_nine_types_1.getMimeType)(fileExtension),
                                                buffer: fileBuffer,
                                                size: fileBuffer.length,
                                                stream: fileStream,
                                                destination: path_1.default.join(__dirname, "../../../../../public/docs"),
                                                filename: `${newBinnacleName}${fileExtension}`,
                                                path: newLocalFilePath,
                                            };
                                            await (0, aws_bucket_1.uploadFile)(file, `${config_1.default.AWS_CHB_PATH}${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.id}/${judicialBinnacleData.dataValues.customerHasBankId}/${caseFile.dataValues.client.dataValues.code}/case-file/${caseFile.dataValues.id}/binnacle`);
                                            await newBinFile.update({
                                                nameOriginAws: `${newBinnacleName}${fileExtension}`,
                                            });
                                            await (0, helpers_1.deleteFile)("../public/docs", path_1.default.basename(file.filename));
                                            console.log("Archivo renombrado, subido y eliminado localmente.");
                                        }
                                        else {
                                            console.log("El archivo no existe:", fileWithExtension);
                                        }
                                    }
                                }
                                catch (error) {
                                    console.log("Error al subir el archivo:", error);
                                }
                            }
                            if (!binnacle.notifications.length)
                                return;
                            await Promise.all(binnacle.notifications.map(async (notification) => {
                                binnacle;
                                const shipDate = notification.shipDate &&
                                    (0, moment_timezone_1.default)(notification.shipDate, "DD/MM/YYYY HH:mm").isValid()
                                    ? moment_timezone_1.default.tz(notification.shipDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
                                    : null;
                                const resolutionDate = notification.resolutionDate &&
                                    (0, moment_timezone_1.default)(notification.resolutionDate, "DD/MM/YYYY HH:mm").isValid()
                                    ? moment_timezone_1.default.tz(notification.resolutionDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
                                    : null;
                                const notificationPrint = notification.notificationPrint &&
                                    (0, moment_timezone_1.default)(notification.notificationPrint, "DD/MM/YYYY HH:mm").isValid()
                                    ? moment_timezone_1.default.tz(notification.notificationPrint, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
                                    : null;
                                const sentCentral = notification.sentCentral &&
                                    (0, moment_timezone_1.default)(notification.sentCentral, "DD/MM/YYYY HH:mm").isValid()
                                    ? moment_timezone_1.default
                                        .tz(notification.sentCentral, "DD/MM/YYYY HH:mm", "America/Lima")
                                        .format("YYYY-MM-DD HH:mm:ss")
                                    : null;
                                const centralReceipt = notification.centralReceipt &&
                                    (0, moment_timezone_1.default)(notification.centralReceipt, "DD/MM/YYYY HH:mm").isValid()
                                    ? moment_timezone_1.default.tz(notification.centralReceipt, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
                                    : null;
                                const notificationToRecipientOn = notification.notificationToRecipientOn &&
                                    (0, moment_timezone_1.default)(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm").isValid()
                                    ? moment_timezone_1.default.tz(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
                                    : null;
                                const chargeReturnedToCourtOn = notification.chargeReturnedToCourtOn &&
                                    (0, moment_timezone_1.default)(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm").isValid()
                                    ? moment_timezone_1.default
                                        .tz(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm", "America/Lima")
                                        .format("YYYY-MM-DD HH:mm:ss")
                                    : null;
                                await models.JUDICIAL_BIN_NOTIFICATION.create({
                                    notificationCode: notification.notificationCode,
                                    addressee: notification.addressee,
                                    shipDate: shipDate,
                                    attachments: notification.attachments,
                                    deliveryMethod: notification.deliveryMethod,
                                    resolutionDate: resolutionDate,
                                    notificationPrint: notificationPrint,
                                    sentCentral: sentCentral,
                                    centralReceipt: centralReceipt,
                                    notificationToRecipientOn: notificationToRecipientOn,
                                    chargeReturnedToCourtOn: chargeReturnedToCourtOn,
                                    idJudicialBinacle: judicialBinnacleData.dataValues.id,
                                });
                                // console.log("Creado notificacion: ",  judicialBinNotification);
                            }));
                        }));
                        // Test account created: {
                        //   user: 'jblyf2ftfkgyv32f@ethereal.email',
                        //   pass: '5StqmXTdVgdcHc7afv',
                        //   smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
                        //   imap: { host: 'imap.ethereal.email', port: 993, secure: true },
                        //   pop3: { host: 'pop3.ethereal.email', port: 995, secure: true },
                        //   web: 'https://ethereal.email',
                        //   mxEnabled: false
                        // }
                        { /** ! TEST SEND EMAILS */ }
                        // await Promise.all(newBinnaclesFound.map(async(binnacle:any) => {
                        //   const transporter = nodemailer.createTransport({
                        //     host: "smtp.ethereal.email",
                        //     port: 587,
                        //     secure: false,
                        //     auth: {
                        //       user: 'jblyf2ftfkgyv32f@ethereal.email',
                        //       pass: '5StqmXTdVgdcHc7afv',
                        //     },
                        //   })
                        //   const message = {
                        //     from: 'jblyf2ftfkgyv32f@ethereal.email',
                        //     to: 'luis.silva@gmail.com',
                        //     subject: "Notificación de PNL",
                        //     text: "Notificación de PNL",
                        //     html: generateHtmlStructureToNewBinnacle(binnacle, "Nueva bitácora registrada")
                        //   }
                        //   const info = await transporter.sendMail(message)
                        //   const previewUrl = nodemailer.getTestMessageUrl(info);
                        //   console.log("Preview URL to new binnacle:", previewUrl);
                        // }))
                        { /** ! PROD SEND EMAILS */ }
                        await Promise.all(newBinnaclesFound.map(async (binnacle) => {
                            const transporter = nodemailer.createTransport({
                                host: config_1.default.AWS_EMAIL_HOST,
                                port: 587,
                                secure: false,
                                auth: {
                                    user: config_1.default.AWS_EMAIL_USER,
                                    pass: config_1.default.AWS_EMAIL_PASSWORD,
                                },
                            });
                            const message = {
                                from: config_1.default.AWS_EMAIL,
                                to: `${caseFile.dataValues.customerUser.dataValues.email}, luisarmandoballadares@gmail.com`,
                                subject: "Notificación de PNL",
                                text: "Notificación de PNL",
                                html: (0, generateHtmlStructureToNewBinnacle_1.generateHtmlStructureToNewBinnacle)(binnacle, "Nueva bitácora registrada")
                            };
                            await transporter.sendMail(message);
                        }));
                    }
                    // ! Read binnacles from DB to create new notifications
                    if (binnaclesFromDB.length) {
                        await Promise.all(binnaclesFromDB.map(async (binnacle) => {
                            var _a;
                            try {
                                binnacle = binnacle.dataValues;
                                let previousNotifications = binnacle.judicialBinNotifications.map((Notification) => Notification.dataValues);
                                let notificationsFound = [];
                                console.log("Verify if there are new notifications... 🔔");
                                const matchedBinnacle = caseFileBinacles.find((data) => data.index === binnacle.index);
                                // console.log("binnacle", binnacle)
                                // console.log("binnacle notifications", binnacle.judicialBinNotifications.map((Notification:any) => Notification.dataValues))
                                // console.log("matchedBinnacle", matchedBinnacle)
                                // console.log("matchedBinnacle notifications", matchedBinnacle?.notifications)
                                notificationsFound = (_a = matchedBinnacle === null || matchedBinnacle === void 0 ? void 0 : matchedBinnacle.notifications) !== null && _a !== void 0 ? _a : [];
                                if (previousNotifications.length === notificationsFound.length)
                                    return;
                                else {
                                    const notificationsCodesPrevious = previousNotifications.map((notification) => notification.notificationCode);
                                    const newNotifications = notificationsFound.filter((notification) => !notificationsCodesPrevious.includes(notification.notificationCode));
                                    console.log("New notifications found 🔔", newNotifications);
                                    if (!newNotifications.length || !matchedBinnacle)
                                        return;
                                    await Promise.all(newNotifications.map(async (notification) => {
                                        try {
                                            const shipDate = notification.shipDate && (0, moment_timezone_1.default)(notification.shipDate, "DD/MM/YYYY HH:mm").isValid() ? moment_timezone_1.default.tz(notification.shipDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                                            const resolutionDate = notification.resolutionDate && (0, moment_timezone_1.default)(notification.resolutionDate, "DD/MM/YYYY HH:mm").isValid() ? moment_timezone_1.default.tz(notification.resolutionDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                                            const notificationPrint = notification.notificationPrint && (0, moment_timezone_1.default)(notification.notificationPrint, "DD/MM/YYYY HH:mm").isValid() ? moment_timezone_1.default.tz(notification.notificationPrint, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                                            const sentCentral = notification.sentCentral && (0, moment_timezone_1.default)(notification.sentCentral, "DD/MM/YYYY HH:mm").isValid() ? moment_timezone_1.default.tz(notification.sentCentral, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                                            const centralReceipt = notification.centralReceipt && (0, moment_timezone_1.default)(notification.centralReceipt, "DD/MM/YYYY HH:mm").isValid() ? moment_timezone_1.default.tz(notification.centralReceipt, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                                            const notificationToRecipientOn = notification.notificationToRecipientOn && (0, moment_timezone_1.default)(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm").isValid() ? moment_timezone_1.default.tz(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                                            const chargeReturnedToCourtOn = notification.chargeReturnedToCourtOn && (0, moment_timezone_1.default)(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm").isValid() ? moment_timezone_1.default.tz(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                                            await models.JUDICIAL_BIN_NOTIFICATION.create({
                                                notificationCode: notification.notificationCode,
                                                addressee: notification.addressee,
                                                shipDate: shipDate,
                                                attachments: notification.attachments,
                                                deliveryMethod: notification.deliveryMethod,
                                                resolutionDate: resolutionDate,
                                                notificationPrint: notificationPrint,
                                                sentCentral: sentCentral,
                                                centralReceipt: centralReceipt,
                                                notificationToRecipientOn: notificationToRecipientOn,
                                                chargeReturnedToCourtOn: chargeReturnedToCourtOn,
                                                idJudicialBinacle: binnacle.id,
                                            });
                                            console.log(`Notificación creada: ${notification.notificationCode}`);
                                        }
                                        catch (error) {
                                            console.error(`Error al crear notificación con código ${notification.notificationCode}:`, error);
                                        }
                                    }));
                                    { /** ! TEST SEND EMAILS WITH NEW NOTIFICATIONS */ }
                                    // const transporter = nodemailer.createTransport({
                                    //   host: "smtp.ethereal.email",
                                    //   port: 587,
                                    //   secure: false,
                                    //   auth: {
                                    //     user: 'jblyf2ftfkgyv32f@ethereal.email',
                                    //     pass: '5StqmXTdVgdcHc7afv',
                                    //   },
                                    // })
                                    // const message = {
                                    //   from: 'jblyf2ftfkgyv32f@ethereal.email',
                                    //   to: 'luis.silva@gmail.com',
                                    //   subject: "Notificación de PNL",
                                    //   text: "Notificación de PNL",
                                    //   html: generateHtmlStructureToNewBinnacle({...matchedBinnacle, notifications:newNotifications}, "Nuevas notificaciones registradas")
                                    // }
                                    // const info = await transporter.sendMail(message)
                                    // const previewUrl = nodemailer.getTestMessageUrl(info);
                                    // console.log("Preview URL to new notifications:", previewUrl);
                                    { /** ! PROD SEND EMAILS WITH NEW NOTIFICATIONS */ }
                                    const transporter = nodemailer.createTransport({
                                        host: config_1.default.AWS_EMAIL_HOST,
                                        port: 587,
                                        secure: false,
                                        auth: {
                                            user: config_1.default.AWS_EMAIL_USER,
                                            pass: config_1.default.AWS_EMAIL_PASSWORD,
                                        },
                                    });
                                    const message = {
                                        from: config_1.default.AWS_EMAIL,
                                        to: `${caseFile.dataValues.customerUser.dataValues.email}, luisarmandoballadares@gmail.com`,
                                        subject: "Notificación de PNL",
                                        text: "Notificación de PNL",
                                        html: (0, generateHtmlStructureToNewBinnacle_1.generateHtmlStructureToNewBinnacle)(Object.assign(Object.assign({}, matchedBinnacle), { notifications: newNotifications }), "Nuevas notificaciones registradas")
                                    };
                                    await transporter.sendMail(message);
                                }
                            }
                            catch (error) {
                                console.error("Error during creation of judicial notifications:", error);
                            }
                        }));
                    }
                    // delete all docs from public/docs
                    const docsPath = path_1.default.join(__dirname, `../../../../../public/docs`);
                    await (0, deleteFolderContents_1.deleteFolderContents)(docsPath);
                    console.log("Notificaciones creadas correctamente, terminando todo");
                    if (!page.isClosed()) {
                        await page.close();
                    }
                    await caseFile.update({ wasScanned: true, isScanValid: true });
                }
                catch (error) {
                    console.error(`Error processing case file ${caseFile.dataValues.numberCaseFile}: ${error}`);
                    if (!page.isClosed()) {
                        await page.close();
                    }
                    errorsCounter++;
                }
            }
            await browser.close();
        }
        catch (error) {
            console.error(error);
        }
        const notScanedCaseFiles = await models.JUDICIAL_CASE_FILE.findAll({
            where: {
                isScanValid: true,
                wasScanned: false,
            },
        });
        return { notScanedCaseFiles: notScanedCaseFiles.length, errorsCounter: errorsCounter };
    }
}
exports.JudicialBinacleService = JudicialBinacleService;
