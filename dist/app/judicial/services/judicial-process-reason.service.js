"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class judicialProcessReasonService {
    constructor() { }
    async findAll() {
        const rta = await models.JUDICIAL_PROCESS_REASON.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_PROCESS_REASON.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("Motivos no encontrados");
        }
        return rta;
    }
    async findByID(id) {
        const judicialProcessReason = await models.JUDICIAL_PROCESS_REASON.findOne({
            where: {
                id_judicial_process_status_reason: id,
            },
        });
        if (!judicialProcessReason) {
            throw boom_1.default.notFound("Motivo del proceso no encontrado");
        }
        return judicialProcessReason;
    }
    async create(data) {
        const newJudicialProcessReason = await models.JUDICIAL_PROCESS_REASON.create(data);
        return newJudicialProcessReason;
    }
    async update(id, changes) {
        const judicialProcessReason = await this.findByID(id);
        const oldJudicialProcessReason = Object.assign({}, judicialProcessReason.get());
        const newJudicialProcessReason = await judicialProcessReason.update(changes);
        return { oldJudicialProcessReason, newJudicialProcessReason };
    }
    async delete(id) {
        const judicialProcessReason = await this.findByID(id);
        const oldJudicialProcessReason = Object.assign({}, judicialProcessReason.get());
        await judicialProcessReason.destroy();
        return oldJudicialProcessReason;
    }
}
exports.default = judicialProcessReasonService;
