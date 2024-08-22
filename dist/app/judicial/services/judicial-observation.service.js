"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const config_1 = __importDefault(require("../../../config/config"));
const boom_1 = __importDefault(require("@hapi/boom"));
const helpers_1 = require("../../../libs/helpers");
const aws_bucket_1 = require("../../../libs/aws_bucket");
const { models } = sequelize_1.default;
class JudicialObservationService {
    constructor() { }
    async findAllByCHBAndFileCase(fileCase) {
        const rta = await models.JUDICIAL_OBSERVATION.findAll({
            include: [
                {
                    model: models.JUDICIAL_OBS_TYPE,
                    as: "judicialObsType",
                },
                {
                    model: models.JUDICIAL_OBS_FILE,
                    as: "judicialObsFile",
                },
            ],
            order: [["id", "DESC"]],
            where: {
                judicial_case_file_id_judicial_case_file: fileCase,
            },
        });
        return rta;
    }
    async findByID(id) {
        const judicialObservation = await models.JUDICIAL_OBSERVATION.findOne({
            include: [
                {
                    model: models.JUDICIAL_OBS_TYPE,
                    as: "judicialObsType",
                },
                {
                    model: models.JUDICIAL_OBS_FILE,
                    as: "judicialObsFile",
                },
            ],
            where: {
                id,
            },
        });
        if (!judicialObservation) {
            throw boom_1.default.notFound("Observación Judicial no encontrada");
        }
        return judicialObservation;
    }
    async create(data, files, params) {
        const newJudicialObservation = await models.JUDICIAL_OBSERVATION.create(data);
        const fileCreationPromises = files.map(async (file) => {
            const newObsFile = await models.JUDICIAL_OBS_FILE.create({
                judicialObservationId: newJudicialObservation.dataValues.id,
                originalName: file.originalname,
                awsName: "",
                customerHasBankId: data.customerHasBankId,
            });
            const fecha = new Date();
            const mes = fecha.getMonth() + 1;
            const año = fecha.getFullYear();
            const newFileName = `${newObsFile.dataValues.id}-${mes}-${año}-${file.originalname}`;
            await (0, helpers_1.renameFile)(`../public/docs/`, file.filename, newFileName);
            file.filename = newFileName;
            // UPLOAD TO AWS
            await (0, aws_bucket_1.uploadFile)(file, `${config_1.default.AWS_CHB_PATH}${params.idCustomer}/${data.customerHasBankId}/${params.code}/case-file/${data.judicialCaseFileId}/observation`);
            // UPDATE NAME IN DATABASE
            newObsFile.update({
                awsName: file.filename,
            });
            // DELETE TEMP FILE
            await (0, helpers_1.deleteFile)("../public/docs", file.filename);
        });
        await Promise.all(fileCreationPromises);
        const observation = await this.findByID(newJudicialObservation.dataValues.id);
        return observation;
    }
    async update(id, changes, files, params) {
        const judicialObservation = await this.findByID(id);
        const oldJudicialObservation = Object.assign({}, judicialObservation.get());
        await judicialObservation.update(changes);
        const fileCreationPromises = files.map(async (file) => {
            const newObsFile = await models.JUDICIAL_OBS_FILE.create({
                judicialObservationId: id,
                originalName: file.originalname,
                awsName: "",
                customerHasBankId: judicialObservation.dataValues.customerHasBankId,
            });
            const fecha = new Date();
            const mes = fecha.getMonth() + 1;
            const año = fecha.getFullYear();
            const newFileName = `${newObsFile.dataValues.id}-${mes}-${año}-${file.filename}`;
            await (0, helpers_1.renameFile)(`../public/docs/`, file.filename, newFileName);
            file.filename = newFileName;
            // UPLOAD TO AWS
            await (0, aws_bucket_1.uploadFile)(file, `${config_1.default.AWS_CHB_PATH}${params.idCustomer}/${judicialObservation.dataValues.customerHasBankId}/${params.code}/case-file/${judicialObservation.dataValues.judicialCaseFileId}/observation`);
            // UPDATE NAME IN DATABASE
            newObsFile.update({
                awsName: file.filename,
            });
            // DELETE TEMP FILE
            await (0, helpers_1.deleteFile)("../public/docs", file.filename);
        });
        await Promise.all(fileCreationPromises);
        const newJudicialObservation = await this.findByID(judicialObservation.dataValues.id);
        return { oldJudicialObservation, newJudicialObservation };
    }
    async delete(id) {
        const judicialObservation = await this.findByID(id);
        const oldJudicialObservation = Object.assign({}, judicialObservation.get());
        await judicialObservation.destroy();
        return oldJudicialObservation;
    }
}
exports.default = JudicialObservationService;
