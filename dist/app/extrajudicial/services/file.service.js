"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const sequelize_2 = require("sequelize");
const helpers_1 = require("../../../libs/helpers");
const aws_bucket_1 = require("../../../libs/aws_bucket");
const config_1 = __importDefault(require("../../../config/config"));
const path_1 = __importDefault(require("path"));
const { models } = sequelize_1.default;
class FileService {
    constructor() { }
    async find(clientId, chb, query) {
        const { filter } = query;
        const rta = await models.FILE.findAll({
            include: [{
                    model: models.EXT_TAG,
                    as: "classificationTag",
                    foreignKey: "tagId",
                    attributes: ["name", "color"],
                }],
            where: Object.assign({ clientId }, (filter ? { name: { [sequelize_2.Op.like]: `%${filter}%` } } : {})),
        });
        return rta;
    }
    async findOne(idCustomer, chb, code, id) {
        const file = await models.FILE.findOne({
            where: {
                id,
            },
            include: {
                model: models.EXT_TAG,
                as: "classificationTag",
                attributes: ["name", "customerHasBankId"],
            },
        });
        if (!file) {
            throw boom_1.default.notFound("Archivo no encontrado");
        }
        const isStored = (0, helpers_1.isFileStoredIn)(path_1.default.join(__dirname, "../../../public/download"), file.dataValues.name);
        if (!isStored) {
            await (0, aws_bucket_1.readFile)(`${config_1.default.AWS_CHB_PATH}${idCustomer}/${chb}/${code}/${file.dataValues.name}`);
        }
        return file;
    }
    async create(data) {
        const { clientId, code, idCustomer, chb } = data;
        const filesAdded = [];
        for (let i = 0; i < data.files.length; i++) {
            const { filename, originalname } = data.files[i];
            // UPLOAD TO AWS
            await (0, aws_bucket_1.uploadFile)(data.files[i], `${config_1.default.AWS_CHB_PATH}${idCustomer}/${chb}/${code}`);
            // STORED IN DATABASE
            const newFile = await models.FILE.create({
                name: filename,
                originalName: originalname,
                clientId,
                tagId: data.tagId,
            });
            // DELETE TEMP FILE
            await (0, helpers_1.deleteFile)("../public/docs", filename);
            filesAdded.push(newFile);
        }
        return filesAdded;
    }
    async updateFile(id, originalName, tagId) {
        const file = await models.FILE.findOne({
            where: {
                id_file: id,
            },
        });
        if (file) {
            const rta = await file.update(Object.assign(Object.assign({}, file), { originalName, tagId }));
            return rta;
        }
        throw boom_1.default.notFound("Archivo no encontrado");
    }
    async delete(idCustomer, chb, code, id) {
        const file = await models.FILE.findOne({
            where: {
                id,
            },
        });
        if (!file)
            return -1;
        const newFile = JSON.parse(JSON.stringify(file));
        await (0, aws_bucket_1.deleteFileBucket)(`${config_1.default.AWS_CHB_PATH}${idCustomer}/${chb}/${code}/${newFile.name}`);
        await file.destroy();
        return { id };
    }
}
exports.default = FileService;
