"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialRegisterOfficeService {
    constructor() { }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_REGISTER_OFFICE.findAll({
            where: { customerHasBankId: chb },
        });
        return rta;
    }
    async findByID(id) {
        const judicialRegisterOffice = await models.JUDICIAL_REGISTER_OFFICE.findOne({
            where: {
                id,
            },
        });
        if (!judicialRegisterOffice) {
            throw boom_1.default.notFound("Oficina registral no encontrada");
        }
        return judicialRegisterOffice;
    }
    async create(data) {
        const newJudicialRegisterOffice = await models.JUDICIAL_REGISTER_OFFICE.create(data);
        return newJudicialRegisterOffice;
    }
    async update(id, changes) {
        const judicialRegisterOffice = await this.findByID(id);
        const oldJudicialRegisterOffice = Object.assign({}, judicialRegisterOffice.get());
        const newJudicialRegisterOffice = await judicialRegisterOffice.update(changes);
        return { oldJudicialRegisterOffice, newJudicialRegisterOffice };
    }
    async delete(id) {
        const registerOffice = await this.findByID(id);
        const oldJudicialRegisterOffice = Object.assign({}, registerOffice.get());
        await registerOffice.destroy();
        return oldJudicialRegisterOffice;
    }
}
exports.default = JudicialRegisterOfficeService;
