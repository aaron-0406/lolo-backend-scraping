"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBrowser = setupBrowser;
const puppeteer_extra_1 = require("../../../utils/puppeteer-extra");
async function setupBrowser(downloadPath) {
    const browser = await puppeteer_extra_1.puppeteerExtra.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        slowMo: 5,
    });
    return { browser };
}
