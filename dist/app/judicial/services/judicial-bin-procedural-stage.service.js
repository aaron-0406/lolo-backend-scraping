"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialBinProceduralStageService {
    constructor() { }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.findAll({
            where: { customerHasBankId: chb },
        });
        return rta;
    }
    async findByID(id) {
        const judicialBinProceduralStage = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.findOne({
            where: {
                id,
            },
        });
        if (!judicialBinProceduralStage) {
            throw boom_1.default.notFound("Etapa Procesal no encontrada");
        }
        return judicialBinProceduralStage;
    }
    async create(data) {
        const newJudicialBinProceduralStage = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.create(data);
        return newJudicialBinProceduralStage;
    }
    async update(id, changes) {
        const judicialBinProceduralStage = await this.findByID(id);
        const oldData = Object.assign({}, judicialBinProceduralStage.get());
        const newData = (await judicialBinProceduralStage.update(changes)).dataValues;
        return { oldData, newData };
    }
    async delete(id) {
        const proceduralStage = await this.findByID(id);
        const oldData = Object.assign({}, proceduralStage.get());
        await proceduralStage.destroy();
        return { oldData };
    }
}
exports.default = JudicialBinProceduralStageService;
