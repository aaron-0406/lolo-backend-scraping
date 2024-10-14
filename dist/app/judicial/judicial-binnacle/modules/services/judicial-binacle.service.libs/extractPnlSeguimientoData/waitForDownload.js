"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForDownload = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function waitForDownload(downloadPath, startTime, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            const files = fs_1.default.readdirSync(downloadPath);
            const newFiles = files.filter((file) => {
                const filePath = path_1.default.join(downloadPath, file);
                const stats = fs_1.default.statSync(filePath);
                return stats.mtimeMs > startTime && (file.endsWith(".pdf") || file.endsWith(".doc")) && !file.endsWith(".crdownload");
            });
            if (newFiles.length > 0) {
                clearInterval(interval);
                resolve(path_1.default.join(downloadPath, newFiles[0]));
            }
        }, 1000);
        const timeoutId = setTimeout(() => {
            clearInterval(interval);
            reject(new Error("La descarga ha excedido el tiempo límite."));
        }, timeout);
    });
}
exports.waitForDownload = waitForDownload;
