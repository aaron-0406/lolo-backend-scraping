"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ManagementActionService {
    constructor() { }
    async findAll() {
        const rta = await models.MANAGEMENT_ACTION.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.MANAGEMENT_ACTION.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
            include: [
                {
                    model: models.CUSTOMER_HAS_BANK,
                    as: "customerHasBank",
                },
            ],
            order: [["nameAction", "ASC"]],
        });
        if (!rta)
            throw boom_1.default.notFound("Acción no encontrada");
        return rta;
    }
    async findOne(id) {
        const managementAction = await models.MANAGEMENT_ACTION.findByPk(id);
        if (!managementAction) {
            throw boom_1.default.notFound("Acción no encontrada");
        }
        return managementAction;
    }
    async create(data) {
        const newManagementAction = await models.MANAGEMENT_ACTION.create(data);
        return newManagementAction;
    }
    async update(id, changes) {
        const managementAction = await this.findOne(id);
        const oldManagementAction = Object.assign({}, managementAction.get());
        const newManagementAction = await managementAction.update(changes);
        return { oldManagementAction, newManagementAction };
    }
    async delete(id) {
        const managementAction = await this.findOne(id);
        const oldManagementAction = Object.assign({}, managementAction.get());
        await managementAction.destroy();
        return oldManagementAction;
    }
}
exports.default = ManagementActionService;
