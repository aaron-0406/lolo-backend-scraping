"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const helpers_1 = require("../../../libs/helpers");
const path_1 = __importDefault(require("path"));
const aws_bucket_1 = require("../../../libs/aws_bucket");
const config_1 = __importDefault(require("../../../config/config"));
const { models } = sequelize_1.default;
class TemplateService {
    constructor() { }
    async findAllByCustomerId(id) {
        const rta = await models.TEMPLATE.findAll({
            where: { customerId: id },
        });
        return rta;
    }
    async findOne(id) {
        const template = await models.TEMPLATE.findOne({
            where: { id },
            include: { model: models.TEMPLATE_IMG, as: "template_imgs" },
        });
        if (!template)
            throw boom_1.default.notFound("Plantilla no encontrada");
        try {
            if (template.dataValues.templateJson !== "") {
                const isStored = (0, helpers_1.isFileStoredIn)(path_1.default.join(__dirname, "../../../public/download"), template.dataValues.templateJson);
                if (!isStored) {
                    await (0, aws_bucket_1.readFile)(`${config_1.default.AWS_PLANTILLA_PATH}${template.dataValues.customerId}/${template.dataValues.templateJson}`);
                }
            }
            if (template.dataValues.templatePhoto !== "") {
                const isStored = (0, helpers_1.isFileStoredIn)(path_1.default.join(__dirname, "../../../public/download"), template.dataValues.templatePhoto);
                if (!isStored) {
                    await (0, aws_bucket_1.readFile)(`${config_1.default.AWS_PLANTILLA_PATH}${template.dataValues.customerId}/${template.dataValues.templatePhoto}`);
                }
            }
            for (let i = 0; i < template.dataValues.template_imgs.length; i++) {
                const element = template.dataValues.template_imgs[i];
                await (0, aws_bucket_1.readFile)(`${config_1.default.AWS_PLANTILLA_PATH}${template.dataValues.customerId}/${element.img}`);
            }
        }
        catch (error) { }
        return template;
    }
}
exports.default = TemplateService;
