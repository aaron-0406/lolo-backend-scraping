"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class CityService {
    constructor() { }
    async findAll(customerId) {
        const rta = await models.CITY.findAll({
            where: {
                customer_id_customer: customerId,
            },
        });
        return rta;
    }
    async findOne(id) {
        const city = await models.CITY.findByPk(id);
        if (!city) {
            throw boom_1.default.notFound("Ciudad no encontrada");
        }
        return city;
    }
    async create(data) {
        const newCity = await models.CITY.create(data);
        return newCity;
    }
    async update(id, changes) {
        const city = await this.findOne(id);
        const rta = await city.update(changes);
        return rta;
    }
    async delete(id) {
        const city = await this.findOne(id);
        await city.destroy();
        return { id };
    }
}
exports.default = CityService;
