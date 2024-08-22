"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ExtIpAddressBankService {
    constructor() { }
    async findAllByCustomerId(customerId) {
        const rta = await models.EXT_IP_ADDRESS_BANK.findAll({
            where: {
                customer_id_customer: customerId,
            },
        });
        return rta;
    }
    async findByID(id, customerId) {
        const extIpAddress = await models.EXT_IP_ADDRESS_BANK.findOne({
            where: {
                id,
                customer_id_customer: customerId,
            },
        });
        if (!extIpAddress) {
            throw boom_1.default.notFound("Dirección de IP no encontrada");
        }
        return extIpAddress;
    }
    async findByIP(ip, customerId) {
        const extIpAddress = await models.EXT_IP_ADDRESS_BANK.findOne({
            where: {
                ip,
                customer_id_customer: customerId,
            },
        });
        if (!extIpAddress) {
            throw boom_1.default.notFound("IP no encontrada");
        }
        return extIpAddress;
    }
    async create(data) {
        const newExtIpAddress = await models.EXT_IP_ADDRESS_BANK.create(data);
        return newExtIpAddress;
    }
    async update(id, changes) {
        const extIpAddress = await this.findByID(id, String(changes.customerId));
        const oldExtIpAddress = Object.assign({}, extIpAddress.get());
        const newExtIpAddress = await extIpAddress.update(changes);
        return { oldExtIpAddress, newExtIpAddress };
    }
    async updateState(id, customerId, state) {
        const extIpAddress = await this.findByID(id, customerId);
        const oldExtIpAddress = Object.assign({}, extIpAddress.get());
        const newExtIpAddress = await extIpAddress.update(Object.assign(Object.assign({}, extIpAddress), { state }));
        return { oldExtIpAddress, newExtIpAddress };
    }
    async delete(id, customerId) {
        const extIpAddress = await this.findByID(id, customerId);
        const oldExtIpAddress = Object.assign({}, extIpAddress.get());
        await extIpAddress.destroy();
        return oldExtIpAddress;
    }
}
exports.default = ExtIpAddressBankService;
