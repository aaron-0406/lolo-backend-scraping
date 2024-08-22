"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class NegotiationService {
    constructor() { }
    async findAll() {
        const rta = await models.NEGOTIATION.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.NEGOTIATION.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
            include: [
                {
                    model: models.CUSTOMER_HAS_BANK,
                    as: "customerHasBank",
                },
            ],
            order: [["name", "ASC"]],
        });
        return rta;
    }
    async findOne(id) {
        const negotiation = await models.NEGOTIATION.findByPk(id);
        if (!negotiation) {
            throw boom_1.default.notFound("Negociación no encontrada");
        }
        return negotiation;
    }
    async create(data) {
        const newNegotiation = await models.NEGOTIATION.create(data);
        return newNegotiation;
    }
    async update(id, changes) {
        const negotiation = await this.findOne(id);
        const oldNegotiation = Object.assign({}, negotiation.get());
        const newNegotiation = await negotiation.update(changes);
        return { oldNegotiation, newNegotiation };
    }
    async delete(id) {
        const negotiation = await this.findOne(id);
        const oldNegotiation = Object.assign({}, negotiation.get());
        await negotiation.destroy();
        return oldNegotiation;
    }
}
exports.default = NegotiationService;
