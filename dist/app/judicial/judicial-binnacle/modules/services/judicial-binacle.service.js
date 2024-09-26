"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JudicialBinacleService = void 0;
const sequelize_1 = __importDefault(require("../../../../../libs/sequelize"));
const sequelize_2 = require("sequelize");
const judicial_binacle_constants_1 = require("../constants/judicial-binacle.constants");
const case_file_decoder_1 = require("../utils/case-file-decoder");
const exec_async_1 = require("../../../../../utils/python/exec-async");
const puppeteer_extra_1 = __importDefault(require("../utils/puppeteer-extra"));
const mockCaseFiles_json_1 = __importDefault(require("../assets/mock/mockCaseFiles.json"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
const stream_1 = require("stream");
const helpers_1 = require("../../../../../libs/helpers");
const get_nine_types_1 = require("../libs/get-nine-types");
// import extractTextContent from "../utils/extract-text-content";
const { models } = sequelize_1.default;
// ! THINGS TO FIX
// 1. detect if normar captcha is solved
// 2. detect if bot is detected where it shouldn't be
// 3. detect if case file is valid
class JudicialBinacleService {
    constructor() { }
    async getAllCaseFiles() {
        return mockCaseFiles_json_1.default;
    }
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
                    customer_has_bank_id: { [sequelize_2.Op.in]: hidalgoCustomersIds.map((customer) => customer.dataValues.id) }
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
    async removeHCaptcha(page) {
        let attempt = 0;
        while (true) {
            try {
                console.log("🤖 Anti-bot detected");
                const data = await page.solveRecaptchas();
                if (data.solved.length && data.solved[0] && data.solved[0].isSolved) {
                    await page.waitForSelector("body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm");
                    await page.click("body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm");
                    return true;
                }
                else {
                    attempt++;
                    console.log(`Attempt ${attempt + 1} failed, reloading page and retrying...`);
                    return false;
                }
            }
            catch (error) {
                console.error("Error in removeHCaptcha:", error);
                throw error;
            }
        }
    }
    async fillCaseFileNumber(page, numberCaseFileDecoder) {
        const { codeExp, codeAnio, codeIncidente, codeDistprov, codeOrgano, codEspecialidad, codInstancia, } = numberCaseFileDecoder;
        // #####################################
        const caseFileExist = await page.evaluate(() => {
            const errElement = document.getElementById("mensajeNoExisteExpedientes");
            // if (!errElement?.style?.display) return true;
            // return false;
            return errElement === null || errElement === void 0 ? void 0 : errElement.style["0"];
        });
        const isCorrectCaptcha = await page.evaluate(() => {
            const errElement = document.getElementById("codCaptchaError");
            // if (!errElement?.style?.display) return true;
            // return false;
            return errElement === null || errElement === void 0 ? void 0 : errElement.style["0"];
        });
        console.log("Case file previous", caseFileExist);
        console.log("Captcha previous", isCorrectCaptcha);
        // #####################################
        await page.waitForSelector("#myTab > li:nth-child(2) > a"),
            await page.click("#myTab > li:nth-child(2) > a"),
            await page.locator('input[id="cod_expediente"]').fill(codeExp),
            await page.locator('input[id="cod_anio"]').fill(codeAnio),
            await page.locator('input[id="cod_incidente"]').fill(codeIncidente),
            await page.locator('input[id="cod_distprov"]').fill(codeDistprov),
            await page.locator('input[id="cod_organo"]').fill(codeOrgano),
            await page.locator('input[id="cod_especialidad"]').fill(codEspecialidad),
            await page.locator('input[id="cod_instancia"]').fill(codInstancia);
    }
    async removeNormalCaptchaV1(page) {
        let isBotDetected = false;
        let isCasFileTrue = false;
        let isSolved = false;
        await page.waitForSelector("#captcha_image");
        await page.waitForSelector("#mensajeNoExisteExpedientes");
        await page.waitForSelector("#codCaptchaError");
        const imageElement = await page.$("#captcha_image");
        if (!imageElement)
            throw new Error("No captcha image found");
        const boundingBox = await imageElement.boundingBox();
        if (!boundingBox)
            throw new Error("No captcha bounding box found");
        await page.screenshot({
            path: path_1.default.join(__dirname, `../../../../../public/captchas/captcha-${boundingBox.x}-${boundingBox.y}-${boundingBox.width}-${boundingBox.height}.png`),
            clip: {
                x: boundingBox.x,
                y: boundingBox.y + boundingBox.y / 2,
                width: boundingBox.width,
                height: boundingBox.height,
            },
        });
        const screenshotFile = path_1.default.resolve(__dirname, `../../../../../public/captchas/captcha-${boundingBox.x}-${boundingBox.y}-${boundingBox.width}-${boundingBox.height}.png`);
        if (!fs_1.default.existsSync(screenshotFile)) {
            console.log("No captured screenshot");
            return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
        }
        try {
            const { stdout, stderr } = await (0, exec_async_1.execAsync)(`python3 ${judicial_binacle_constants_1.PYTHON_SCRIPT_PATH} ${screenshotFile}`);
            console.log("stdout", stdout);
            console.log("stderr", stderr);
            if (stderr) {
                console.error(`Error en el script de Python: ${stderr}`);
                return { isSolved: false, isCasFileTrue: true, isBotDetected: false };
            }
            const replaceStdout = stdout.replace(/'/g, '"');
            const parsedStdout = JSON.parse(replaceStdout);
            await page.locator('input[id="codigoCaptcha"]').fill(parsedStdout.code);
            await page.click("#consultarExpedientes").then(async () => {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                // await page.waitForSelector("#mensajeNoExisteExpedientes");
                // await page.waitForSelector("#codCaptchaError");
                // const isCorrectCaptcha = await page.evaluate(() =>{
                //   const errElement = document.getElementById("codCaptchaError");
                //   if (errElement?.style["0"] === "display" || !errElement?.style["0"] ) {
                //     isSolved = true
                //     return errElement?.style["0"]
                //   }else{
                //     isSolved = false;
                //     return errElement?.style["0"]
                //   }
                // })
                // const caseFileExist = await page.evaluate(() => {
                //   const errElement = document.getElementById("mensajeNoExisteExpedientes");
                //   if (errElement?.style["0"] === "display" || !errElement?.style["0"] ) {
                //     isCasFileTrue = true
                //     return errElement?.style["0"]
                //   }else{
                //     isCasFileTrue = false;
                //     return errElement?.style["0"]
                //   }
                // });
                //   console.log("Case file last", caseFileExist);
                //   console.log("Captcha last", isCorrectCaptcha);
            });
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            await delay(2000);
            [isCasFileTrue, isSolved] = await Promise.all([
                page.evaluate(() => {
                    const errElement = document.getElementById("mensajeNoExisteExpedientes");
                    if ((errElement === null || errElement === void 0 ? void 0 : errElement.style["0"]) === "display" || !(errElement === null || errElement === void 0 ? void 0 : errElement.style["0"]))
                        return true;
                    return false;
                }),
                page.evaluate(() => {
                    const errorCaptcha = document.getElementById("codCaptchaError");
                    if ((errorCaptcha === null || errorCaptcha === void 0 ? void 0 : errorCaptcha.style["0"]) === "display" || !(errorCaptcha === null || errorCaptcha === void 0 ? void 0 : errorCaptcha.style["0"]))
                        return true;
                    return false;
                }),
                // page.evaluate(() => {
                //   const botDetected = document.getElementById("captcha-bot-detected");
                //   if(!botDetected) return true;
                //   return false
                // }),
            ]);
            console.log("isBotDetected:", isBotDetected, "isSolved:", isSolved, "isCasFileTrue:", isCasFileTrue);
            return { isSolved, isCasFileTrue, isBotDetected };
        }
        catch (error) {
            console.error(`Error executing Python script: ${error.message}`);
            return { isSolved: false, isCasFileTrue: true, isBotDetected: false };
        }
    }
    async getCaseFileInfo(page) {
        await page.waitForSelector(".panel.panel-default");
        const data = await page.evaluate(() => {
            const getText = (selector, index = 0) => {
                const elements = document.querySelectorAll(selector);
                return elements.length > index
                    ? elements[index].innerText.trim()
                    : null;
            };
            const caseFileNumber = getText(".divRepExp .celdaGrid");
            const juridictionalBody = getText(".divRepExp .celdaGrid", 1);
            const juridictionalDistrict = getText(".divRepExp .celdaGrid", 2);
            const judge = getText(".divRepExp .celdaGrid", 3);
            const legalSpecialist = getText(".divRepExp .celdaGrid", 4);
            const initialDate = getText(".divRepExp .celdaGrid", 5);
            const process = getText(".divRepExp .celdaGrid", 6);
            const observation = getText(".divRepExp .celdaGrid", 7);
            const speciality = getText(".divRepExp .celdaGrid", 8);
            const subjects = getText(".divRepExp .celdaGrid", 9);
            const state = getText(".divRepExp .celdaGrid", 10);
            const proceduralStage = getText(".divRepExp .celdaGrid", 11);
            const completionDate = getText(".divRepExp .celdaGrid", 12);
            const location = getText(".divRepExp .celdaGrid", 13);
            const reasonForConclusion = getText(".divRepExp .celdaGrid", 14);
            const sumary = getText(".celdaGridxT");
            return {
                caseFileNumber,
                juridictionalBody,
                juridictionalDistrict,
                judge,
                legalSpecialist,
                initialDate,
                process,
                observation,
                speciality,
                subjects,
                state,
                proceduralStage,
                completionDate,
                location,
                reasonForConclusion,
                sumary,
            };
        });
        return data;
    }
    async extractPnlSeguimientoData(page) {
        const binnacles = await page.evaluate(async () => {
            var _a;
            const results = [];
            let index = 1;
            while (true) {
                const pnlSeguimiento = document.querySelector(`#pnlSeguimiento${index}`);
                if (!pnlSeguimiento)
                    break;
                const data = {
                    index,
                    resolutionDate: extractTextContent(pnlSeguimiento, "Fecha de Resolución:"),
                    entryDate: extractTextContent(pnlSeguimiento, "Fecha de Ingreso:"),
                    resolution: (_a = extractTextContent(pnlSeguimiento, "Resolución:")) !== null && _a !== void 0 ? _a : "",
                    notificationType: extractTextContent(pnlSeguimiento, "Tipo de Notificación:") === "Acto:" ? "" : extractTextContent(pnlSeguimiento, "Tipo de Notificación:"),
                    acto: extractTextContent(pnlSeguimiento, "Acto:"),
                    fojas: extractTextContent(pnlSeguimiento, "Fojas:"),
                    folios: extractTextContent(pnlSeguimiento, "Folios:"),
                    proveido: extractTextContent(pnlSeguimiento, "Proveido:"),
                    sumilla: extractTextContent(pnlSeguimiento, "Sumilla:"),
                    userDescription: extractTextContent(pnlSeguimiento, "Descripción de Usuario:"),
                    notifications: [],
                    urlDownload: getEnlaceDescarga(pnlSeguimiento),
                };
                // Extraer información de notificaciones
                const notificacionesDivs = pnlSeguimiento.querySelectorAll('.panel-body .borderinf');
                for (const div of notificacionesDivs) {
                    const notificationCode = extractNotificationCode(div);
                    const notificacion = {
                        notificationCode: notificationCode,
                        addressee: extractTextContent(div, "Destinatario:"),
                        shipDate: extractTextContent(div, "Fecha de envio:"),
                        attachments: extractTextContent(div, "Anexo(s):"),
                        deliveryMethod: extractTextContent(div, "Forma de entrega:"),
                    };
                    const detalles = await getDetallesAdicionales(div);
                    if (detalles) {
                        notificacion.resolutionDate = detalles.resolutionDate;
                        notificacion.notificationPrint = detalles.notificationPrint;
                        notificacion.sentCentral = detalles.sentCentral;
                        notificacion.centralReceipt = detalles.centralReceipt;
                        notificacion.notificationToRecipientOn = detalles.notificationToRecipientOn;
                        notificacion.chargeReturnedToCourtOn = detalles.chargeReturnedToCourtOn;
                    }
                    if (notificationCode) {
                        data.notifications.push(notificacion);
                    }
                }
                results.push(data);
                index++;
            }
            // Funciones auxiliares
            function extractTextContent(element, label) {
                const labelElement = Array.from(element.querySelectorAll('*')).find(el => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.includes(label); });
                if (labelElement) {
                    const textContent = labelElement.textContent || '';
                    const labelIndex = textContent.indexOf(label);
                    if (labelIndex !== -1) {
                        return textContent.substring(labelIndex + label.length).trim().split('\n')[0].trim();
                    }
                }
                return null;
            }
            function extractNotificationCode(element) {
                var _a;
                const codeElement = element.querySelector('h5.redb');
                if (!codeElement)
                    return null;
                const codeText = (_a = codeElement.textContent) === null || _a === void 0 ? void 0 : _a.trim().split(' ')[1];
                return codeText !== undefined ? codeText : null;
            }
            function getEnlaceDescarga(element) {
                const enlace = element.querySelector('.dBotonDesc a.aDescarg');
                return enlace ? enlace.href : null;
            }
            async function getDetallesAdicionales(notificacionDiv) {
                var _a, _b, _c, _d, _e, _f;
                const btnMasDetalle = notificacionDiv.querySelector(".btnMasDetalle");
                if (!btnMasDetalle)
                    return null;
                const modalId = btnMasDetalle.getAttribute("data-target");
                const modal = document.querySelector(modalId !== null && modalId !== void 0 ? modalId : "");
                if (!modal)
                    return null;
                const details = {
                    resolutionDate: ((_a = extractTextContent(modal, "Fecha de Resolución:")) === null || _a === void 0 ? void 0 : _a.length)
                        ? extractTextContent(modal, "Fecha de Resolución:")
                        : null,
                    notificationPrint: ((_b = extractTextContent(modal, "Notificación Impresa el:")) === null || _b === void 0 ? void 0 : _b.length)
                        ? extractTextContent(modal, "Notificación Impresa el:")
                        : null,
                    sentCentral: ((_c = extractTextContent(modal, "Enviada a la Central de Notificación o Casilla Electrónica:")) === null || _c === void 0 ? void 0 : _c.length)
                        ? extractTextContent(modal, "Enviada a la Central de Notificación o Casilla Electrónica:")
                        : null,
                    centralReceipt: ((_d = extractTextContent(modal, "Recepcionada en la central de Notificación el:")) === null || _d === void 0 ? void 0 : _d.length)
                        ? extractTextContent(modal, "Recepcionada en la central de Notificación el:")
                        : null,
                    notificationToRecipientOn: ((_e = extractTextContent(modal, "Notificación al destinatario el:")) === null || _e === void 0 ? void 0 : _e.length)
                        ? extractTextContent(modal, "Notificación al destinatario el:")
                        : null,
                    chargeReturnedToCourtOn: ((_f = extractTextContent(modal, "Cargo devuelto al juzgado el:")) === null || _f === void 0 ? void 0 : _f.length)
                        ? extractTextContent(modal, "Cargo devuelto al juzgado el:")
                        : null,
                };
                return details;
            }
            return results;
        });
        let startTime = Date.now();
        for (const data of binnacles) {
            try {
                if (data.urlDownload) {
                    console.log("Descargando archivo dinámico", data.urlDownload);
                    await this.clickDynamicAnchor(page, data.urlDownload);
                    const downloadPath = path_1.default.join(__dirname, "../../../../../public/docs");
                    const downloadedFilePath = await this.waitForDownload(downloadPath, startTime);
                    const fileExtension = path_1.default.extname(downloadedFilePath);
                    const newFileName = `binnacle-bot-document-${data.index}${fileExtension}`;
                    await this.renameDownloadedFile(downloadedFilePath, newFileName);
                    startTime = Date.now();
                }
            }
            catch (error) {
                console.log("Error al descargar archivos", error);
                continue;
            }
        }
        return binnacles;
    }
    async waitForDownload(downloadPath, startTime, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const files = fs_1.default.readdirSync(downloadPath);
                const newFiles = files.filter((file) => {
                    const filePath = path_1.default.join(downloadPath, file);
                    const stats = fs_1.default.statSync(filePath);
                    return stats.mtimeMs > startTime && (file.endsWith(".pdf") || file.endsWith(".doc")) && !file.endsWith(".crdownload");
                });
                if (newFiles.length > 0) {
                    clearInterval(interval);
                    resolve(path_1.default.join(downloadPath, newFiles[0]));
                }
            }, 1000);
            const timeoutId = setTimeout(() => {
                clearInterval(interval);
                reject(new Error("La descarga ha excedido el tiempo límite."));
            }, timeout);
        });
    }
    async renameDownloadedFile(oldPath, newName) {
        const newPath = path_1.default.join(path_1.default.dirname(oldPath), newName);
        fs_1.default.renameSync(oldPath, newPath);
    }
    async clickDynamicAnchor(page, url) {
        await page.evaluate((url) => {
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.style.display = "none";
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
        }, url);
    }
    async main() {
        let errorsCounter = 0;
        try {
            const downloadPath = path_1.default.join(__dirname, "../../../../../public/docs");
            const caseFiles = await this.getAllCaseFilesDB();
            const browser = await puppeteer_extra_1.default.launch({
                headless: true,
                slowMo: 5,
            });
            if (errorsCounter > 4)
                return { notScanedCaseFiles: 0, errorsCounter: errorsCounter };
            for (const caseFile of caseFiles) {
                if (!caseFile.dataValues.isScanValid || caseFile.dataValues.wasScanned)
                    continue;
                const page = await browser.newPage();
                page.on('dialog', async (dialog) => {
                    await dialog.accept();
                });
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
                    let isValidCaseFile = false;
                    await page.goto(judicial_binacle_constants_1.JEC_URL);
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    const maxAttempts = 5;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        console.log(`Attempt ${attempt + 1} to solve captchas`);
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                        const currentUrl = page.url();
                        if (currentUrl !== judicial_binacle_constants_1.JEC_URL)
                            await this.removeHCaptcha(page);
                        const numberCaseFile = (0, case_file_decoder_1.caseFileNumberDecoder)(caseFile.dataValues.numberCaseFile);
                        console.log(`Number case file: ${numberCaseFile}`);
                        await this.fillCaseFileNumber(page, numberCaseFile);
                        const { isSolved, isCasFileTrue, isBotDetected } = await this.removeNormalCaptchaV1(page);
                        if (isSolved && isCasFileTrue && !isBotDetected) {
                            console.log("Solved and is true, waiting for navigation");
                            isValidCaseFile = true;
                            attempt = 0;
                            break;
                        }
                        else if (!isCasFileTrue) {
                            console.log("isCasFileTrue is false, waiting for navigation");
                            isValidCaseFile = false;
                            break;
                        }
                        else if (!isSolved) {
                            console.log(`Attempt ${attempt + 1} failed, reloading page and retrying...`);
                            await page.reload();
                        }
                    }
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
                    const caseFileInfo = await this.getCaseFileInfo(page);
                    const caseFileBinacles = await this.extractPnlSeguimientoData(page);
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
                        var _a;
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
                                    const judicialBinNotification = await models.JUDICIAL_BIN_NOTIFICATION.create({
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
                        const resolutionDate = (0, moment_1.default)(binnacle.resolutionDate, "DD/MM/YYYY HH:mm").isValid() ? (0, moment_1.default)(binnacle.resolutionDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;
                        const entryDate = (0, moment_1.default)(binnacle.entryDate, "DD/MM/YYYY HH:mm").isValid() ? (0, moment_1.default)(binnacle.entryDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;
                        const provedioDate = (0, moment_1.default)(binnacle.proveido, "DD/MM/YYYY HH:mm").isValid() ? (0, moment_1.default)(binnacle.proveido, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;
                        const binnacleType = binnacle.resolutionDate
                            ? binnacleTypes.find((binnacleType) => binnacleType.dataValues.typeBinnacle === "RESOLUCION")
                            : binnacleTypes.find((binnacleType) => binnacleType.dataValues.typeBinnacle === "ESCRITO");
                        const proceduralStage = proceduralStages[0].dataValues.id;
                        const folios = typeof binnacle.folios === "string" ? Number(binnacle.folios) : null;
                        const fojas = typeof binnacle.fojas === "string" ? Number(binnacle.fojas) : null;
                        const judicialBinnacleData = await models.JUDICIAL_BINNACLE.create({
                            judicialBinProceduralStageId: proceduralStage,
                            lastPerformed: binnacle.sumilla,
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
                                            nameOriginAws: `binnacle-bot-document-${binnacle.index}${fileWithExtension}`,
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
                                (0, moment_1.default)(notification.shipDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") !== "Invalid date"
                                ? (0, moment_1.default)(notification.shipDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss")
                                : null;
                            const resolutionDate = notification.resolutionDate &&
                                (0, moment_1.default)(notification.resolutionDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") !== "Invalid date"
                                ? (0, moment_1.default)(notification.resolutionDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss")
                                : null;
                            const notificationPrint = notification.notificationPrint &&
                                (0, moment_1.default)(notification.notificationPrint, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") !== "Invalid date"
                                ? (0, moment_1.default)(notification.notificationPrint, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss")
                                : null;
                            const sentCentral = notification.sentCentral &&
                                (0, moment_1.default)(notification.sentCentral, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") !== "Invalid date"
                                ? (0, moment_1.default)(notification.sentCentral, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss")
                                : null;
                            const centralReceipt = notification.centralReceipt &&
                                (0, moment_1.default)(notification.centralReceipt, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") !== "Invalid date"
                                ? (0, moment_1.default)(notification.centralReceipt, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss")
                                : null;
                            const notificationToRecipientOn = notification.notificationToRecipientOn &&
                                (0, moment_1.default)(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") !== "Invalid date"
                                ? (0, moment_1.default)(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss")
                                : null;
                            const chargeReturnedToCourtOn = notification.chargeReturnedToCourtOn &&
                                (0, moment_1.default)(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") !== "Invalid date"
                                ? (0, moment_1.default)(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss")
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
