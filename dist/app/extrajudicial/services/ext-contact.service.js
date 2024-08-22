"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ExtContactService {
    constructor() { }
    async findAll() {
        const rta = await models.EXT_CONTACT.findAll();
        return rta;
    }
    async findAllByClient(clientID) {
        const rta = await models.EXT_CONTACT.findAll({
            where: {
                client_id_client: clientID,
            },
            include: {
                model: models.EXT_CONTACT_TYPE,
                as: "extContactType",
            },
            order: [["created_at", "DESC"]],
        });
        return rta;
    }
    async findByID(id) {
        const extContact = await models.EXT_CONTACT.findOne({
            where: {
                id_ext_contact: id,
            },
            include: {
                model: models.EXT_CONTACT_TYPE,
                as: "extContactType",
                attributes: ["contactType", "customerHasBankId"],
            },
        });
        if (!extContact) {
            throw boom_1.default.notFound("Contacto no encontrado");
        }
        return extContact;
    }
    async create(data) {
        const newExtContact = await models.EXT_CONTACT.create(data);
        await newExtContact.reload({
            include: {
                model: models.EXT_CONTACT_TYPE,
                as: "extContactType",
                attributes: ["contactType", "customerHasBankId"],
            },
        });
        return newExtContact;
    }
    async updateState(id, state) {
        const extContact = await this.findByID(id);
        const rta = await extContact.update(Object.assign(Object.assign({}, extContact), { state }));
        await rta.reload({
            include: {
                model: models.EXT_CONTACT_TYPE,
                as: "extContactType",
                attributes: ["contactType", "customerHasBankId"],
            },
        });
        return rta;
    }
    async update(id, changes) {
        const extContact = await this.findByID(id);
        const rta = await extContact.update(changes);
        await rta.reload({
            include: {
                model: models.EXT_CONTACT_TYPE,
                as: "extContactType",
                attributes: ["contactType", "customerHasBankId"],
            },
        });
        return rta;
    }
    async delete(id) {
        const extContact = await this.findByID(id);
        await extContact.destroy();
        return { id };
    }
}
exports.default = ExtContactService;
