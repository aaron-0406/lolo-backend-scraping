"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBrowser = void 0;
const puppeteer_extra_1 = require("../utils/puppeteer-extra");
async function setupBrowser() {
    const browser = await puppeteer_extra_1.puppeteerExtra.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        slowMo: 5,
    });
    return { browser };
}
exports.setupBrowser = setupBrowser;
