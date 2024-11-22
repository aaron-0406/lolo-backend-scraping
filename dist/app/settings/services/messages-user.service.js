"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesUserService = void 0;
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const { models } = sequelize_1.default;
class MessagesUserService {
    constructor() { }
    async findAll(messageId) {
        const data = await models.MESSAGES_USERS.findAll({
            where: {
                messageId,
            },
        });
        return data;
    }
    async create(data) {
        const newMessage = await models.MESSAGES_USERS.create(data);
        return newMessage;
    }
    async update(id, data) {
        const message = await models.MESSAGES_USERS.findByPk(id);
        if (!message) {
            throw new Error("Message no encontrada");
        }
        await message.update(data);
        return message;
    }
    async delete(id) {
        const message = await models.MESSAGES_USERS.findByPk(id);
        if (!message) {
            throw new Error("Message no encontrada");
        }
        await message.destroy();
        return { id };
    }
}
exports.MessagesUserService = MessagesUserService;
