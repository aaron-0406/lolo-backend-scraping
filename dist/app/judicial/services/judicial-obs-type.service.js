"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class judicialObsTypeService {
    constructor() { }
    async findAll() {
        const rta = await models.JUDICIAL_OBS_TYPE.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_OBS_TYPE.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("tipos de observaciones no encontrados");
        }
        return rta;
    }
    async findByID(id) {
        const judicialObsType = await models.JUDICIAL_OBS_TYPE.findOne({
            where: {
                id_judicial_obs_type: id,
            },
        });
        if (!judicialObsType) {
            throw boom_1.default.notFound("tipo de observación no encontrado");
        }
        return judicialObsType;
    }
    async create(data) {
        const newJudicialObsType = await models.JUDICIAL_OBS_TYPE.create(data);
        return newJudicialObsType;
    }
    async update(id, changes) {
        const judicialObsType = await this.findByID(id);
        const oldJudicialObsType = Object.assign({}, judicialObsType.get());
        const newJudicialObsType = await judicialObsType.update(changes);
        return { oldJudicialObsType, newJudicialObsType };
    }
    async delete(id) {
        const judicialObsType = await this.findByID(id);
        const oldJudicialObsType = Object.assign({}, judicialObsType.get());
        await judicialObsType.destroy();
        return oldJudicialObsType;
    }
}
exports.default = judicialObsTypeService;
