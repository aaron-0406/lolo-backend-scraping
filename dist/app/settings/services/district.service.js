"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class DistrictService {
    constructor() { }
    async findAll() {
        const rta = await models.DISTRICT.findAll();
        if (!rta) {
            throw boom_1.default.notFound("No existen distritos");
        }
        return rta;
    }
    async findAllByProvince(provinceId) {
        const rta = await models.DISTRICT.findAll({
            where: {
                provinceId,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("No existen distritos");
        }
        return rta;
    }
    async create(data) {
        const newDistrict = await models.DISTRICT.create(data);
        return newDistrict;
    }
    async update(id, data) {
        const district = await models.DISTRICT.findByPk(id);
        if (!district) {
            throw boom_1.default.notFound("Distrito no encontrado");
        }
        await district.update(data);
        return district;
    }
    async delete(id) {
        const district = await models.DISTRICT.findByPk(id);
        if (!district) {
            throw boom_1.default.notFound("Distrito no encontrado");
        }
        await district.destroy();
        return { id };
    }
}
exports.default = DistrictService;
