"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialUseOfPropertyService {
    constructor() { }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_USE_OF_PROPERTY.findAll({
            where: { customerHasBankId: chb },
        });
        return rta;
    }
    async findByID(id) {
        const judicialUseOfProperty = await models.JUDICIAL_USE_OF_PROPERTY.findOne({
            where: {
                id,
            },
        });
        if (!judicialUseOfProperty) {
            throw boom_1.default.notFound("Uso del Bien no encontrada");
        }
        return judicialUseOfProperty;
    }
    async create(data) {
        const newJudicialUseOfProperty = await models.JUDICIAL_USE_OF_PROPERTY.create(data);
        return newJudicialUseOfProperty;
    }
    async update(id, changes) {
        const judicialUseOfProperty = await this.findByID(id);
        const oldJudicialUseOfProperty = Object.assign({}, judicialUseOfProperty.get());
        const newJudicialUseOfProperty = await judicialUseOfProperty.update(changes);
        return { oldJudicialUseOfProperty, newJudicialUseOfProperty };
    }
    async delete(id) {
        const useOfProperty = await this.findByID(id);
        const oldJudicialUseOfProperty = Object.assign({}, useOfProperty.get());
        await useOfProperty.destroy();
        return oldJudicialUseOfProperty;
    }
}
exports.default = JudicialUseOfPropertyService;
