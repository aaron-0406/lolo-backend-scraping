"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class GuarantorService {
    constructor() { }
    async findAll() {
        const rta = await models.GUARANTOR.findAll();
        return rta;
    }
    async findAllByClient(clientID) {
        const rta = await models.GUARANTOR.findAll({
            where: {
                client_id_client: clientID,
            },
        });
        return rta;
    }
    async findByID(id) {
        const guarantor = await models.GUARANTOR.findOne({
            where: {
                id_guarantor: id,
            },
        });
        if (!guarantor) {
            throw boom_1.default.notFound("Fiador no encontrado");
        }
        return guarantor;
    }
    async create(data) {
        const newGuarantor = await models.GUARANTOR.create(data);
        return newGuarantor;
    }
    async update(id, changes) {
        const guarantor = await this.findByID(id);
        const rta = await guarantor.update(changes);
        return rta;
    }
    async delete(id) {
        const client = await this.findByID(id);
        await client.destroy();
        return { id };
    }
}
exports.default = GuarantorService;
