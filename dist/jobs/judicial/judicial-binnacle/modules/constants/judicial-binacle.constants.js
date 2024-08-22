"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PYTHON_SCRIPT_PATH = exports.JEC_URL = exports.JUDICIAL_BINACLE_API_KEY = void 0;
const path_1 = __importDefault(require("path"));
exports.JUDICIAL_BINACLE_API_KEY = process.env.JUDICIAL_BINACLE_API_KEY;
exports.JEC_URL = "https://cej.pj.gob.pe/cej/forms/busquedaform.html";
exports.PYTHON_SCRIPT_PATH = path_1.default.join(__dirname, "../scripts/solve-text-captcha-2captcha.py");
