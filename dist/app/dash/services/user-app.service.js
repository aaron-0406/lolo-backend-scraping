"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const bcrypt_1 = require("../../../libs/bcrypt");
const { models } = sequelize_1.default;
class CustomerUserService {
    constructor() { }
    async findAll() {
        const rta = await models.USER_APP.findAll();
        return rta;
    }
    async findOne(id) {
        const user = await models.USER_APP.findByPk(id);
        if (!user) {
            throw boom_1.default.notFound("Usuario no encontrado");
        }
        return user;
    }
    async create(data) {
        data.password = await (0, bcrypt_1.encryptPassword)(data.password);
        const newUser = await models.USER_APP.create(data);
        return newUser;
    }
    async update(id, changes) {
        const user = await this.findOne(id);
        const rta = await user.update(changes);
        return rta;
    }
    async delete(id) {
        const user = await this.findOne(id);
        await user.destroy();
        return { id };
    }
}
exports.default = CustomerUserService;
