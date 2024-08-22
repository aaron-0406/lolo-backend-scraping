"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const aws_bucket_1 = require("../../../libs/aws_bucket");
const config_1 = __importDefault(require("../../../config/config"));
const { models } = sequelize_1.default;
class CustomerService {
    constructor() { }
    async find() {
        const rta = await models.CUSTOMER.findAll({
            include: ["customerBanks"],
        });
        return rta;
    }
    async findOne(urlIdentifier) {
        const customer = await models.CUSTOMER.findOne({
            where: {
                url_identifier: urlIdentifier,
            },
            include: ["customerBanks"],
        });
        if (!customer) {
            throw boom_1.default.notFound("Cliente no encontrado");
        }
        if (!customer.dataValues.state)
            throw boom_1.default.notFound("Cliente inhabilitado");
        return customer;
    }
    async findOneByID(id) {
        const customer = await models.CUSTOMER.findOne({
            where: {
                id_customer: id,
            },
        });
        if (!customer) {
            throw boom_1.default.notFound("Cliente no encontrado");
        }
        return customer;
    }
    async create(data) {
        const newCustomer = await models.CUSTOMER.create(data);
        await (0, aws_bucket_1.createFolder)(`${config_1.default.AWS_PLANTILLA_PATH}${newCustomer.dataValues.id}/`);
        return newCustomer;
    }
    async update(id, changes) {
        const customer = await this.findOneByID(id);
        const rta = await customer.update(changes);
        return rta;
    }
    async updateState(id, state) {
        const customer = await this.findOneByID(id);
        const rta = await customer.update(Object.assign(Object.assign({}, customer), { state }));
        return rta;
    }
    async delete(id) {
        const customer = await this.findOneByID(id);
        await customer.destroy();
        return { id };
    }
}
exports.default = CustomerService;
