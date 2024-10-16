"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JudicialBinaclePersonalScanService = void 0;
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
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../../../../../config/config"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_2.default;
class JudicialBinaclePersonalScanService {
    constructor() { }
    async findCaseFileByNumber(caseFileId) {
        const caseFile = models.JUDICIAL_CASE_FILE.findOne({
            where: {
                id_judicial_case_file: caseFileId,
                [sequelize_1.Op.and]: [
                    { is_scan_valid: true },
                    { was_scanned: false },
                    { process_status: "Activo" }, // caseFile.dataValues.processStatus
                ]
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
        if (!caseFile)
            throw boom_1.default.notFound("expediente no encontrado");
        else
            return caseFile;
    }
    async findAllBinnaclesTypes(customerHasBankId) {
        const binnacleTypes = await models.JUDICIAL_BIN_TYPE_BINNACLE.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: customerHasBankId,
            },
        });
        if (!binnacleTypes || !binnacleTypes.length)
            throw boom_1.default.notFound("Binnacles types not found");
        return binnacleTypes;
    }
    async findAllproceduralStages(customerHasBankId) {
        const proceduralStages = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: customerHasBankId,
            },
        });
        if (!proceduralStages || !proceduralStages.length)
            throw boom_1.default.notFound("Procedural stages not found");
        else
            return proceduralStages;
    }
    async main(caseFileId, binnacleId) {
        var _a;
        let errorsCounter = 0;
        try {
            const downloadPath = path_1.default.join(__dirname, "../../../../../public/docs");
            if (!fs_1.default.existsSync(downloadPath))
                fs_1.default.mkdirSync(downloadPath);
            const { browser } = await (0, setupBrowser_1.setupBrowser)(downloadPath);
            const caseFile = await this.findCaseFileByNumber(caseFileId);
            if (!caseFile)
                throw boom_1.default.notFound("Case file not found");
            //? BLOCK 1
            try {
                if (!caseFile.dataValues.isScanValid || caseFile.dataValues.wasScanned || !caseFile.dataValues.processStatus || caseFile.dataValues.processStatus === "Concluido")
                    return;
                let isValidCaseFile;
                let binnaclesFromDB = [];
                let prevBinnaclesIndexs = [];
                let scrapingBinnaclesIndex = [];
                console.log("Getting binnacle types");
                const binnacleTypes = await this.findAllBinnaclesTypes(caseFile.dataValues.customerHasBankId);
                if (!binnacleTypes)
                    throw boom_1.default.notFound("Binnacles types not found");
                console.log("Getting procedural stages");
                const proceduralStages = await this.findAllproceduralStages(caseFile.dataValues.customerHasBankId);
                if (!proceduralStages)
                    throw boom_1.default.notFound("Procedural stages not found");
                const page = await browser.newPage();
                // Check dialog
                page.on('dialog', async (dialog) => {
                    console.log('Dialog detected:', dialog.message());
                    await dialog.accept();
                });
                const client = await page.target().createCDPSession();
                await client.send('Page.setDownloadBehavior', {
                    behavior: 'allow',
                    downloadPath: downloadPath,
                });
                isValidCaseFile = await (0, validateAndNavigateCaseFile_1.validateAndNavigateCaseFile)(page, caseFile);
                if (!isValidCaseFile) {
                    await caseFile.update({
                        isScanValid: false,
                    });
                    if (!page.isClosed()) {
                        await page.close();
                    }
                    throw boom_1.default.notFound("Case file is not valid");
                }
                await page.waitForSelector("#command > button");
                await page.click("#command > button");
                const caseFileInfo = await (0, getCaseFileInfo_1.getCaseFileInfo)(page); // scrapp
                const caseFileBinacles = await (0, extractPnlSeguimientoData_1.extractPnlSeguimientoData)(page);
                prevBinnaclesIndexs = caseFile.dataValues.judicialBinnacle
                    .filter((binnacle) => binnacle.dataValues.index !== null)
                    .map((binnacle) => binnacle.dataValues.index);
                binnaclesFromDB = caseFile.dataValues.judicialBinnacle
                    .filter((binnacle) => binnacle.dataValues.index !== null)
                    .map((binnacle) => binnacle);
                scrapingBinnaclesIndex = caseFileBinacles.map((binnacle) => binnacle.index);
                // ! Case 1: there are new binnacles added
                if (prevBinnaclesIndexs.length < scrapingBinnaclesIndex.length) {
                    const countBinnaclesAdded = scrapingBinnaclesIndex.length - prevBinnaclesIndexs.length;
                    // Find the new binnacle by index
                    const newBinnacles = caseFileBinacles.filter((binnacle) => !prevBinnaclesIndexs.includes(binnacle.index));
                    console.log("New binnacles found 📁", newBinnacles);
                    if (newBinnacles.length) {
                        // Update prev binnacles indexs
                        const prevBinnacles = caseFile.dataValues.judicialBinnacle
                            .filter((binnacle) => binnacle.dataValues.index !== null)
                            .map((binnacle) => binnacle);
                        await Promise.all(prevBinnacles.map(async (prevBinnacle) => {
                            await prevBinnacle.update({
                                index: prevBinnacle.dataValues.index + countBinnaclesAdded
                            });
                        }));
                        // Actualizar los índices previos en memoria
                        prevBinnaclesIndexs = prevBinnaclesIndexs.map((index) => index + countBinnaclesAdded);
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
                    // Find the binnacle by index
                    // TODO: Find binnacle and id and index
                    const binnacleToUpadteFromDB = binnaclesFromDB.find((binnacle) => {
                        binnacle.dataValues.id === binnacleId;
                    });
                    const binncleToUpdateFromScraping = caseFileBinacles.find((binnacle) => binnacle.index === binnacleToUpadteFromDB.dataValues.index);
                    if (!binncleToUpdateFromScraping)
                        throw boom_1.default.notFound("Binnacle to update form scraping not found");
                    // TODO: delete all notifications
                    // 1. Delete binnacle notifications
                    const notificationsToDestroy = await models.JUDICIAL_BIN_NOTIFICATION.destroy({
                        where: {
                            judicial_binacle_id_judicial_binacle: binnacleId
                        }
                    });
                    // 2. find binnacle files fron bd
                    const binnaclesFiles = await models.JUDICIAL_BIN_FILE.findAll({
                        where: {
                            judicial_binnacle_id_judicial_binnacle: binnacleId
                        }
                    });
                    // TODO: find binnacles files fron bd and bucket where binnacle index is a number and delete
                    // 3. Delete on bucket and db files
                    await Promise.all(binnaclesFiles.map(async (binnacleFile) => {
                        try {
                            await (0, aws_bucket_1.deleteFileBucket)(`${config_1.default.AWS_CHB_PATH}${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.id}/${binnacleFile.dataValues.customerHasBankId}/${caseFile.dataValues.client.dataValues.code}/case-file/${caseFile.dataValues.id}/binnacle/${binnacleFile.dataValues.name_origin_aws}`);
                            await models.JUDICIAL_BIN_FILE.destroy({
                                where: {
                                    id_judicial_bin_file: binnacleFile.dataValues.id,
                                    customer_has_bank_id_customer_has_bank: binnacleFile.dataValues.customerHasBankId,
                                    name_origin_aws: binnacleFile.dataValues.name_origin_aws
                                }
                            });
                        }
                        catch (e) {
                            console.log(e);
                        }
                    }));
                    // TODO: update binnacle information
                    // 4. upadte binnacle
                    console.log("Updating binnacle information... 📝");
                    const resolutionDate = (0, moment_timezone_1.default)(binncleToUpdateFromScraping.resolutionDate, "DD/MM/YYYY HH:mm").isValid() && binncleToUpdateFromScraping.resolutionDate
                        ? moment_timezone_1.default
                            .tz(binncleToUpdateFromScraping.resolutionDate, "DD/MM/YYYY HH:mm", "America/Lima")
                            .format("YYYY-MM-DD HH:mm:ss")
                        : null;
                    const entryDate = (0, moment_timezone_1.default)(binncleToUpdateFromScraping.entryDate, "DD/MM/YYYY HH:mm").isValid() && binncleToUpdateFromScraping.entryDate
                        ? moment_timezone_1.default
                            .tz(binncleToUpdateFromScraping.entryDate, "DD/MM/YYYY HH:mm", "America/Lima")
                            .format("YYYY-MM-DD HH:mm:ss")
                        : null;
                    const provedioDate = (0, moment_timezone_1.default)(binncleToUpdateFromScraping.proveido, "DD/MM/YYYY HH:mm").isValid() && binncleToUpdateFromScraping.proveido
                        ? moment_timezone_1.default
                            .tz(binncleToUpdateFromScraping.proveido, "DD/MM/YYYY HH:mm", "America/Lima")
                            .format("YYYY-MM-DD HH:mm:ss")
                        : null;
                    const binnacleType = binncleToUpdateFromScraping.resolutionDate
                        ? binnacleTypes.find((binnacleType) => binnacleType.dataValues.typeBinnacle === "RESOLUCION")
                        : binnacleTypes.find((binnacleType) => binnacleType.dataValues.typeBinnacle === "ESCRITO");
                    const proceduralStage = proceduralStages[0].dataValues.id;
                    const folios = typeof binncleToUpdateFromScraping.folios === "string" ? Number(binncleToUpdateFromScraping.folios) : null;
                    const fojas = typeof binncleToUpdateFromScraping.fojas === "string" ? Number(binncleToUpdateFromScraping.fojas) : null;
                    const juducialBinnacleUpadated = await binnacleToUpadteFromDB.update({
                        judicialBinProceduralStageId: proceduralStage,
                        lastPerformed: (_a = binncleToUpdateFromScraping.sumilla) !== null && _a !== void 0 ? _a : '',
                        binnacleTypeId: binnacleType === null || binnacleType === void 0 ? void 0 : binnacleType.dataValues.id,
                        date: new Date(),
                        judicialFileCaseId: caseFile.dataValues.id,
                        customerHasBankId: caseFile.dataValues.customerHasBankId,
                        index: binncleToUpdateFromScraping.index,
                        resolutionDate: resolutionDate,
                        entryDate: entryDate,
                        notificationType: binncleToUpdateFromScraping.notificationType,
                        acto: binncleToUpdateFromScraping.acto,
                        fojas: fojas,
                        folios: folios,
                        provedioDate: provedioDate,
                        userDescription: binncleToUpdateFromScraping.userDescription,
                        createdBy: "BOT",
                        totalTariff: 0,
                        tariffHistory: "[]",
                    });
                    // TODO: create new binnecles files and files on bucket
                    if (juducialBinnacleUpadated) {
                        try {
                            const extensions = [".pdf", ".docx"];
                            const originalFilePath = path_1.default.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${binncleToUpdateFromScraping.index}`);
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
                                        judicialBinnacleId: juducialBinnacleUpadated.dataValues.id,
                                        originalName: `${newBinnacleName}${fileExtension}`,
                                        nameOriginAws: "",
                                        customerHasBankId: juducialBinnacleUpadated.dataValues.customerHasBankId,
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
                                    await (0, aws_bucket_1.uploadFile)(file, `${config_1.default.AWS_CHB_PATH}${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.id}/${juducialBinnacleUpadated.dataValues.customerHasBankId}/${caseFile.dataValues.client.dataValues.code}/case-file/${caseFile.dataValues.id}/binnacle`);
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
                    // TODO: add new notifications by scraping
                    if (!binncleToUpdateFromScraping.notifications.length)
                        return;
                    await Promise.all(binncleToUpdateFromScraping.notifications.map(async (notification) => {
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
                            idJudicialBinacle: binnacleId,
                        });
                        // console.log("Creado notificacion: ",  judicialBinNotification);
                    }));
                }
            }
            catch (error) {
                throw boom_1.default.notFound("Error to proccess case file");
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
exports.JudicialBinaclePersonalScanService = JudicialBinaclePersonalScanService;
