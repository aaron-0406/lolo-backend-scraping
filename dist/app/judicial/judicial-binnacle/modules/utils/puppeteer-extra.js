"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_recaptcha_1 = __importDefault(require("puppeteer-extra-plugin-recaptcha"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_recaptcha_1.default)({
    provider: {
        id: "2captcha",
        token: process.env.RECAPTCHA_TOKEN,
    }
}));
exports.default = puppeteer_extra_1.default;
