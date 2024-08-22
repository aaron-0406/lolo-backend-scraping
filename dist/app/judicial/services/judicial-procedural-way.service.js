"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialProceduralWayService {
    constructor() { }
    async findAll() {
        const rta = await models.JUDICIAL_PROCEDURAL_WAY.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_PROCEDURAL_WAY.findAll({
            where: { customerHasBankId: chb },
        });
        return rta;
    }
    async findByID(id) {
        const judicialProceduralWay = await models.JUDICIAL_PROCEDURAL_WAY.findOne({
            where: {
                id,
            },
        });
        if (!judicialProceduralWay)
            throw boom_1.default.notFound("Vía procedimental no encontrada");
        return judicialProceduralWay;
    }
    async create(data) {
        const newJudicialProceduralWay = await models.JUDICIAL_PROCEDURAL_WAY.create(data);
        return newJudicialProceduralWay;
    }
    async update(id, changes) {
        const judicialProceduralWay = await this.findByID(id);
        const oldJudicialProceduralWay = Object.assign({}, judicialProceduralWay.get());
        const newJudicialProceduralWay = await judicialProceduralWay.update(changes);
        return { oldJudicialProceduralWay, newJudicialProceduralWay };
    }
    async delete(id) {
        const judicialProceduralWay = await this.findByID(id);
        const oldJudicialProceduralWay = Object.assign({}, judicialProceduralWay.get());
        await judicialProceduralWay.destroy();
        return oldJudicialProceduralWay;
    }
}
exports.default = JudicialProceduralWayService;
