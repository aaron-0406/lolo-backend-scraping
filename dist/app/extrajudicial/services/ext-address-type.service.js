"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ExtAddressTypeService {
    constructor() { }
    async findAll() {
        const rta = await models.EXT_ADDRESS_TYPE.findAll();
        return rta;
    }
    async findAllByChb(chb) {
        const rta = await models.EXT_ADDRESS_TYPE.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        return rta;
    }
    async findByID(id, chb) {
        const address = await models.EXT_ADDRESS_TYPE.findOne({
            where: {
                id_address_type: id,
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        if (!address)
            throw boom_1.default.notFound("Tipo de dirección no encontrada");
        return address;
    }
    async create(data) {
        const newAddress = await models.EXT_ADDRESS_TYPE.create(data);
        return newAddress;
    }
    async update(id, changes) {
        const address = await this.findByID(id, String(changes.customerHasBankId));
        const oldAddress = Object.assign({}, address.get());
        const newAddress = await address.update(changes);
        return { oldAddress, newAddress };
    }
    async delete(id, chb) {
        const address = await this.findByID(id, chb);
        const oldAddress = Object.assign({}, address.get());
        await address.destroy();
        return oldAddress;
    }
}
exports.default = ExtAddressTypeService;
