"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const { models } = sequelize_1.default;
class ECampoService {
    constructor() { }
    async findAllByTemplateId(id) {
        const rta = await models.ECAMPO.findAll({
            where: { template_id_template: id },
        });
        return rta;
    }
}
exports.default = ECampoService;
