"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class FuncionarioService {
    constructor() { }
    async findAll() {
        const rta = await models.FUNCIONARIO.findAll({
            attributes: { exclude: ["bankId"] },
        });
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.FUNCIONARIO.findAll({
            attributes: { exclude: ["bankId"] },
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        return rta;
    }
    async findOne(id) {
        const funcionario = await models.FUNCIONARIO.findByPk(id, {
            attributes: { exclude: ["bankId"] },
        });
        if (!funcionario) {
            throw boom_1.default.notFound("Funcionario no encontrado");
        }
        return funcionario;
    }
    async create(data) {
        const newFuncionario = await models.FUNCIONARIO.create(data);
        return newFuncionario;
    }
    async update(id, changes) {
        const funcionario = await this.findOne(id);
        const oldFuncionario = Object.assign({}, funcionario.get());
        const newFuncionario = await funcionario.update(changes);
        return { oldFuncionario, newFuncionario };
    }
    async delete(id) {
        const funcionario = await this.findOne(id);
        const oldFuncionario = Object.assign({}, funcionario.get());
        await funcionario.destroy();
        return oldFuncionario;
    }
}
exports.default = FuncionarioService;
