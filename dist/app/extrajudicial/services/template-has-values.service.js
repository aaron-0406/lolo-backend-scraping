"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class TemplateHasValuesService {
    constructor() { }
    async findAll(id) {
        const templates = await models.TEMPLATE_HAS_VALUES.findAll({
            where: { templateId: id },
            attributes: { exclude: ["id_template"] },
        });
        const fields = await models.ECAMPO.findAll({
            where: { templateId: id },
        });
        return { templates, fields };
    }
    async findByCustomerId(id) {
        const templateHasValues = await models.TEMPLATE_HAS_VALUES.findAll({
            include: {
                model: models.TEMPLATE,
                where: { customerId: id },
                as: "template",
            },
        });
        return templateHasValues;
    }
    async findOneWidthTemplate(id) {
        const templateHasValues = await models.TEMPLATE_HAS_VALUES.findOne({
            include: [
                {
                    model: models.TEMPLATE,
                    as: "template",
                    include: [{ model: models.TEMPLATE_IMG, as: "template_imgs" }],
                },
                {
                    model: models.VALUES,
                    as: "values",
                },
            ],
            where: { id },
        });
        if (!templateHasValues)
            throw boom_1.default.notFound("Plantilla no encontrada");
        return JSON.parse(JSON.stringify(templateHasValues));
    }
    async findOne(id) {
        const templateHasValues = await models.TEMPLATE_HAS_VALUES.findOne({
            where: {
                id,
            },
        });
        if (!templateHasValues)
            throw boom_1.default.notFound("Plantilla no encontrada");
        return templateHasValues;
    }
    async create(data) {
        const newTemplateHasValues = await models.TEMPLATE_HAS_VALUES.create(data);
        return newTemplateHasValues;
    }
    async update(id, name) {
        const templateHasValues = await this.findOne(id);
        const rta = await templateHasValues.update({ name });
        return rta;
    }
    async delete(id) {
        const templateHasValues = await this.findOne(id);
        await templateHasValues.destroy();
        return { id };
    }
}
exports.default = TemplateHasValuesService;