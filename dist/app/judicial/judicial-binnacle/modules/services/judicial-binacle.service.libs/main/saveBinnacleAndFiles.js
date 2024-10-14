"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveBinnacleAndFiles = void 0;
const sequelize_1 = __importDefault(require("../../../../../../../libs/sequelize"));
const { models } = sequelize_1.default;
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const processAndUploadFiles_1 = require("./processAndUploadFiles");
async function saveBinnacleAndFiles(caseFile, binnacle, binnacleTypes, proceduralStages) {
    var _a;
    const resolutionDate = (0, moment_timezone_1.default)(binnacle.resolutionDate, "DD/MM/YYYY HH:mm").isValid()
        ? moment_timezone_1.default.tz(binnacle.resolutionDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
        : null;
    const entryDate = (0, moment_timezone_1.default)(binnacle.entryDate, "DD/MM/YYYY HH:mm").isValid()
        ? moment_timezone_1.default.tz(binnacle.entryDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
        : null;
    const provedioDate = (0, moment_timezone_1.default)(binnacle.proveido, "DD/MM/YYYY HH:mm").isValid()
        ? moment_timezone_1.default.tz(binnacle.proveido, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
        : null;
    const binnacleType = binnacle.resolutionDate
        ? binnacleTypes.find((type) => type.dataValues.typeBinnacle === "RESOLUCION")
        : binnacleTypes.find((type) => type.dataValues.typeBinnacle === "ESCRITO");
    const proceduralStage = proceduralStages[0].dataValues.id;
    // Crea el registro del binnacle en la base de datos
    const judicialBinnacleData = await models.JUDICIAL_BINNACLE.create({
        judicialBinProceduralStageId: proceduralStage,
        lastPerformed: (_a = binnacle.sumilla) !== null && _a !== void 0 ? _a : '',
        binnacleTypeId: binnacleType === null || binnacleType === void 0 ? void 0 : binnacleType.dataValues.id,
        date: new Date(),
        judicialFileCaseId: caseFile.dataValues.id,
        customerHasBankId: caseFile.dataValues.customerHasBankId,
        index: binnacle.index,
        resolutionDate: resolutionDate,
        entryDate: entryDate,
        notificationType: binnacle.notificationType,
        acto: binnacle.acto,
        fojas: Number(binnacle.fojas),
        folios: Number(binnacle.folios),
        provedioDate: provedioDate,
        userDescription: binnacle.userDescription,
        createdBy: "BOT",
        totalTariff: 0,
        tariffHistory: "[]",
    });
    // Procesar archivos asociados al binnacle
    if (judicialBinnacleData) {
        await (0, processAndUploadFiles_1.processAndUploadFiles)(judicialBinnacleData, binnacle.index);
    }
}
exports.saveBinnacleAndFiles = saveBinnacleAndFiles;
