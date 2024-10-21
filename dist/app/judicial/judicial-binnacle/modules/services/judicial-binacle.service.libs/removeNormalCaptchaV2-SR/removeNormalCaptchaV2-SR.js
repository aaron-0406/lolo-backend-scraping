"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeNormalCaptchaV2SR = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const judicial_binacle_constants_1 = require("../../../constants/judicial-binacle.constants");
const removeHCaptcha_1 = require("../removeHCaptcha/removeHCaptcha");
async function removeNormalCaptchaV2SR({ page, solver }) {
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
    const captchaDir = path_1.default.resolve(__dirname, '../../../../../public/audio-captchas');
    // Verifica si la carpeta existe, si no, la crea
    if (!fs_1.default.existsSync(captchaDir)) {
        fs_1.default.mkdirSync(captchaDir, { recursive: true });
    }
    try {
        let data = "";
        try {
            const value = await page.locator("#btnRepro").scroll({
                scrollTop: -30,
            }).then(async () => {
                await page.locator("#btnRepro").click();
                await new Promise(resolve => setTimeout(resolve, 5000));
                if (page.url() !== judicial_binacle_constants_1.JEC_URL)
                    await (0, removeHCaptcha_1.removeHCaptcha)(page);
                const valueCaptcha = await page.evaluate(() => {
                    const inputAudio = document.getElementById("1zirobotz0");
                    return inputAudio === null || inputAudio === void 0 ? void 0 : inputAudio.value;
                });
                return valueCaptcha;
            });
            data = value !== "NULL" ? value : 'NOT FOUND';
            console.log(`El valor del captcha es: ${value}`);
        }
        catch (error) {
            console.error('Error al esperar el selector del input:', error);
        }
        await page.locator('input[id="codigoCaptcha"]').fill(data);
        await page.click("#consultarExpedientes").then(async () => {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            // await page.waitForSelector("#mensajeNoExisteExpedientes");
            // await page.waitForSelector("#codCaptchaError");
            const isCorrectCaptcha = await page.evaluate(() => {
                const errElement = document.getElementById("codCaptchaError");
                return errElement === null || errElement === void 0 ? void 0 : errElement.style;
                if ((errElement === null || errElement === void 0 ? void 0 : errElement.style["0"]) === "display" || !(errElement === null || errElement === void 0 ? void 0 : errElement.style["0"])) {
                    isSolved = true;
                    return errElement === null || errElement === void 0 ? void 0 : errElement.style;
                }
                else {
                    isSolved = false;
                    return errElement === null || errElement === void 0 ? void 0 : errElement.style;
                }
            });
            const caseFileExist = await page.evaluate(() => {
                const errElement = document.getElementById("mensajeNoExisteExpedientes");
                return errElement === null || errElement === void 0 ? void 0 : errElement.style;
                if ((errElement === null || errElement === void 0 ? void 0 : errElement.style["0"]) === "display" || !(errElement === null || errElement === void 0 ? void 0 : errElement.style["0"])) {
                    isCasFileTrue = true;
                    return errElement === null || errElement === void 0 ? void 0 : errElement.style;
                }
                else {
                    isCasFileTrue = false;
                    return errElement === null || errElement === void 0 ? void 0 : errElement.style;
                }
            });
            const botDetected = await page.evaluate(() => {
                const errElement = document.getElementById("custom_footer");
                return errElement === null || errElement === void 0 ? void 0 : errElement.style;
            });
            console.log("Case file last", caseFileExist);
            console.log("Captcha last", isCorrectCaptcha);
            console.log("Bot detected", botDetected);
        });
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(2000);
        // [isCasFileTrue, isSolved] = await Promise.all([
        //   page.evaluate(() => {
        //     const errElement = document.getElementById("mensajeNoExisteExpedientes");
        //     if (errElement?.style["0"] === "display" || !errElement?.style["0"] ) return true;
        //     return false;
        //   }),
        //   page.evaluate(() => {
        //     const errorCaptcha = document.getElementById("codCaptchaError");
        //     if (errorCaptcha?.style["0"] === "display" || !errorCaptcha?.style["0"] ) return true;
        //     return false;
        //   }),
        //   // page.evaluate(() => {
        //   //   const botDetected = document.getElementById("captcha-bot-detected");
        //   //   if(!botDetected) return true;
        //   //   return false
        //   // }),
        // ]);
        [isCasFileTrue, isSolved, isBotDetected] = await page.evaluate(() => {
            const errElement = document.getElementById("mensajeNoExisteExpedientes");
            const errorCaptcha = document.getElementById("codCaptchaError");
            if (!(typeof (errElement === null || errElement === void 0 ? void 0 : errElement.style) === "object") &&
                !(typeof (errorCaptcha === null || errorCaptcha === void 0 ? void 0 : errorCaptcha.style) === "object")) {
                return [true, true, false];
            }
            ;
            if (typeof (errElement === null || errElement === void 0 ? void 0 : errElement.style) === "object" &&
                typeof (errorCaptcha === null || errorCaptcha === void 0 ? void 0 : errorCaptcha.style) === "object" &&
                (errElement === null || errElement === void 0 ? void 0 : errElement.style["0"]) === "display" &&
                (errElement === null || errElement === void 0 ? void 0 : errElement.style["1"]) === "color")
                return [true, false, false];
            if (typeof (errElement === null || errElement === void 0 ? void 0 : errElement.style) === "object" &&
                typeof (errorCaptcha === null || errorCaptcha === void 0 ? void 0 : errorCaptcha.style) === "object" &&
                (errElement === null || errElement === void 0 ? void 0 : errElement.style["0"]) === "color" &&
                (errorCaptcha === null || errorCaptcha === void 0 ? void 0 : errorCaptcha.style["0"]) === "display") {
                return [false, true, false];
            }
            else
                return [true, true, false];
        }),
            // page.evaluate(() => {
            //   const botDetected = document.getElementById("captcha-bot-detected");
            //   if(!botDetected) return true;
            //   return false
            // }),
            console.log("isBotDetected:", isBotDetected, "isSolved:", isSolved, "isCasFileTrue:", isCasFileTrue);
        return { isSolved, isCasFileTrue, isBotDetected };
    }
    catch (error) {
        console.error(`Error executing Python script: ${error.message}`);
        return { isSolved: false, isCasFileTrue: true, isBotDetected: false };
    }
}
exports.removeNormalCaptchaV2SR = removeNormalCaptchaV2SR;
