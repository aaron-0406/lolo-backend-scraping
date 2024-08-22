"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchPassword = exports.encryptPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Encrypting password function
const encryptPassword = async (password) => {
    const salt = await bcryptjs_1.default.genSalt(15);
    const hash = await bcryptjs_1.default.hash(password, salt);
    return hash;
};
exports.encryptPassword = encryptPassword;
// Compare password function
const matchPassword = async (password, savedPassword) => {
    try {
        return await bcryptjs_1.default.compare(password, savedPassword);
    }
    catch (error) {
        console.log(error);
        return false;
    }
};
exports.matchPassword = matchPassword;
