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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.puppeteerExtra = exports.solver = void 0;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
exports.puppeteerExtra = puppeteer_extra_1.default;
const puppeteer_extra_plugin_recaptcha_1 = __importDefault(require("puppeteer-extra-plugin-recaptcha"));
const TwoCaptcha = __importStar(require("@2captcha/captcha-solver"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_recaptcha_1.default)({
    provider: {
        id: "2captcha",
        token: process.env.RECAPTCHA_TOKEN,
    }
}));
if (!TwoCaptcha.Solver) {
    throw new Error("Solver is undefined. Please check the @2captcha/captcha-solver import.");
}
const solver = new TwoCaptcha.Solver(process.env.RECAPTCHA_TOKEN, 10);
exports.solver = solver;
