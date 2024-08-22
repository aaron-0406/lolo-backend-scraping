"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JudicialBinacleService = void 0;
const sequelize_1 = __importDefault(require("../../../../../libs/sequelize"));
const judicial_binacle_constants_1 = require("../constants/judicial-binacle.constants");
const case_file_decoder_1 = require("../utils/case-file-decoder");
const exec_async_1 = require("../../../../../utils/python/exec-async");
const puppeteer_extra_1 = __importDefault(require("../utils/puppeteer-extra"));
const mockCaseFiles_json_1 = __importDefault(require("../assets/mock/mockCaseFiles.json"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
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
    //? Puppeteer
    async getAllCaseFilesDB() {
        try {
            const caseFiles = await models.JUDICIAL_CASE_FILE.findAll({
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
            var _a;
            const errElement = document.getElementById("mensajeNoExisteExpedientes");
            if (!((_a = errElement === null || errElement === void 0 ? void 0 : errElement.style) === null || _a === void 0 ? void 0 : _a.display))
                return true;
            return false;
        });
        const isCorrectCaptcha = await page.evaluate(() => {
            var _a;
            const errElement = document.getElementById("codCaptchaError");
            if (!((_a = errElement === null || errElement === void 0 ? void 0 : errElement.style) === null || _a === void 0 ? void 0 : _a.display))
                return true;
            return false;
        });
        // console.log("existe el case file", caseFileExist);
        // console.log("es correcto el captcha", isCorrectCaptcha);
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
            if (stderr) {
                console.error(`Error en el script de Python: ${stderr}`);
                return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
            }
            const replaceStdout = stdout.replace(/'/g, '"');
            const parsedStdout = JSON.parse(replaceStdout);
            await page.locator('input[id="codigoCaptcha"]').fill(parsedStdout.code);
            await page.click("#consultarExpedientes").then(async () => {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                const caseFileExist = await page.evaluate(() => {
                    var _a;
                    const errElement = document.getElementById("mensajeNoExisteExpedientes");
                    if (!((_a = errElement === null || errElement === void 0 ? void 0 : errElement.style) === null || _a === void 0 ? void 0 : _a.display))
                        return true;
                    return false;
                });
                const isCorrectCaptcha = await page.evaluate(() => {
                    var _a;
                    const errElement = document.getElementById("codCaptchaError");
                    if (!((_a = errElement === null || errElement === void 0 ? void 0 : errElement.style) === null || _a === void 0 ? void 0 : _a.display))
                        return true;
                    return false;
                });
                // console.log("existe el case file", caseFileExist);
                // console.log("es correcto el captcha", isCorrectCaptcha);
            });
            [isCasFileTrue, isSolved] = await Promise.all([
                page.evaluate(() => {
                    const errElement = document.getElementById("mensajeNoExisteExpedientes");
                    if (!errElement)
                        return true;
                    return false;
                }),
                page.evaluate(() => {
                    const errorCaptcha = document.getElementById("codCaptchaError");
                    if (!errorCaptcha)
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
            return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
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
        const results = await page.evaluate(async () => {
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
                    notificationType: extractTextContent(pnlSeguimiento, "Tipo de Notificación:") ===
                        "Acto:"
                        ? ""
                        : extractTextContent(pnlSeguimiento, "Tipo de Notificación:"),
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
                    const notificacion = {
                        number: extractTextContent(div, "Destinatario:"),
                        addressee: extractTextContent(div, "Destinatario:"),
                        shipDate: extractTextContent(div, "Fecha de envio:"),
                        attachments: extractTextContent(div, "Anexo(s):"),
                        deliveryMethod: extractTextContent(div, "Forma de entrega:"),
                    };
                    // Extraer información adicional del modal si existe
                    const detalles = await getDetallesAdicionales(div);
                    if (detalles) {
                        notificacion.resolutionDate = detalles.resolutionDate;
                        notificacion.notificationPrint = detalles.notificationPrint;
                        notificacion.sentCentral = detalles.sentCentral;
                        notificacion.centralReceipt = detalles.centralReceipt;
                    }
                    if (notificacion.number) {
                        data.notifications.push(notificacion);
                    }
                }
                results.push(data);
                index++;
            }
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
            function getEnlaceDescarga(element) {
                const enlace = element.querySelector('.dBotonDesc a.aDescarg');
                return enlace ? enlace.href : null;
            }
            async function getDetallesAdicionales(notificacionDiv) {
                var _a, _b, _c, _d;
                const btnMasDetalle = notificacionDiv.querySelector(".btnMasDetalle");
                if (!btnMasDetalle)
                    return null;
                // Abrir el modal y esperar a que se cargue
                const modalId = btnMasDetalle.getAttribute("data-target");
                const modal = document.querySelector(modalId !== null && modalId !== void 0 ? modalId : "");
                if (!modal)
                    return null;
                // Extraer la información del modal
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
                };
                return details;
            }
            // writeFileSync('pnlSeguimientoData.json', JSON.stringify(results, null, 2), 'utf-8');
            // console.log('Datos guardados en pnlSeguimientoData.json');
            return results;
        });
        return results;
    }
    async main() {
        try {
            const caseFiles = await this.getAllCaseFilesDB();
            const browser = await puppeteer_extra_1.default.launch({
                headless: false,
                slowMo: 5,
            });
            for (const caseFile of caseFiles) {
                try {
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
                    const page = await browser.newPage();
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
                        else {
                            console.log(`Attempt ${attempt + 1} failed, reloading page and retrying...`);
                            await page.reload();
                        }
                    }
                    if (!isValidCaseFile) {
                        // await page.close();
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
                    await Promise.all(newBinnacles.map(async (binnacle) => {
                        const judicialBinnacle = await models.JUDICIAL_BINNACLE.findOne({
                            where: {
                                index: binnacle.index
                            }
                        });
                        if (judicialBinnacle) {
                            console.log("La bitacora ya existe");
                            return;
                        }
                        const resolutionDate = binnacle.resolutionDate ? (0, moment_1.default)(binnacle.resolutionDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;
                        const entryDate = binnacle.entryDate ? (0, moment_1.default)(binnacle.entryDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;
                        const provedioDate = binnacle.proveido ? (0, moment_1.default)(binnacle.proveido, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;
                        const binnacleType = binnacle.resolutionDate
                            ? binnacleTypes.find((binnacleType) => binnacleType.dataValues.typeBinnacle === "RESOLUCION")
                            : binnacleTypes.find((binnacleType) => binnacleType.dataValues.typeBinnacle === "ESCRITO");
                        const proceduralStage = proceduralStages[0].dataValues.id;
                        const judicialBinnacleData = await models.JUDICIAL_BINNACLE.create({
                            judicialBinProceduralStageId: proceduralStage,
                            lastPerformed: binnacle.sumilla,
                            binnacleTypeId: binnacleType === null || binnacleType === void 0 ? void 0 : binnacleType.dataValues.id, //TODO : CREATE A FUNCTION TO RETURN BINNACLE TYPE ID
                            date: new Date(),
                            judicialFileCaseId: caseFile.dataValues.id,
                            customerHasBankId: caseFile.dataValues.customerHasBankId,
                            index: binnacle.index,
                            resolutionDate: resolutionDate,
                            entryDate: entryDate,
                            notificationType: binnacle.notificationType,
                            acto: binnacle.acto,
                            fojas: binnacle.fojas,
                            folios: binnacle.folios,
                            provedioDate: provedioDate,
                            userDescription: binnacle.userDescription,
                            createdBy: "BOT",
                            totalTariff: 0,
                            tariffHistory: "[]",
                        });
                        await Promise.all(binnacle.notifications.map(async (notification) => {
                            const shipDate = notification.shipDate ? (0, moment_1.default)(notification.shipDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;
                            const resolutionDate = notification.resolutionDate ? (0, moment_1.default)(notification.resolutionDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;
                            const sentCentral = notification.sentCentral ? (0, moment_1.default)(notification.sentCentral, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;
                            const judicialBinNotification = await models.JUDICIAL_BIN_NOTIFICATION.create({
                                number: notification.number,
                                addressee: notification.addressee,
                                shipDate: shipDate,
                                attachments: notification.attachments,
                                deliveryMethod: notification.deliveryMethod,
                                resolutionDate: resolutionDate,
                                notificationPrint: notification.notificationPrint,
                                sentCentral: sentCentral,
                                centralReceipt: notification.centralReceipt,
                                idJudicialBinacle: judicialBinnacleData.dataValues.id,
                            });
                            console.log("Creado notificacion: ", judicialBinNotification);
                        }));
                    }));
                    await page.close();
                }
                catch (error) {
                    console.error(`Error processing case file ${caseFile.dataValues.numberCaseFile}: ${error}`);
                }
            }
        }
        catch (error) {
            console.error(error);
        }
        // await browser.close();
    }
}
exports.JudicialBinacleService = JudicialBinacleService;
