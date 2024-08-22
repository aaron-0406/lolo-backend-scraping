"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_2.default;
class JudicialCaseFileHasCollateralService {
    constructor() { }
    async findAllRelatedCaseFileAssingCollateral(numberCaseFile, collateralId, chb) {
        const codes = numberCaseFile.split("-");
        codes[2] = "%";
        const filterNumberCaseFile = codes.join("-");
        const judicialCaseFile = await models.JUDICIAL_CASE_FILE.findAll({
            include: {
                model: models.CLIENT,
                as: "client",
                attributes: ["id", "name"],
            },
            where: {
                numberCaseFile: {
                    [sequelize_1.Op.like]: filterNumberCaseFile,
                },
                customer_has_bank_id: chb,
            },
        });
        const judicialCollaterals = await models.JUDICIAL_CASE_FILE_HAS_COLLATERAL.findAll({
            where: {
                judicialCollateralId: collateralId,
            },
        });
        if (!judicialCaseFile) {
            throw boom_1.default.notFound("Expediente no encontrado");
        }
        const currentCaseFileHasCollaterals = judicialCollaterals.map((collateral) => collateral.dataValues);
        const judicialCaseFiles = judicialCaseFile.map((judicialCaseFile) => judicialCaseFile.dataValues);
        const judicialCaseFilesWithCollateral = judicialCaseFiles.map((judicialCaseFile) => {
            const collateral = currentCaseFileHasCollaterals.some((currentCaseFileHasCollateral) => currentCaseFileHasCollateral.judicialCaseFileId ===
                judicialCaseFile.id);
            if (collateral) {
                return Object.assign(Object.assign({}, judicialCaseFile), { hasCollateral: true });
            }
            return Object.assign(Object.assign({}, judicialCaseFile), { hasCollateral: false });
        });
        return judicialCaseFilesWithCollateral;
    }
    async assingCollateralToCaseFile(data, collateralId) {
        if (!data.length) {
            throw boom_1.default.badRequest("La garantía debe estar asignada al menos a un expediente");
        }
        const judicialCollaterals = await models.JUDICIAL_CASE_FILE_HAS_COLLATERAL.findAll({
            where: {
                judicialCollateralId: collateralId,
                deletedAt: null,
            },
        });
        const currentJudicialCaseFileHasCollaterals = judicialCollaterals.map((judicialCollateral) => judicialCollateral.dataValues);
        // JudicialCaseFilesHasCollaterals
        const JudicialCaseFileHasCollateralsToDelete = currentJudicialCaseFileHasCollaterals.filter((currentCollateral) => !data.some((collateral) => collateral.judicialCaseFileId ===
            currentCollateral.judicialCaseFileId));
        const JudicialCaseFileHasCollateralsToCreate = data.filter((collateral) => !currentJudicialCaseFileHasCollaterals.some((currentCollateral) => currentCollateral.judicialCaseFileId ===
            collateral.judicialCaseFileId));
        const JudicialCaseFileHasCollateralWithoutChanges = currentJudicialCaseFileHasCollaterals.filter((data) => !JudicialCaseFileHasCollateralsToDelete.some((item) => item.id === data.id) &&
            !JudicialCaseFileHasCollateralsToCreate.some((item) => item.id === data.id));
        try {
            for (const collateral of JudicialCaseFileHasCollateralsToDelete) {
                await models.JUDICIAL_CASE_FILE_HAS_COLLATERAL.destroy({
                    where: {
                        judicialCaseFileId: collateral.judicialCaseFileId,
                        judicialCollateralId: collateralId,
                    },
                });
            }
            for (const newCollateral of JudicialCaseFileHasCollateralsToCreate) {
                await models.JUDICIAL_CASE_FILE_HAS_COLLATERAL.create(newCollateral);
            }
            return { JudicialCaseFileHasCollateralsToDelete, JudicialCaseFileHasCollateralsToCreate, JudicialCaseFileHasCollateralWithoutChanges, data };
        }
        catch (error) {
            throw error;
        }
    }
}
exports.default = JudicialCaseFileHasCollateralService;
