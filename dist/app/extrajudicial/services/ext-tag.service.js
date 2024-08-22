"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ExtTagService {
    constructor() { }
    async findAll() {
        const rta = await models.EXT_TAG.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.EXT_TAG.findAll({
            include: [
                {
                    model: models.EXT_TAG_GROUP,
                    as: "extTagGroup",
                    foreignKey: "tagGroupId",
                    identifier: "id",
                    attributes: ["name"],
                },
            ],
            order: [["created_at", "DESC"]],
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        return rta;
    }
    async findAllByCHBAndTagGroupId(chb, tagGroupId) {
        const rta = await models.EXT_TAG.findAll({
            order: [["created_at", "DESC"]],
            where: {
                customer_has_bank_id_customer_has_bank: chb,
                tag_group_id_group_tag: tagGroupId,
            },
        });
        return rta;
    }
    async findByID(id) {
        const extTag = await models.EXT_TAG.findOne({
            where: {
                id_ext_tag: id,
            },
        });
        if (!extTag) {
            throw boom_1.default.notFound("Etiqueta no encontrada");
        }
        return extTag;
    }
    async create(data) {
        const newExtTag = await models.EXT_TAG.create(data);
        return newExtTag;
    }
    async update(id, changes) {
        const extTag = await this.findByID(id);
        const oldExtTag = Object.assign({}, extTag.get());
        const newExtTag = await extTag.update(changes);
        return { oldExtTag, newExtTag };
    }
    async updateAction(id, action) {
        const extTag = await this.findByID(id);
        const oldExtTag = Object.assign({}, extTag.get());
        const newExtTag = await extTag.update(Object.assign(Object.assign({}, extTag), { action }));
        return { oldExtTag, newExtTag };
    }
    async delete(id) {
        const extTag = await this.findByID(id);
        const oldExtTag = Object.assign({}, extTag.get());
        await extTag.destroy();
        return oldExtTag;
    }
}
exports.default = ExtTagService;
