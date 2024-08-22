"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class judicialSedeService {
    constructor() { }
    async findAll() {
        const rta = await models.JUDICIAL_SEDE.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_SEDE.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("Sedes judiciales no encontradas");
        }
        return rta;
    }
    async findByID(id) {
        const judicialSede = await models.JUDICIAL_SEDE.findOne({
            where: {
                id_judicial_sede: id,
            },
        });
        if (!judicialSede) {
            throw boom_1.default.notFound("Sede judicial no encontrada");
        }
        return judicialSede;
    }
    async create(data) {
        const newJudicialSede = await models.JUDICIAL_SEDE.create(data);
        return newJudicialSede;
    }
    async update(id, changes) {
        const judicialSede = await this.findByID(id);
        const oldJudicialSede = Object.assign({}, judicialSede.get());
        const newJudicialSede = await judicialSede.update(changes);
        return { oldJudicialSede, newJudicialSede };
    }
    async delete(id) {
        const judicialSede = await this.findByID(id);
        const oldJudicialSede = Object.assign({}, judicialSede.get());
        await judicialSede.destroy();
        return oldJudicialSede;
    }
}
exports.default = judicialSedeService;
