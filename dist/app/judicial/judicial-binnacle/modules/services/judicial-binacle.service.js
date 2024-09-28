"use strict";
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
const get_nine_types_1 = require("../libs/get-nine-types");
// import extractTextContent from "../utils/extract-text-content";
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
                    customer_has_bank_id: { [sequelize_1.Op.in]: hidalgoCustomersIds.map((customer) => customer.dataValues.id) }
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
                                    exclude: ["judicialBinnacleId"]
                                }
                            }
                        ]
                    },
                    {
                        model: models.CUSTOMER_HAS_BANK,
                        as: "customerHasBank",
                        include: [
                            {
                                model: models.CUSTOMER,
                                as: "customer",
                            }
                        ]
                    },
                    {
                        model: models.CLIENT,
                        as: "client",
                    }
                ]
            });
            return caseFiles;
        }
        catch (error) {
            console.error("Error en la conexión a la base de datos", error);
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
                        console.log("No existe binnacle type");
                        continue;
                    }
                    const proceduralStages = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.findAll({
                        where: {
                            customer_has_bank_id_customer_has_bank: caseFile.dataValues.customerHasBankId,
                        },
                    });
                    if (!proceduralStages) {
                        console.log("No existe procedural stage");
                        continue;
                    }
                    let isValidCaseFile;
                    isValidCaseFile = await (0, validateAndNavigateCaseFile_1.validateAndNavigateCaseFile)(page, caseFile);
                    if (!isValidCaseFile) {
                        await caseFile.update({
                            isScanValid: false
                        });
                        page.close();
                        continue;
                    }
                    await page.waitForSelector("#command > button");
                    await page.click("#command > button");
                    // TODO: Save case file
                    const caseFileInfo = await (0, getCaseFileInfo_1.getCaseFileInfo)(page);
                    const caseFileBinacles = await (0, extractPnlSeguimientoData_1.extractPnlSeguimientoData)(page);
                    let newBinnacles = [];
                    const binnaclesIndexs = caseFile.dataValues.judicialBinnacle
                        .filter((binnacle) => binnacle.dataValues.index !== null)
                        .map((binnacle) => binnacle.dataValues.index);
                    if (binnaclesIndexs.length)
                        newBinnacles = caseFileBinacles.filter((binnacle) => !binnaclesIndexs.includes(binnacle.index));
                    else
                        newBinnacles = caseFileBinacles;
                    if (!newBinnacles.length) {
                        // delete all docs from public/docs
                        Promise.all(caseFile.dataValues.judicialBinnacle.map(async (judicialBinnacle) => {
                            const originalFilePath = path_1.default.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${judicialBinnacle.dataValues.index}.pdf`);
                            if (fs_1.default.existsSync(originalFilePath)) {
                                await (0, helpers_1.deleteFile)("../public/docs", `binnacle-bot-document-${judicialBinnacle.dataValues.index}.pdf`);
                            }
                        }));
                    }
                    await Promise.all(newBinnacles.map(async (binnacle) => {
                        var _a, _b;
                        try {
                            const judicialBinnacle = caseFile.dataValues.judicialBinnacle.find((binnacleRegistred) => binnacleRegistred.dataValues.index === binnacle.index);
                            if (judicialBinnacle) {
                                // verify if there are new notifications
                                let notificationsCodes = [];
                                const binnacle = newBinnacles.find((binnacle) => binnacle.index === judicialBinnacle.dataValues.index);
                                if (judicialBinnacle.dataValues.judicialBinNotifications.length)
                                    notificationsCodes =
                                        judicialBinnacle.dataValues.judicialBinNotifications.map((notification) => notification.notificationCode);
                                const newNotifications = (_a = binnacle.notifications.filter((notification) => !notificationsCodes.includes(notification.notificationCode))) !== null && _a !== void 0 ? _a : [];
                                if (!newNotifications.length)
                                    return;
                                await Promise.all(newNotifications.map(async (notification) => {
                                    await models.JUDICIAL_BIN_NOTIFICATION.create({
                                        notificationCode: notification.notificationCode,
                                        addressee: notification.addressee,
                                        shipDate: notification.shipDate,
                                        attachments: notification.attachments,
                                        deliveryMethod: notification.deliveryMethod,
                                        resolutionDate: notification.resolutionDate,
                                        notificationPrint: notification.notificationPrint,
                                        sentCentral: notification.sentCentral,
                                        centralReceipt: notification.centralReceipt,
                                        notificationToRecipientOn: notification.notificationToRecipientOn,
                                        chargeReturnedToCourtOn: notification.chargeReturnedToCourtOn,
                                        idJudicialBinacle: judicialBinnacle.dataValues.id,
                                    });
                                    // console.log("Creado notificacion: ", judicialBinNotification);
                                }));
                                return;
                            }
                        }
                        catch (error) {
                            console.log("Error en la conexión a la base de datos", error);
                            return;
                        }
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
                            lastPerformed: (_b = binnacle.sumilla) !== null && _b !== void 0 ? _b : '',
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
                                const extensions = ['.pdf', '.docx'];
                                const originalFilePath = path_1.default.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${binnacle.index}`);
                                for (const extension of extensions) {
                                    if (fs_1.default.existsSync(originalFilePath + extension)) {
                                        const fileWithExtension = originalFilePath + extension;
                                        const fileStats = fs_1.default.statSync(fileWithExtension);
                                        const fileExtension = path_1.default.extname(fileWithExtension);
                                        console.log("Creando new bin file");
                                        const newBinFile = await models.JUDICIAL_BIN_FILE.create({
                                            judicialBinnacleId: judicialBinnacleData.dataValues.id,
                                            originalName: `binnacle-bot-document-${binnacle.index}${fileExtension}`,
                                            nameOriginAws: "",
                                            customerHasBankId: judicialBinnacleData.dataValues.customerHasBankId,
                                            size: fileStats.size,
                                        });
                                        console.log("File buffer", newBinFile);
                                        const fileBuffer = fs_1.default.readFileSync(fileWithExtension);
                                        // Crea un flujo de lectura para el archivo
                                        const fileStream = stream_1.Readable.from(fileBuffer);
                                        // Crea el archivo con la extensión correcta
                                        const file = {
                                            fieldname: 'document',
                                            originalname: `binnacle-bot-document-${binnacle.index}${fileExtension}`,
                                            encoding: '7bit',
                                            mimetype: (0, get_nine_types_1.getMimeType)(fileExtension),
                                            buffer: fileBuffer,
                                            size: fileBuffer.length,
                                            stream: fileStream,
                                            destination: path_1.default.join(__dirname, '../../../../../public/docs'),
                                            filename: `binnacle-bot-document-${binnacle.index}${fileExtension}`,
                                            path: fileWithExtension,
                                        };
                                        //Sube el archivo a AWS (descomentando cuando sea necesario)
                                        // await uploadFile(
                                        //   file,
                                        //   `${config.AWS_CHB_PATH}${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.id}/${judicialBinnacleData.dataValues.customerHasBankId}/${caseFile.dataValues.client.dataValues.code}/case-file/${caseFile.dataValues.id}/binnacle`
                                        // );
                                        newBinFile.update({
                                            nameOriginAws: `binnacle-bot-document-${binnacle.index}${path_1.default.extname(fileWithExtension)}`,
                                        });
                                        await (0, helpers_1.deleteFile)("../public/docs", path_1.default.basename(file.filename));
                                    }
                                    else {
                                        console.log("File not exists", originalFilePath);
                                    }
                                }
                            }
                            catch (error) {
                                console.log("File not uploaded", error);
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
                    // delete all docs from public/docs
                    Promise.all(newBinnacles.map(async (judicialBinnacle) => {
                        const baseFilePath = path_1.default.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${judicialBinnacle.index}`);
                        const extensions = ['.pdf', '.docx'];
                        for (const ext of extensions) {
                            const filePath = `${baseFilePath}${ext}`;
                            console.log("Deleting file", filePath);
                            if (fs_1.default.existsSync(filePath)) {
                                await (0, helpers_1.deleteFile)("../public/docs", path_1.default.basename(filePath));
                            }
                        }
                    }));
                    console.log("Notificaciones creadas correctamente, terminando todo");
                    await page.close();
                    await caseFile.update({ wasScanned: true, isScanValid: true });
                }
                catch (error) {
                    console.error(`Error processing case file ${caseFile.dataValues.numberCaseFile}: ${error}`);
                    await page.close();
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
