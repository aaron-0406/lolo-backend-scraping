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
class JudicialObservationService {
    constructor() { }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_OBS_FILE.findAll({
            where: { customerHasBankId: chb },
        });
        return rta;
    }
    async findByID(id) {
        const judiciaObsFile = await models.JUDICIAL_OBS_FILE.findOne({
            where: {
                id,
            },
        });
        if (!judiciaObsFile) {
            throw boom_1.default.notFound("Observación Judicial no encontrada");
        }
        return judiciaObsFile;
    }
    async findOne(idCustomer, chb, code, judicialFileCaseId, id) {
        const file = await models.JUDICIAL_OBS_FILE.findOne({
            where: {
                id,
            },
        });
        if (!file) {
            throw boom_1.default.notFound("Archivo no encontrado");
        }
        const isStored = (0, helpers_1.isFileStoredIn)(path_1.default.join(__dirname, "../../../public/download"), file.dataValues.name);
        if (!isStored) {
            await (0, aws_bucket_1.readFile)(`${config_1.default.AWS_CHB_PATH}${idCustomer}/${chb}/${code}/case-file/${judicialFileCaseId}/observation/${file.dataValues.awsName}`);
        }
        return file;
    }
    async create(data) {
        const newJudiciaObsFile = await models.JUDICIAL_OBS_FILE.create(data);
        return newJudiciaObsFile;
    }
    async update(id, changes) {
        const judiciaObsFile = await this.findByID(id);
        const rta = await judiciaObsFile.update(changes);
        return rta;
    }
    async delete(id, idCustomer, chb, code, judicialFileCaseId) {
        const judiciaObsFile = await this.findByID(id);
        await judiciaObsFile.destroy();
        await (0, aws_bucket_1.deleteFileBucket)(`${config_1.default.AWS_CHB_PATH}${idCustomer}/${chb}/${code}/case-file/${judicialFileCaseId}/observation/${judiciaObsFile.dataValues.awsName}`);
        return { id };
    }
}
exports.default = JudicialObservationService;
