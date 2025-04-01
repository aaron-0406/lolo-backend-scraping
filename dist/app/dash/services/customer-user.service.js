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
        const rta = await models.CUSTOMER_USER.findAll();
        return rta;
    }
    async findUserBot(chb) {
        var _a, _b;
        // TODO: Change this logic
        const customer = await models.CUSTOMER_HAS_BANK.findByPk(chb);
        let dni = "";
        let customerId = 0;
        if (((_a = customer === null || customer === void 0 ? void 0 : customer.dataValues) === null || _a === void 0 ? void 0 : _a.idCustomer) == 1) {
            customerId = 1;
            dni = "00000001";
        }
        else if (((_b = customer === null || customer === void 0 ? void 0 : customer.dataValues) === null || _b === void 0 ? void 0 : _b.idCustomer) == 22) {
            customerId = 22;
            dni = "00000002";
        }
        try {
            const rta = await models.CUSTOMER_USER.findOne({
                where: {
                    dni,
                    customerId,
                },
            });
            if (!rta)
                return null;
            console.log("🚀 ~ CustomerUserService ~ findUserBot ~ rta:", JSON.stringify(rta));
            return rta;
        }
        catch (e) {
            console.log(e);
        }
    }
    async findAllByCustomerID(customerId) {
        const rta = await models.CUSTOMER_USER.findAll({
            include: ["role"],
            attributes: {
                exclude: ["password"],
            },
            where: {
                customer_id_customer: customerId,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("Cliente no encontrado");
        }
        return rta;
    }
    async findOne(id) {
        const user = await models.CUSTOMER_USER.findByPk(id, {
            include: ["role"],
            attributes: { exclude: ["password"] },
        });
        if (!user) {
            throw boom_1.default.notFound("Usuario no encontrado");
        }
        return user;
    }
    async failedAttemptsCounter(id, logged) {
        const user = await this.findOne(id);
        const loginAttempts = logged ? 0 : user.dataValues.loginAttempts + 1;
        user.update(Object.assign(Object.assign({}, user), { loginAttempts }));
    }
    async create(data) {
        const [user, created] = await models.CUSTOMER_USER.findOrCreate({
            where: {
                dni: data.dni,
                customer_id_customer: data.customerId,
            },
            include: ["role"],
            attributes: {
                exclude: ["password"],
            },
            defaults: data,
        });
        if (!created) {
            throw boom_1.default.notFound("Usuario ya existente");
        }
        await user.reload({
            include: ["role"],
            attributes: {
                exclude: ["password"],
            },
        });
        return user;
    }
    async update(id, changes) {
        const user = await this.findOne(id);
        const oldUser = Object.assign({}, user.get());
        if (changes.password)
            changes.password = await (0, bcrypt_1.encryptPassword)(changes.password);
        const newUser = await user.update(changes);
        await newUser.reload({
            include: ["role"],
            attributes: {
                exclude: ["password"],
            },
        });
        return { oldUser, newUser };
    }
    async updateState(id, state) {
        state !== null && state !== void 0 ? state : this.failedAttemptsCounter(id, true);
        const user = await this.findOne(id);
        const oldUser = Object.assign({}, user.get());
        const newUser = await user.update(Object.assign(Object.assign({}, user), { state }));
        return { oldUser, newUser };
    }
    async delete(id) {
        const user = await this.findOne(id);
        const oldUser = Object.assign({}, user.get());
        await user.destroy();
        return oldUser;
    }
    async removeCode2fa(id) {
        const user = await this.findOne(id);
        const oldUser = Object.assign({}, user.get());
        const newUser = await user.update(Object.assign(Object.assign({}, user), { code2fa: null, firstAccess: false }));
        return { oldUser, newUser };
    }
}
exports.default = CustomerUserService;
