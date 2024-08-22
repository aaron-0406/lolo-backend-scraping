"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ValuesService {
    constructor() { }
    async findAllByTemplateHasValuesId(id) {
        const rta = await models.VALUES.findAll({
            where: { templateHasValuesId: id },
        });
        return rta;
    }
    async createValue(data) {
        const newValue = await models.VALUES.create(data);
        return newValue;
    }
    async findOne(id) {
        const templateHasValues = await models.VALUES.findOne({
            where: {
                id,
            },
        });
        if (!templateHasValues)
            throw boom_1.default.notFound("Valor no encontrado");
        return templateHasValues;
    }
    async update(id, data) {
        const value = await this.findOne(id);
        const newValue = await value.update(data);
        return newValue;
    }
}
exports.default = ValuesService;
