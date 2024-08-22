"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archivosCollateral = exports.archivosExcel = exports.archivosBinnacle = exports.archivos = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
// Middleware for files
const storageArchivos = multer_1.default.diskStorage({
    destination: path_1.default.join(__dirname, "../public/docs"),
    filename: (req, file, cb) => {
        const uuid = (0, uuid_1.v4)();
        cb(null, `${uuid}${file.originalname}`);
    },
});
const storageArchivosBinnacle = multer_1.default.diskStorage({
    destination: path_1.default.join(__dirname, "../public/docs"),
    filename: (req, file, cb) => {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const name_origin_aws = `${month}-${year}-${file.originalname}`;
        cb(null, `${name_origin_aws}`);
    },
});
// Filter documents
const filterDocuments = async (req, file, cb) => {
    const filetypes = /DOC|doc|DOCX|docx|xls|XLS|XLSX|xlsx|ppt|PPT|PPTX|pptx|PDF|pdf|vnd.ms-excel/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path_1.default.extname(file.originalname));
    if (mimetype && extname)
        return cb(null, true);
    cb("Archivo debe ser un documento docx,xlsx,pptx,pdf.");
};
// *EXCEL FILES
// Middleware for files
const storageExcelArchivos = multer_1.default.diskStorage({
    destination: path_1.default.join(__dirname, "../docs"),
    filename: (req, file, cb) => {
        req.body.file = file.originalname;
        cb(null, `${file.originalname}`);
    },
});
// Filter documents
const filterExcelDocuments = async (req, file, cb) => {
    const filetypes = /xls|XLS|XLSX|xlsx|vnd.ms-excel/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path_1.default.extname(file.originalname));
    if (mimetype || extname)
        return cb(null, true);
    cb("Archivo debe ser un documento excel");
};
exports.archivos = (0, multer_1.default)({
    storage: storageArchivos,
    fileFilter: filterDocuments,
});
exports.archivosBinnacle = (0, multer_1.default)({
    storage: storageArchivosBinnacle,
});
exports.archivosExcel = (0, multer_1.default)({
    storage: storageExcelArchivos,
    fileFilter: filterExcelDocuments,
});
exports.archivosCollateral = (0, multer_1.default)({
    storage: storageArchivos,
});
