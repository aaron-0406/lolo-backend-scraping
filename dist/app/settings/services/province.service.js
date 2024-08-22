"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ProvinceService {
    constructor() { }
    async findAll() {
        const rta = await models.PROVINCE.findAll();
        if (!rta) {
            throw boom_1.default.notFound("No existen provincias");
        }
        return rta;
    }
    async findAllByDepartment(departmentId) {
        const rta = await models.PROVINCE.findAll({
            where: {
                departmentId,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("No existen provincias");
        }
        return rta;
    }
    async create(data) {
        const newProvince = await models.PROVINCE.create(data);
        return newProvince;
    }
    async update(id, data) {
        const province = await models.PROVINCE.findByPk(id);
        if (!province) {
            throw boom_1.default.notFound("Provincia no encontrada");
        }
        await province.update(data);
        return province;
    }
    async delete(id) {
        const province = await models.PROVINCE.findByPk(id);
        if (!province) {
            throw boom_1.default.notFound("Provincia no encontrada");
        }
        await province.destroy();
        return { id };
    }
}
exports.default = ProvinceService;
