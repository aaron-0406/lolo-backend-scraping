"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameDownloadedFile = renameDownloadedFile;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
async function renameDownloadedFile(oldPath, newName) {
    const newPath = path_1.default.join(path_1.default.dirname(oldPath), newName);
    fs_1.default.renameSync(oldPath, newPath);
}
