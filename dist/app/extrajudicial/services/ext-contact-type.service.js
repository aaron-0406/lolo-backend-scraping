"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ExtTagGroupService {
    constructor() { }
    async findAll() {
        const rta = await models.EXT_CONTACT_TYPE.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.EXT_CONTACT_TYPE.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("tipos de contactos no encontrados");
        }
        return rta;
    }
    async findByID(id) {
        const extContactType = await models.EXT_CONTACT_TYPE.findOne({
            where: {
                id_ext_contact_type: id,
            },
        });
        if (!extContactType) {
            throw boom_1.default.notFound("tipo de contactos no encontrado");
        }
        return extContactType;
    }
    async create(data) {
        const newContactType = await models.EXT_CONTACT_TYPE.create(data);
        return newContactType;
    }
    async update(id, changes) {
        const extContactType = await this.findByID(id);
        const oldExtContactType = Object.assign({}, extContactType.get());
        const newExtContactType = await extContactType.update(changes);
        return { oldExtContactType, newExtContactType };
    }
    async delete(id) {
        const extContactType = await this.findByID(id);
        const oldExtContactType = Object.assign({}, extContactType.get());
        await extContactType.destroy();
        return oldExtContactType;
    }
}
exports.default = ExtTagGroupService;
