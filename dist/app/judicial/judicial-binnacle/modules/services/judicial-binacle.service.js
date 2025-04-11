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
const aws_bucket_1 = require("../../../../../libs/aws_bucket");
const get_nine_types_1 = require("../libs/get-nine-types");
const deleteFolderContents_1 = require("./judicial-binacle.service.libs/main/deleteFolderContents");
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../../../../../config/config"));
const generateJsonStructureToNewBinnacle_1 = require("../assets/json-templates/generateJsonStructureToNewBinnacle");
const customer_user_service_1 = __importDefault(require("../../../../dash/services/customer-user.service"));
const message_service_1 = __importDefault(require("../../../../settings/services/message.service"));
const messages_user_service_1 = require("../../../../settings/services/messages-user.service");
const customerUserService = new customer_user_service_1.default();
const messageService = new message_service_1.default();
const messagesUsersService = new messages_user_service_1.MessagesUserService();
const { models } = sequelize_2.default;
// ! THINGS TO FIX
//// 1. detect if normar captcha is solved
//// 2. detect if bot is detected where it shouldn't be
//// 3. detect if case file is valid
class JudicialBinacleService {
    constructor() { }
    // async getAllCaseFiles(): Promise<CaseFiles> {
    //   return caseFilesData as CaseFiles;
    // }
    //! Temp tu reload count of valid case fieles
    async resetAllCaseFiles() {
        await models.JUDICIAL_CASE_FILE.update({ wasScanned: false }, {
            where: {
                [sequelize_1.Op.and]: [
                    { is_scan_valid: true },
                    { was_scanned: true },
                    { process_status: "Activo" }, // caseFile.dataValues.processStatus
                ],
            },
        });
    }
    //? Puppeteer
    async getAllCaseFilesDB() {
        try {
            const activeCustomersIds = await models.CUSTOMER.findAll({
                where: {
                    is_scrapper_active: true,
                },
                attributes: ["id_customer"]
            });
            const customerHasBanksIds = await models.CUSTOMER_HAS_BANK.findAll({
                where: {
                    customer_id_customer: {
                        [sequelize_1.Op.in]: activeCustomersIds.map((customer) => customer.dataValues.id_customer),
                    },
                },
            });
            const caseFiles = await models.JUDICIAL_CASE_FILE.findAll({
                where: {
                    customer_has_bank_id: {
                        [sequelize_1.Op.in]: [28, 30, 31],
                    },
                    [sequelize_1.Op.and]: [
                        { is_scan_valid: true },
                        { was_scanned: false },
                        { process_status: "Activo" }, // caseFile.dataValues.processStatus
                    ],
                    // number_case_file:"04660-2015-0-1601-JR-CI-06"
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
                limit: 5000,
                offset: 0,
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
        var _a, _b;
        let errorsCounter = 0;
        try {
            const downloadPath = path_1.default.join(__dirname, "../../../../../public/docs");
            const caseFiles = await this.getAllCaseFilesDB();
            const { browser } = await (0, setupBrowser_1.setupBrowser)(downloadPath);
            if (errorsCounter > 4)
                return { notScanedCaseFiles: 0, errorsCounter: errorsCounter };
            for (const caseFile of caseFiles) {
                if (!fs_1.default.existsSync(downloadPath)) {
                    console.log("Create a folder to save files");
                    fs_1.default.mkdirSync(downloadPath);
                }
                else {
                    await (0, deleteFolderContents_1.deleteFolderContents)(downloadPath);
                    fs_1.default.mkdirSync(downloadPath);
                }
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
                    const caseFileBinacles = await (0, extractPnlSeguimientoData_1.extractPnlSeguimientoData)(page, downloadPath);
                    // console.log(caseFileBinacles)
                    let binnaclesFromDB = [];
                    let prevBinnaclesIndexs = [];
                    let newBinnaclesFound = [];
                    let insertedBinnacles = [];
                    // console.log("Case file code: ", caseFile.dataValues.numberCaseFile)
                    prevBinnaclesIndexs = caseFile.dataValues.judicialBinnacle
                        .filter((binnacle) => binnacle.dataValues.index !== null)
                        .map((binnacle) => binnacle.dataValues.index);
                    binnaclesFromDB = caseFile.dataValues.judicialBinnacle
                        .filter((binnacle) => binnacle.dataValues.index !== null)
                        .map((binnacle) => binnacle);
                    const newBinnaclesIndex = caseFileBinacles.map((binnacle) => binnacle.index);
                    if (newBinnaclesIndex.length > prevBinnaclesIndexs.length) {
                        const contNewBinnacles = newBinnaclesIndex.length - prevBinnaclesIndexs.length;
                        // Get all binnacles
                        const prevBinnacles = caseFile.dataValues.judicialBinnacle
                            .filter((binnacle) => binnacle.dataValues.index !== null)
                            .map((binnacle) => binnacle);
                        await Promise.all(prevBinnacles.map(async (prevBinnacle) => {
                            await prevBinnacle.update({
                                index: prevBinnacle.dataValues.index + contNewBinnacles
                            });
                        }));
                        // Get the new binnacles from the database filtering by index
                        binnaclesFromDB = await models.JUDICIAL_BINNACLE.findAll({
                            where: {
                                judicial_file_case_id_judicial_file_case: caseFile.dataValues.id,
                                index: {
                                    [sequelize_1.Op.not]: null
                                }
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
                        // Update the previous indices in memory
                        // prevBinnaclesIndexs = prevBinnaclesIndexs.map((index: number) => index + contNewBinnacles);
                        prevBinnaclesIndexs = binnaclesFromDB.filter((binnacle) => binnacle.dataValues.index !== null).map((binnacle) => binnacle.dataValues.index);
                    }
                    if (newBinnaclesIndex.length < prevBinnaclesIndexs.length) {
                        const contNewBinnacles = newBinnaclesIndex.length - prevBinnaclesIndexs.length;
                        // Find the eliminated binnacle by index
                    }
                    newBinnaclesFound = caseFileBinacles.filter((binnacle) => !prevBinnaclesIndexs.includes(binnacle.index));
                    // console.log("Previous binnacles indexs updated:", binnaclesFromDB.filter(binnacle => binnacle.dataValues.index !== null)) // []
                    console.log("New binnacles found", newBinnaclesFound); // [8]
                    // console.log("New binnacles found length ", newBinnaclesFound.length) // [8]
                    // ! Read only new binnacles to create [4] => DB
                    // ! Read only new binnacles to create [5] => CEJ
                    // ! 1 - Read only new binnacles to create
                    // ! 5-4 -> 1
                    // ! + 1
                    if (newBinnaclesFound.length) {
                        insertedBinnacles = await Promise.all(newBinnaclesFound.map(async (binnacle) => {
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
                            }, { returning: true });
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
                            if (!binnacle.notifications.length) {
                                return judicialBinnacleData.dataValues;
                            }
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
                            return judicialBinnacleData.dataValues;
                        }));
                        // console.log("Inserted binnacles: ", insertedBinnacles)
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
                        // await Promise.all(newBinnaclesFound.map(async(binnacle:any) => {
                        //   const transporter = nodemailer.createTransport({
                        //     host: config.AWS_EMAIL_HOST,
                        //     port: 587,
                        //     secure: false,
                        //     auth: {
                        //       user: config.AWS_EMAIL_USER,
                        //       pass: config.AWS_EMAIL_PASSWORD,
                        //     },
                        //   })
                        //   const message = {
                        //     from: config.AWS_EMAIL,
                        //     to: `${caseFile.dataValues.customerUser.dataValues.email},luisarmandoballadares@gmail.com,intjavaaron@gmail.com,mahidalgo@hidalgovidalabogados.com`,
                        //     subject: "Notificación de PNL",
                        //     text: "Nueva bitácora registrada",
                        //     html: generateHtmlStructureToNewBinnacle({
                        //       data: binnacle,
                        //       titleDescription:"Nueva bitácora registrada",
                        //       numberCaseFile:caseFile.dataValues.numberCaseFile
                        //     })
                        //   }
                        //   await transporter.sendMail(message)
                        // }))
                        // TODO - Send new binnacle to APP
                        const userBot = await customerUserService.findUserBot((_b = (_a = caseFile === null || caseFile === void 0 ? void 0 : caseFile.dataValues) === null || _a === void 0 ? void 0 : _a.chbTransferred) !== null && _b !== void 0 ? _b : caseFile.dataValues.customerHasBankId);
                        console.log("User bot: ", userBot);
                        if (!userBot)
                            continue;
                        await Promise.all(newBinnaclesFound.map(async (binnacle) => {
                            var _a, _b, _c, _d;
                            const insertedBinnacle = insertedBinnacles.find((binnacleInserted) => binnacleInserted.index === binnacle.index);
                            try {
                                // 1. Generate new Message
                                const message = {
                                    customerHasBankId: (_b = (_a = caseFile === null || caseFile === void 0 ? void 0 : caseFile.dataValues) === null || _a === void 0 ? void 0 : _a.chbTransferred) !== null && _b !== void 0 ? _b : caseFile.dataValues.customerHasBankId,
                                    customerUserId: userBot.dataValues.id,
                                    subject: "Nueva bitácora registrada",
                                    keyMessage: "new-binnacle-registered-by-bot",
                                    body: JSON.stringify((0, generateJsonStructureToNewBinnacle_1.generateJsonStructureToNewBinnacle)({
                                        data: binnacle,
                                        titleDescription: "Nueva bitácora registrada",
                                        numberCaseFile: caseFile.dataValues.numberCaseFile,
                                        urls: JSON.stringify([`/judicial/${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.urlIdentifier}/expediente/${caseFile.dataValues.numberCaseFile}/bitacora/${insertedBinnacle.id}`]),
                                    })),
                                    wasRead: false,
                                };
                                const newMessage = await messageService.create(message);
                                if (!newMessage)
                                    return;
                                const newMessagesUsers = await messagesUsersService.create({
                                    customerHasBankId: (_d = (_c = caseFile === null || caseFile === void 0 ? void 0 : caseFile.dataValues) === null || _c === void 0 ? void 0 : _c.chbTransferred) !== null && _d !== void 0 ? _d : caseFile.dataValues.customerHasBankId,
                                    messageId: newMessage.dataValues.id,
                                    customerUserId: userBot.dataValues.id,
                                });
                                // TODO: Remove
                                /* const newMessagesUserOwner = await messagesUsersService.create({
                                  customerHasBankId: caseFile.dataValues.customerHasBankId,
                                  messageId: newMessage.dataValues.id,
                                  customerUserId: 7,
                                }) */
                                console.log("New message created: [BINNACLE]", newMessage);
                            }
                            catch (error) {
                                console.log("Error al crear notificación con código ", error);
                            }
                        }));
                    }
                    // ! Read binnacles from DB to create new notifications
                    if (binnaclesFromDB.length) {
                        await Promise.all(binnaclesFromDB.map(async (binnacle) => {
                            var _a, _b, _c, _d, _e, _f, _g;
                            try {
                                binnacle = binnacle.dataValues;
                                let previousNotifications = binnacle.judicialBinNotifications.map((Notification) => Notification.dataValues);
                                let notificationsFound = [];
                                console.log("Verify if there are new notifications... 🔔");
                                const matchedBinnacle = caseFileBinacles.find((data) => data.index === binnacle.index);
                                notificationsFound = (_a = matchedBinnacle === null || matchedBinnacle === void 0 ? void 0 : matchedBinnacle.notifications) !== null && _a !== void 0 ? _a : [];
                                const notificationsCodesPrevious = previousNotifications.map((notification) => notification.notificationCode);
                                const newNotifications = notificationsFound.filter((notification) => !notificationsCodesPrevious.includes(notification.notificationCode));
                                // console.log("Prev notification codes 01: ", notificationsCodesPrevious)
                                // console.log("Notifications Found", notificationsFound)
                                // console.log("New notifications 🔔 01", newNotifications)
                                if (previousNotifications.length === notificationsFound.length)
                                    return;
                                else {
                                    const notificationsCodesPrevious = previousNotifications.map((notification) => notification.notificationCode);
                                    const newNotifications = notificationsFound.filter((notification) => !notificationsCodesPrevious.includes(notification.notificationCode));
                                    // console.log("Prev notification codes: ", notificationsCodesPrevious)
                                    // console.log("New notifications 🔔", newNotifications)
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
                                    // const transporter = nodemailer.createTransport({
                                    //   host: config.AWS_EMAIL_HOST,
                                    //   port: 587,
                                    //   secure: false,
                                    //   auth: {
                                    //     user: config.AWS_EMAIL_USER,
                                    //     pass: config.AWS_EMAIL_PASSWORD,
                                    //   },
                                    // })
                                    // const message = {
                                    //   from: config.AWS_EMAIL,
                                    //   to: `${caseFile.dataValues.customerUser.dataValues.email},luisarmandoballadares@gmail.com,intjavaaron@gmail.com,mahidalgo@hidalgovidalabogados.com`,
                                    //   subject: "Notificación de PNL",
                                    //   text: "Nueva notificación registrada",
                                    //   html: generateHtmlStructureToNewBinnacle({
                                    //     data: {
                                    //       ...matchedBinnacle,
                                    //       notifications: newNotifications,
                                    //     },
                                    //     titleDescription: "Nuevas notificaciones registradas",
                                    //     numberCaseFile: caseFile.dataValues.numberCaseFile,
                                    //   }),
                                    // };
                                    // await transporter.sendMail(message)
                                    try {
                                        // TODO: Send new message to APP [NOTIFICATION]
                                        const userBot = await customerUserService.findUserBot((_c = (_b = caseFile === null || caseFile === void 0 ? void 0 : caseFile.dataValues) === null || _b === void 0 ? void 0 : _b.chbTransferred) !== null && _c !== void 0 ? _c : caseFile.dataValues.customerHasBankId);
                                        console.log("User bot: ", userBot);
                                        if (!userBot)
                                            return;
                                        const message = {
                                            customerHasBankId: (_e = (_d = caseFile === null || caseFile === void 0 ? void 0 : caseFile.dataValues) === null || _d === void 0 ? void 0 : _d.chbTransferred) !== null && _e !== void 0 ? _e : caseFile.dataValues.customerHasBankId,
                                            customerUserId: userBot.dataValues.id,
                                            subject: "Nuevas notificaciones registradas",
                                            keyMessage: "new-notifications-registered-by-bot",
                                            body: JSON.stringify((0, generateJsonStructureToNewBinnacle_1.generateJsonStructureToNewBinnacle)({
                                                data: Object.assign(Object.assign({}, matchedBinnacle), { notifications: newNotifications }),
                                                titleDescription: "Nuevas notificaciones registradas",
                                                numberCaseFile: caseFile.dataValues.numberCaseFile,
                                                urls: JSON.stringify([
                                                    `/judicial/${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.urlIdentifier}/expediente/${caseFile.dataValues.numberCaseFile}/bitacora/${binnacle.id}`,
                                                ]),
                                            })),
                                            wasRead: false,
                                        };
                                        const newMessage = await messageService.create(message);
                                        if (!newMessage)
                                            return;
                                        const newMessagesUsers = await messagesUsersService.create({
                                            customerHasBankId: (_g = (_f = caseFile === null || caseFile === void 0 ? void 0 : caseFile.dataValues) === null || _f === void 0 ? void 0 : _f.chbTransferred) !== null && _g !== void 0 ? _g : caseFile.dataValues.customerHasBankId,
                                            messageId: newMessage.dataValues.id,
                                            customerUserId: userBot.dataValues.id,
                                        });
                                        // TODO: Remove
                                        /* const newMessagesUserOwner = await messagesUsersService.create({
                                          customerHasBankId: caseFile.dataValues.customerHasBankId,
                                          messageId: newMessage.dataValues.id,
                                          customerUserId: 7,
                                        }) */
                                        console.log("New message created [Notification]: ", newMessage);
                                    }
                                    catch (error) {
                                        console.error("Error during creation of judicial notifications:", error);
                                    }
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
