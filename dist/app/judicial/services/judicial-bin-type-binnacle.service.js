"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialBinTypeBinnacleService {
    constructor() { }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_BIN_TYPE_BINNACLE.findAll({
            where: { customerHasBankId: chb },
        });
        return rta;
    }
    async findByID(id) {
        const judicialBinTypeBinnacle = await models.JUDICIAL_BIN_TYPE_BINNACLE.findOne({
            where: {
                id,
            },
        });
        if (!judicialBinTypeBinnacle) {
            throw boom_1.default.notFound("Tipo de Bitacora Judicial no encontrada");
        }
        return judicialBinTypeBinnacle;
    }
    async create(data) {
        const newJudicialBinTypeBinnacle = await models.JUDICIAL_BIN_TYPE_BINNACLE.create(data);
        return newJudicialBinTypeBinnacle;
    }
    async update(id, changes) {
        const judicialBinTypeBinnacle = await this.findByID(id);
        const oldJudicialBinTypeBinnacle = Object.assign({}, judicialBinTypeBinnacle.get());
        const newJudicialBinTypeBinnacle = await judicialBinTypeBinnacle.update(changes);
        return { oldJudicialBinTypeBinnacle, newJudicialBinTypeBinnacle };
    }
    async delete(id) {
        const judicialBinTypeBinnacle = await this.findByID(id);
        const oldJudicialBinTypeBinnacle = Object.assign({}, judicialBinTypeBinnacle.get());
        await judicialBinTypeBinnacle.destroy();
        return oldJudicialBinTypeBinnacle;
    }
}
exports.default = JudicialBinTypeBinnacleService;
