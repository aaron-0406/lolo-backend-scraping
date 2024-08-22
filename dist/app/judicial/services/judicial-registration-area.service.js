"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialRegistrationAreaService {
    constructor() { }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_REGISTRATION_AREA.findAll({
            where: { customerHasBankId: chb },
        });
        return rta;
    }
    async findByID(id) {
        const judicialRegistrationArea = await models.JUDICIAL_REGISTRATION_AREA.findOne({
            where: {
                id,
            },
        });
        if (!judicialRegistrationArea) {
            throw boom_1.default.notFound("Zona Registral no encontrada");
        }
        return judicialRegistrationArea;
    }
    async create(data) {
        const newJudicialRegistrationArea = await models.JUDICIAL_REGISTRATION_AREA.create(data);
        return newJudicialRegistrationArea;
    }
    async update(id, changes) {
        const judicialRegistrationArea = await this.findByID(id);
        const oldJudicialRegistrationArea = Object.assign({}, judicialRegistrationArea.get());
        const newJudicialRegistrationArea = await judicialRegistrationArea.update(changes);
        return { oldJudicialRegistrationArea, newJudicialRegistrationArea };
    }
    async delete(id) {
        const registrationArea = await this.findByID(id);
        const oldJudicialRegistrationArea = Object.assign({}, registrationArea.get());
        await registrationArea.destroy();
        return oldJudicialRegistrationArea;
    }
}
exports.default = JudicialRegistrationAreaService;
