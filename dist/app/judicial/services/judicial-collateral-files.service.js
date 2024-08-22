"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../../../config/config"));
const aws_bucket_1 = require("../../../libs/aws_bucket");
const helpers_1 = require("../../../libs/helpers");
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const sequelize_2 = require("sequelize");
const { models } = sequelize_1.default;
class JudicialCollateralFilesService {
    constructor() { }
    async findByID(id) {
        const judicialCollateralFile = await models.JUDICIAL_COLLATERAL_FILE.findOne({
            where: {
                id,
            },
        });
        if (!judicialCollateralFile) {
            throw boom_1.default.notFound("Archivo de garantía no encontrado");
        }
        return judicialCollateralFile;
    }
    async findOne(chb, collateralId, id) {
        try {
            const file = await models.JUDICIAL_COLLATERAL_FILES.findOne({
                where: {
                    id,
                },
                attributes: {
                    exclude: ["judicialCollateralId"],
                },
            });
            if (!file) {
                throw boom_1.default.notFound("Archivo no encontrado");
            }
            const isStored = (0, helpers_1.isFileStoredIn)(path_1.default.join(__dirname, "../../../public/download"), file.dataValues.name);
            if (!isStored) {
                await (0, aws_bucket_1.readFile)(`${config_1.default.AWS_CHB_PATH}${chb}/collaterals/${collateralId}/${file.dataValues.nameOriginAws}`);
            }
            return file;
        }
        catch (error) {
            console.log(error);
        }
    }
    async findAllByCollateralId(collateralId, chb, query) {
        const { filter } = query;
        const fileName = filter;
        let filtersWhere = {
            judicialCollateralIdJudicialCollateral: collateralId,
            customerHasBankId: chb,
        };
        if (fileName) {
            filtersWhere = Object.assign(Object.assign({}, filtersWhere), { originalName: { [sequelize_2.Op.like]: `%${fileName}%` } });
        }
        try {
            const judicialCollateralFile = await models.JUDICIAL_COLLATERAL_FILES.findAll({
                where: filtersWhere,
                attributes: {
                    exclude: ["judicialCollateralId"],
                },
            });
            if (!judicialCollateralFile) {
                throw boom_1.default.notFound("Collateral file no encontrado");
            }
            return judicialCollateralFile;
        }
        catch (error) {
            console.log(error);
        }
    }
    async create(files, chb, collateralId) {
        try {
            const filesData = await Promise.all(files.map(async (file) => {
                const newJudicialCollateralFile = await models.JUDICIAL_COLLATERAL_FILES.create({
                    originalName: file.originalname,
                    nameOriginAws: "",
                    judicialCollateralIdJudicialCollateral: collateralId,
                    customerHasBankId: chb,
                });
                const date = new Date();
                const month = date.getMonth() + 1;
                const year = date.getFullYear();
                const nameOriginAws = `${collateralId}-${month}-${year}-${file.originalname}`;
                await (0, helpers_1.renameFile)(`../public/docs/`, file.filename, nameOriginAws);
                file.filename = nameOriginAws;
                await (0, aws_bucket_1.uploadFile)(file, `${config_1.default.AWS_CHB_PATH}${chb}/collaterals/${collateralId}`);
                // UPDATE NAME IN DATABASE
                const updatedJudicialCollateralFile = await newJudicialCollateralFile.update({
                    nameOriginAws: file.filename,
                });
                // DELETE TEMP FILE
                await (0, helpers_1.deleteFile)("../public/docs", file.filename);
                return updatedJudicialCollateralFile;
            }));
            return filesData;
        }
        catch (error) {
            console.log(error);
        }
    }
    async delete(id, chb, collateralId) {
        try {
            const judicialCollateralFile = await models.JUDICIAL_COLLATERAL_FILES.findOne({
                where: {
                    id,
                },
                attributes: {
                    exclude: ["judicialCollateralId"],
                },
            });
            if (!judicialCollateralFile)
                throw boom_1.default.notFound("Archivo no encontrado");
            await judicialCollateralFile.destroy();
            await (0, aws_bucket_1.deleteFileBucket)(`${config_1.default.AWS_CHB_PATH}${chb}/collaterals/${collateralId}/${judicialCollateralFile.dataValues.nameOriginAws}`);
            return { id };
        }
        catch (error) {
            console.log(error);
        }
    }
}
exports.default = JudicialCollateralFilesService;
