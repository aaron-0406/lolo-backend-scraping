"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class DepartmentService {
    constructor() { }
    async findAll() {
        const rta = await models.DEPARTMENT.findAll();
        if (!rta) {
            throw boom_1.default.notFound("No existen departamentos");
        }
        return rta;
    }
    async create(data) {
        const department = await models.DEPARTMENT.create(data);
        return department;
    }
    async update(id, data) {
        const department = await models.DEPARTMENT.findByPk(id);
        if (!department) {
            throw boom_1.default.notFound("Departamento no encontrado");
        }
        await department.update(data);
        return department;
    }
    async delete(id) {
        const department = await models.DEPARTMENT.findByPk(id);
        if (!department) {
            throw boom_1.default.notFound("Departamento no encontrado");
        }
        await department.destroy();
        return { id };
    }
}
exports.default = DepartmentService;
