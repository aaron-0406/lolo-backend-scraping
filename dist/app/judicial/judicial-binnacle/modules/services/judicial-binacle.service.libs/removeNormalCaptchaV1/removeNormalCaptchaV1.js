"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeNormalCaptchaV1 = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
async function removeNormalCaptchaV1({ page, solver }) {
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
    const captchaDir = path_1.default.resolve(__dirname, '../../../../../public/captchas');
    // Verifica si la carpeta existe, si no, la crea
    if (!fs_1.default.existsSync(captchaDir)) {
        fs_1.default.mkdirSync(captchaDir, { recursive: true });
    }
    const screenshotFile = path_1.default.join(captchaDir, `captcha-${boundingBox.x}-${boundingBox.y}-${boundingBox.width}-${boundingBox.height}.png`);
    await page.screenshot({
        path: screenshotFile,
        clip: {
            x: boundingBox.x,
            y: boundingBox.y + boundingBox.y / 2,
            width: boundingBox.width,
            height: boundingBox.height,
        },
    });
    if (!fs_1.default.existsSync(screenshotFile)) {
        console.log("No captured screenshot");
        return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
    }
    try {
        // const { stdout, stderr } = await execAsync(
        //   `python3 ${PYTHON_SCRIPT_PATH} ${screenshotFile}`
        // );
        // console.log("stdout", stdout);
        // console.log("stderr", stderr);
        const imageBuffer = fs_1.default.readFileSync(screenshotFile);
        // Convierte el Buffer a base64 y añade el prefijo
        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        const { data, id } = await solver.imageCaptcha({
            body: base64Image,
            numeric: 4,
            min_len: 4,
            max_len: 5
        });
        if (!data) {
            console.error(`Error en el script de Python: ${!data}`);
            return { isSolved: false, isCasFileTrue: true, isBotDetected: false };
        }
        // const replaceStdout = data.replace(/'/g, '"');
        // const parsedStdout = JSON.parse(replaceStdout);
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
            console.log("Case file last", caseFileExist);
            console.log("Captcha last", isCorrectCaptcha);
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
                return [true, true, true];
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
                return [true, true, true];
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
exports.removeNormalCaptchaV1 = removeNormalCaptchaV1;
