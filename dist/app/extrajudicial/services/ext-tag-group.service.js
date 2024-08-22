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
        const rta = await models.EXT_TAG_GROUP.findAll();
        return rta;
    }
    async findAllWithOrder() {
        const rta = await models.EXT_TAG_GROUP.findAll({
            order: [["created_at", "DESC"]],
        });
        return rta;
    }
    async findByID(id) {
        const extTagGroup = await models.EXT_TAG_GROUP.findOne({
            where: {
                id_ext_tag_group: id,
            },
        });
        if (!extTagGroup) {
            throw boom_1.default.notFound("Grupo de etiquetas no encontrada");
        }
        return extTagGroup;
    }
    async create(data) {
        const newExtTagGroup = await models.EXT_TAG_GROUP.create(data);
        return newExtTagGroup;
    }
    async update(id, changes) {
        const extTagGroup = await this.findByID(id);
        const rta = await extTagGroup.update(changes);
        return rta;
    }
    async delete(id) {
        const extTagGroup = await this.findByID(id);
        await extTagGroup.destroy();
        return { id };
    }
}
exports.default = ExtTagGroupService;
