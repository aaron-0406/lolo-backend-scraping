"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNavigateCaseFile = void 0;
const judicial_binacle_constants_1 = require("../../../constants/judicial-binacle.constants");
const case_file_decoder_1 = require("../../../utils/case-file-decoder");
const puppeteer_extra_1 = require("../../../utils/puppeteer-extra");
const removeNormalCaptchaV2_SR_1 = require("../removeNormalCaptchaV2-SR/removeNormalCaptchaV2-SR");
async function validateAndNavigateCaseFile(page, caseFile) {
    await page.goto(judicial_binacle_constants_1.JEC_URL);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // if (page.url() !== JEC_URL) {
        //   await removeHCaptcha(page);
        // }
        const numberCaseFile = (0, case_file_decoder_1.caseFileNumberDecoder)(caseFile.dataValues.numberCaseFile);
        const { isSolved, isCasFileTrue, isBotDetected } = await (0, removeNormalCaptchaV2_SR_1.removeNormalCaptchaV2SR)({ page, solver: puppeteer_extra_1.solver, numberCaseFile });
        // const { isSolved, isCasFileTrue, isBotDetected } = await removeNormalCaptchaV1({ page, solver });
        if (isSolved && isCasFileTrue && !isBotDetected) {
            return true;
        }
        else if (!isCasFileTrue) {
            return false;
        }
    }
    return false;
}
exports.validateAndNavigateCaseFile = validateAndNavigateCaseFile;
