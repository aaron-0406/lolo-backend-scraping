"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTree = exports.extractDate = exports.saveWordDocument = exports.sumarDias = exports.restarDias = exports.getLastDayOfWeek = exports.getFirstDayOfWeek = exports.sortDaysByDate = exports.formatDate = exports.isFileStoredIn = exports.renameFile = exports.deleteFile = void 0;
const docx_1 = require("docx");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
// Delete file function
const deleteFile = async (pathname, filename) => {
    try {
        await fs_extra_1.default.unlink(path_1.default.join(__dirname, pathname, filename));
    }
    catch (error) {
        console.log(error);
    }
};
exports.deleteFile = deleteFile;
const renameFile = async (pathname, filename, newFileName) => {
    try {
        await fs_extra_1.default.rename(path_1.default.join(__dirname, pathname, filename), path_1.default.join(__dirname, pathname, newFileName));
    }
    catch (error) {
        console.log(error);
    }
};
exports.renameFile = renameFile;
const isFileStoredIn = (dirname, filename) => {
    const files = fs_extra_1.default.readdirSync(dirname);
    return files.some((file) => file === filename);
};
exports.isFileStoredIn = isFileStoredIn;
const formatDate = (date, format = "YYYY-MM-DD") => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Obtener el mes (0-11) y sumarle 1 para obtener el mes en formato (01-12)
    const day = date.getDate(); // Obtener el día del mes (1-31) en formato (01-31)
    const formattedMonth = month < 10 ? `0${month}` : `${month}`;
    const formattedDay = day < 10 ? `0${day}` : `${day}`;
    if (format === "DD/MM/YYYY")
        return `${formattedDay}/${formattedMonth}/${year}`;
    return `${year}-${formattedMonth}-${formattedDay}`; // Formatear la fecha como "YYYY-MM-DD"
};
exports.formatDate = formatDate;
const sortDaysByDate = (array, field) => {
    return array.sort((a, b) => {
        const dateA = Date.parse(a[field]);
        const dateB = Date.parse(b[field]);
        if (dateA < dateB) {
            return -1;
        }
        else if (dateA > dateB) {
            return 1;
        }
        else {
            return 0;
        }
    });
};
exports.sortDaysByDate = sortDaysByDate;
const getFirstDayOfWeek = (today = new Date()) => {
    return new Date(today.setDate(today.getDate() - today.getDay() + 1));
};
exports.getFirstDayOfWeek = getFirstDayOfWeek;
const getLastDayOfWeek = (today = new Date()) => {
    return new Date(today.setDate(today.getDate() - today.getDay() + 7));
};
exports.getLastDayOfWeek = getLastDayOfWeek;
const restarDias = (date, quantityDays) => {
    const day = date.getTime();
    return new Date(day - 24 * 60 * 60 * 1000 * quantityDays);
};
exports.restarDias = restarDias;
const sumarDias = (date, quantityDays) => {
    const day = date.getTime();
    return new Date(day + 24 * 60 * 60 * 1000 * quantityDays);
};
exports.sumarDias = sumarDias;
const saveWordDocument = async (doc, templateName) => {
    const docName = `${new Date().getTime()} - ${templateName}.docx`;
    const buffer = await docx_1.Packer.toBuffer(doc);
    fs_extra_1.default.writeFileSync(path_1.default.join(__dirname, "../public/download", docName), buffer);
    return docName;
};
exports.saveWordDocument = saveWordDocument;
const extractDate = (date) => {
    const splited = date.split("-");
    return {
        day: Number(splited[2]),
        month: Number(splited[1]) - 1,
        year: Number(splited[0]),
    };
};
exports.extractDate = extractDate;
const buildTree = (permissions, codeLength) => {
    const newPermissions = permissions
        .map((item) => {
        return Object.assign(Object.assign({}, item), { permissions: permissions.filter((item2) => item2.code.startsWith(item.code) && item2.code !== item.code) });
    })
        .filter((item) => item.code.length === codeLength)
        .map((item) => {
        return Object.assign(Object.assign({}, item), { permissions: (0, exports.buildTree)(item.permissions, codeLength + 3) });
    });
    return newPermissions;
};
exports.buildTree = buildTree;
