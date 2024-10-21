"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.judicialCaseFileService = void 0;
const setupBrowser_1 = require("../libs/setupBrowser");
class judicialCaseFileService {
    constructor() { }
    async currencyExchange() {
        const { browser } = await (0, setupBrowser_1.setupBrowser)();
        const page = await browser.newPage();
        const firstValue = "100";
        await page.goto("https://www.google.com/search?q=soles+a+dolares");
        //? First input
        await page.waitForSelector("#knowledge-currency__updatable-data-column > div.ePzRBb > div > div.vLqKYe.egcvbb.q0WxUd > input");
        //? Second input
        await page.waitForSelector("#knowledge-currency__updatable-data-column > div.ePzRBb > div > div.MWvIVe.egcvbb > input");
        //? fill first input
        await page.locator("#knowledge-currency__updatable-data-column > div.ePzRBb > div > div.vLqKYe.egcvbb.q0WxUd > input").fill(firstValue);
    }
}
exports.judicialCaseFileService = judicialCaseFileService;
