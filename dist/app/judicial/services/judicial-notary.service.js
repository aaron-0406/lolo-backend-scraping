"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialNotaryService {
    constructor() { }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_NOTARY.findAll({
            where: { customerHasBankId: chb },
        });
        return rta;
    }
    async findByID(id) {
        const judicialNotary = await models.JUDICIAL_NOTARY.findOne({
            where: {
                id,
            },
        });
        if (!judicialNotary) {
            throw boom_1.default.notFound("Notaria no encontrada");
        }
        return judicialNotary;
    }
    async create(data) {
        const newJudicialNotary = await models.JUDICIAL_NOTARY.create(data);
        return newJudicialNotary;
    }
    async update(id, changes) {
        const judicialNotary = await this.findByID(id);
        const oldJudicialNotary = Object.assign({}, judicialNotary.get());
        const newJudicialNotary = await judicialNotary.update(changes);
        return { oldJudicialNotary, newJudicialNotary };
    }
    async delete(id) {
        const notary = await this.findByID(id);
        const oldJudicialNotary = Object.assign({}, notary.get());
        await notary.destroy();
        return oldJudicialNotary;
    }
}
exports.default = JudicialNotaryService;
