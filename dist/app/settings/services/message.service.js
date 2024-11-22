"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const customer_has_bank_service_1 = __importDefault(require("../../dash/services/customer-has-bank.service"));
const service = new customer_has_bank_service_1.default();
const { models } = sequelize_1.default;
class MessageService {
    constructor() { }
    async findAll(customerId) {
        const data = await service.findAllByCustomerId(customerId);
    }
    async create(data) {
        try {
            const newMessage = await models.MESSAGE.create(data);
            return newMessage;
        }
        catch (e) {
            console.log(e);
        }
    }
    async update(id, data) {
        const message = await models.MESSAGE.findByPk(id);
        if (!message) {
            throw boom_1.default.notFound("Message no encontrada");
        }
        await message.update(data);
        return message;
    }
    async delete(id) {
        const message = await models.MESSAGE.findByPk(id);
        if (!message) {
            throw boom_1.default.notFound("Message no encontrada");
        }
        await message.destroy();
        return { id };
    }
}
exports.default = MessageService;
