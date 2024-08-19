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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const fs_1 = __importStar(require("fs"));
// import extractTextContent from "../utils/extract-text-content";
const { models } = sequelize_1.default;
class JudicialBinacleService {
    constructor() { }
    getAllCaseFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            return mockCaseFiles_json_1.default;
        });
    }
    //? Puppeteer
    getAllCaseFilesDB() {
        return __awaiter(this, void 0, void 0, function* () {
            const caseFiles = yield models.JUDICIAL_CASE_FILE.findAll();
            console.log(caseFiles);
        });
    }
    removeHCaptcha(page) {
        return __awaiter(this, void 0, void 0, function* () {
            let attempt = 0;
            while (true) {
                try {
                    console.log("🤖 Anti-bot detected");
                    const data = yield page.solveRecaptchas();
                    if (data.solved.length && data.solved[0] && data.solved[0].isSolved) {
                        yield page.waitForSelector("body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm");
                        yield page.click("body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm");
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
        });
    }
    fillCaseFileNumber(page, numberCaseFileDecoder) {
        return __awaiter(this, void 0, void 0, function* () {
            const { codeExp, codeAnio, codeIncidente, codeDistprov, codeOrgano, codEspecialidad, codInstancia, } = numberCaseFileDecoder;
            // #####################################
            const caseFileExist = yield page.evaluate(() => {
                var _a;
                const errElement = document.getElementById("mensajeNoExisteExpedientes");
                if (!((_a = errElement === null || errElement === void 0 ? void 0 : errElement.style) === null || _a === void 0 ? void 0 : _a.display))
                    return true;
                return false;
            });
            const isCorrectCaptcha = yield page.evaluate(() => {
                var _a;
                const errElement = document.getElementById("codCaptchaError");
                if (!((_a = errElement === null || errElement === void 0 ? void 0 : errElement.style) === null || _a === void 0 ? void 0 : _a.display))
                    return true;
                return false;
            });
            console.log("existe el case file", caseFileExist);
            console.log("es correcto el captcha", isCorrectCaptcha);
            // #####################################
            yield page.waitForSelector("#myTab > li:nth-child(2) > a"),
                yield page.click("#myTab > li:nth-child(2) > a"),
                yield page.locator('input[id="cod_expediente"]').fill(codeExp),
                yield page.locator('input[id="cod_anio"]').fill(codeAnio),
                yield page.locator('input[id="cod_incidente"]').fill(codeIncidente),
                yield page.locator('input[id="cod_distprov"]').fill(codeDistprov),
                yield page.locator('input[id="cod_organo"]').fill(codeOrgano),
                yield page.locator('input[id="cod_especialidad"]').fill(codEspecialidad),
                yield page.locator('input[id="cod_instancia"]').fill(codInstancia);
        });
    }
    removeNormalCaptchaV1(page) {
        return __awaiter(this, void 0, void 0, function* () {
            let isBotDetected = false;
            let isCasFileTrue = false;
            let isSolved = false;
            yield page.waitForSelector("#captcha_image");
            yield page.waitForSelector("#mensajeNoExisteExpedientes");
            yield page.waitForSelector("#codCaptchaError");
            const imageElement = yield page.$("#captcha_image");
            if (!imageElement)
                throw new Error("No captcha image found");
            const boundingBox = yield imageElement.boundingBox();
            if (!boundingBox)
                throw new Error("No captcha bounding box found");
            yield page.screenshot({
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
                const { stdout, stderr } = yield (0, exec_async_1.execAsync)(`python3 ${judicial_binacle_constants_1.PYTHON_SCRIPT_PATH} ${screenshotFile}`);
                if (stderr) {
                    console.error(`Error en el script de Python: ${stderr}`);
                    return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
                }
                const replaceStdout = stdout.replace(/'/g, '"');
                const parsedStdout = JSON.parse(replaceStdout);
                yield page.locator('input[id="codigoCaptcha"]').fill(parsedStdout.code);
                yield page.click("#consultarExpedientes").then(() => __awaiter(this, void 0, void 0, function* () {
                    yield new Promise((resolve) => setTimeout(resolve, 3000));
                    const caseFileExist = yield page.evaluate(() => {
                        var _a;
                        const errElement = document.getElementById("mensajeNoExisteExpedientes");
                        if (!((_a = errElement === null || errElement === void 0 ? void 0 : errElement.style) === null || _a === void 0 ? void 0 : _a.display))
                            return true;
                        return false;
                    });
                    const isCorrectCaptcha = yield page.evaluate(() => {
                        var _a;
                        const errElement = document.getElementById("codCaptchaError");
                        if (!((_a = errElement === null || errElement === void 0 ? void 0 : errElement.style) === null || _a === void 0 ? void 0 : _a.display))
                            return true;
                        return false;
                    });
                    console.log("existe el case file", caseFileExist);
                    console.log("es correcto el captcha", isCorrectCaptcha);
                }));
                [isCasFileTrue, isSolved] = yield Promise.all([
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
        });
    }
    getCaseFileInfo(page) {
        return __awaiter(this, void 0, void 0, function* () {
            yield page.waitForSelector(".panel.panel-default");
            const data = yield page.evaluate(() => {
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
        });
    }
    extractPnlSeguimientoData(page) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield page.evaluate(() => __awaiter(this, void 0, void 0, function* () {
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
                        const detalles = yield getDetallesAdicionales(div);
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
                function getDetallesAdicionales(notificacionDiv) {
                    return __awaiter(this, void 0, void 0, function* () {
                        var _a, _b, _c, _d;
                        const btnMasDetalle = notificacionDiv.querySelector('.btnMasDetalle');
                        if (!btnMasDetalle)
                            return null;
                        // Abrir el modal y esperar a que se cargue
                        const modalId = btnMasDetalle.getAttribute('data-target');
                        const modal = document.querySelector(modalId !== null && modalId !== void 0 ? modalId : "");
                        if (!modal)
                            return null;
                        // Extraer la información del modal
                        const details = {
                            resolutionDate: ((_a = extractTextContent(modal, "Fecha de Resolución:")) === null || _a === void 0 ? void 0 : _a.length) ? extractTextContent(modal, "Fecha de Resolución:") : null,
                            notificationPrint: ((_b = extractTextContent(modal, "Notificación Impresa el:")) === null || _b === void 0 ? void 0 : _b.length) ? extractTextContent(modal, "Notificación Impresa el:") : null,
                            sentCentral: ((_c = extractTextContent(modal, "Enviada a la Central de Notificación o Casilla Electrónica:")) === null || _c === void 0 ? void 0 : _c.length) ? extractTextContent(modal, "Enviada a la Central de Notificación o Casilla Electrónica:") : null,
                            centralReceipt: ((_d = extractTextContent(modal, "Recepcionada en la central de Notificación el:")) === null || _d === void 0 ? void 0 : _d.length) ? extractTextContent(modal, "Recepcionada en la central de Notificación el:") : null,
                        };
                        return details;
                    });
                }
                return results;
            }));
            (0, fs_1.writeFileSync)('pnlSeguimientoData.json', JSON.stringify(results, null, 2), 'utf-8');
            console.log('Datos guardados en pnlSeguimientoData.json');
            return results;
        });
    }
    main() {
        return __awaiter(this, void 0, void 0, function* () {
            const caseFiles = yield this.getAllCaseFiles();
            const browser = yield puppeteer_extra_1.default.launch({
                headless: false,
                slowMo: 5,
            });
            for (const caseFile of caseFiles) {
                try {
                    let isValidCaseFile = false;
                    const page = yield browser.newPage();
                    yield page.goto(judicial_binacle_constants_1.JEC_URL);
                    yield new Promise((resolve) => setTimeout(resolve, 5000));
                    const maxAttempts = 5;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        console.log(`Attempt ${attempt + 1} to solve captchas`);
                        yield new Promise((resolve) => setTimeout(resolve, 1000));
                        const currentUrl = page.url();
                        if (currentUrl !== judicial_binacle_constants_1.JEC_URL)
                            yield this.removeHCaptcha(page);
                        const numberCaseFile = (0, case_file_decoder_1.caseFileNumberDecoder)(caseFile.number_case_file);
                        console.log(`Number case file: ${numberCaseFile}`);
                        yield this.fillCaseFileNumber(page, numberCaseFile);
                        const { isSolved, isCasFileTrue, isBotDetected } = yield this.removeNormalCaptchaV1(page);
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
                            yield page.reload();
                        }
                    }
                    if (!isValidCaseFile) {
                        // await page.close();
                        continue;
                    }
                    yield page.waitForSelector("#command > button");
                    yield page.click("#command > button");
                    // TODO: Save case file
                    const caseFileInfo = yield this.getCaseFileInfo(page);
                    const caseFileBinacles = yield this.extractPnlSeguimientoData(page);
                    console.log(caseFileInfo);
                    console.log(caseFileBinacles);
                    yield page.close();
                }
                catch (error) {
                    console.error(`Error processing case file ${caseFile.number_case_file}: ${error}`);
                }
            }
            // await browser.close();
        });
    }
}
exports.JudicialBinacleService = JudicialBinacleService;
