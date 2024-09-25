"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameFile = void 0;
const fs_1 = __importDefault(require("fs"));
const renameFile = async (oldPath, newPath) => {
    fs_1.default.renameSync(oldPath, newPath);
};
exports.renameFile = renameFile;
