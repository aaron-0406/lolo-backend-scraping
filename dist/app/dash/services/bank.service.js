"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class BankService {
    constructor() { }
    async findAll() {
        const rta = await models.BANK.findAll();
        return rta;
    }
    async findOne(id) {
        const bank = await models.BANK.findByPk(id);
        if (!bank) {
            throw boom_1.default.notFound("Banco no encontrado");
        }
        return bank;
    }
    async create(data) {
        const newBank = await models.BANK.create(data);
        return newBank;
    }
    async update(id, changes) {
        const bank = await this.findOne(id);
        const rta = await bank.update(changes);
        return rta;
    }
    async delete(id) {
        const bank = await this.findOne(id);
        await bank.destroy();
        return { id };
    }
}
exports.default = BankService;
