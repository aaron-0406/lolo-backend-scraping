"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFolderContents = void 0;
const fs_1 = __importDefault(require("fs"));
const deleteFolderContents = async (folderPath) => {
    if (fs_1.default.existsSync(folderPath)) {
        console.log("Eliminando todo el contenido de la carpeta:", folderPath);
        await fs_1.default.promises.rm(folderPath, { recursive: true, force: true });
        console.log("Carpeta eliminada con éxito");
    }
    else {
        console.log("La carpeta no existe:", folderPath);
    }
};
exports.deleteFolderContents = deleteFolderContents;
