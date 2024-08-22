"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialCollateralService {
    constructor() { }
    async findAllCollateralByCaseFile(judicialCaseFileId) {
        const rta = await models.JUDICIAL_CASE_FILE_HAS_COLLATERAL.findAll({
            where: { judicialCaseFileId },
            include: [
                {
                    model: models.JUDICIAL_COLLATERAL,
                    as: "judicialCollateral",
                    where: {
                        deletedAt: null,
                    },
                },
            ],
        });
        const collaterals = rta.map((item) => item.dataValues.judicialCollateral);
        return collaterals;
    }
    async findByID(id) {
        const judicialCollateral = await models.JUDICIAL_COLLATERAL.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: models.JUDICIAL_USE_OF_PROPERTY,
                    as: "useOfProperty",
                    attributes: ["id", "name"],
                },
                {
                    model: models.JUDICIAL_REGISTRATION_AREA,
                    as: "registrationArea",
                    attributes: ["id", "name"],
                },
                {
                    model: models.JUDICIAL_NOTARY,
                    as: "notary",
                    attributes: ["id", "name"],
                },
                {
                    model: models.JUDICIAL_REGISTER_OFFICE,
                    as: "registerOffice",
                    attributes: ["id", "name"],
                },
                {
                    model: models.DEPARTMENT,
                    as: "department",
                    attributes: ["id", "name"],
                },
                {
                    model: models.PROVINCE,
                    as: "province",
                    attributes: ["id", "name"],
                },
                {
                    model: models.DISTRICT,
                    as: "district",
                    attributes: ["id", "name"],
                },
            ],
        });
        if (!judicialCollateral) {
            throw boom_1.default.notFound("Collateral no encontrado");
        }
        return judicialCollateral;
    }
    async create(data, judicialCaseFileid) {
        const newJudicialCollateral = await models.JUDICIAL_COLLATERAL.create(data);
        if (newJudicialCollateral)
            await models.JUDICIAL_CASE_FILE_HAS_COLLATERAL.create({
                judicialCollateralId: newJudicialCollateral.dataValues.id,
                judicialCaseFileId: judicialCaseFileid,
            });
        return newJudicialCollateral;
    }
    async update(id, changes) {
        const judicialCollateral = await this.findByID(id);
        const oldJudicialCollateral = Object.assign({}, judicialCollateral.get());
        const newJudicialCollateral = await judicialCollateral.update(changes);
        return { oldJudicialCollateral, newJudicialCollateral };
    }
    async delete(id) {
        const collateral = await this.findByID(id);
        const oldJudicialCollateral = Object.assign({}, collateral.get());
        await collateral.destroy();
        return oldJudicialCollateral;
    }
}
exports.default = JudicialCollateralService;
