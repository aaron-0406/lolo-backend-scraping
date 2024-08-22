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
class CustomerHasBankService {
    constructor() { }
    async findAll() {
        const rta = await models.CUSTOMER_HAS_BANK.findAll();
        return rta;
    }
    async findOneById(id) {
        const customerBank = await models.CUSTOMER_HAS_BANK.findByPk(id);
        if (!customerBank) {
            throw boom_1.default.notFound("CHB no encontrado");
        }
        return customerBank;
    }
    async findAllByCustomerId(customerId) {
        const rta = await models.CUSTOMER_HAS_BANK.findAll({
            where: {
                customer_id_customer: customerId,
            },
            include: ["bank"],
        });
        if (!rta) {
            throw boom_1.default.notFound("El cliente no tiene bancos asignados");
        }
        return rta;
    }
    async assign(data) {
        const customerBank = await models.CUSTOMER_HAS_BANK.findOne({
            where: {
                customer_id_customer: data.idCustomer,
                bank_id_bank: data.idBank,
            },
        });
        if (!customerBank) {
            const newCustomerBank = await models.CUSTOMER_HAS_BANK.create(data);
            await (0, aws_bucket_1.createFolder)(`${config_1.default.AWS_CHB_PATH}${newCustomerBank.dataValues.idCustomer}/${newCustomerBank.dataValues.id}/`);
            return newCustomerBank;
        }
        throw boom_1.default.notFound("Banco ya asignado");
    }
    async revoke(id) {
        const customerBank = await this.findOneById(id);
        //TODO: Remove folder of AWS
        await customerBank.destroy();
        return { id };
    }
}
exports.default = CustomerHasBankService;
