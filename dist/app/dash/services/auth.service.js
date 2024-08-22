"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = require("../../../libs/bcrypt");
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class AuthService {
    constructor() { }
    async login(data) {
        const { email, password } = data;
        const userApp = await models.USER_APP.findOne({
            where: { email },
        });
        if (!userApp)
            throw boom_1.default.notFound("Correo o contraseña incorrectos");
        if (!(userApp === null || userApp === void 0 ? void 0 : userApp.dataValues.state))
            throw boom_1.default.notFound("Usuario inhabilitado");
        if (!(await (0, bcrypt_1.matchPassword)(password, userApp.dataValues.password)))
            throw boom_1.default.notFound("Correo o contraseña incorrectos");
        return userApp;
    }
}
exports.default = AuthService;
