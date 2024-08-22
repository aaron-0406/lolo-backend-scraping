"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const config_1 = __importDefault(require("../../../config/config"));
const aws_bucket_1 = require("../../../libs/aws_bucket");
const helpers_1 = require("../../../libs/helpers");
const moment_1 = __importDefault(require("moment"));
const sequelize_2 = require("sequelize");
const { models } = sequelize_1.default;
class JudicialBinnacleService {
    constructor() { }
    async findAll() {
        const judicialBinnacle = await models.JUDICIAL_BINNACLE.findAll({
            include: [
                {
                    model: models.JUDICIAL_BIN_TYPE_BINNACLE,
                    as: "binnacleType",
                },
                {
                    model: models.JUDICIAL_BIN_PROCEDURAL_STAGE,
                    as: "judicialBinProceduralStage",
                },
                {
                    model: models.JUDICIAL_BIN_FILE,
                    as: "judicialBinFiles",
                },
            ],
            order: [["id", "DESC"]],
        });
        return judicialBinnacle;
    }
    async findAllByCHBAndFileCase(fileCase, query) {
        const { sortBy, order } = query;
        let orderConfig = [];
        if (sortBy && order) {
            const sortByFields = sortBy.split(",");
            const orderDirections = order.split(",");
            orderConfig = sortByFields.map((field, index) => {
                let sortField;
                switch (field.trim()) {
                    case "FECHA":
                        sortField = "date";
                        break;
                    default:
                        sortField = field.trim();
                }
                return [
                    sortField,
                    (orderDirections[index] || "ASC").trim().toUpperCase(),
                ];
            });
        }
        const rta = await models.JUDICIAL_BINNACLE.findAll({
            include: [
                {
                    model: models.JUDICIAL_BIN_TYPE_BINNACLE,
                    as: "binnacleType",
                },
                {
                    model: models.JUDICIAL_BIN_PROCEDURAL_STAGE,
                    as: "judicialBinProceduralStage",
                },
                {
                    model: models.JUDICIAL_BIN_FILE,
                    as: "judicialBinFiles",
                },
            ],
            order: orderConfig,
            where: {
                judicialFileCaseId: fileCase,
            },
        });
        return rta;
    }
    async findByID(id) {
        const judicialBinnacle = await models.JUDICIAL_BINNACLE.findOne({
            include: [
                {
                    model: models.JUDICIAL_BIN_TYPE_BINNACLE,
                    as: "binnacleType",
                },
                {
                    model: models.JUDICIAL_BIN_PROCEDURAL_STAGE,
                    as: "judicialBinProceduralStage",
                },
                {
                    model: models.JUDICIAL_BIN_FILE,
                    as: "judicialBinFiles",
                },
            ],
            where: {
                id,
            },
        });
        if (!judicialBinnacle) {
            throw boom_1.default.notFound("Bitacora Judicial no encontrada");
        }
        return judicialBinnacle;
    }
    async create(data, files, params) {
        const newJudicialBinnacle = await models.JUDICIAL_BINNACLE.create(Object.assign({}, data));
        const addBinFiles = files.map(async (file) => {
            const newBinFile = await models.JUDICIAL_BIN_FILE.create({
                judicialBinnacleId: newJudicialBinnacle.dataValues.id,
                originalName: file.originalname,
                nameOriginAws: "",
                customerHasBankId: data.customerHasBankId,
                size: file.size,
            });
            const newFileName = `${newBinFile.dataValues.id}-${file.filename}`;
            await (0, helpers_1.renameFile)(`../public/docs/`, file.filename, newFileName);
            file.filename = newFileName;
            // UPLOAD TO AWS
            await (0, aws_bucket_1.uploadFile)(file, `${config_1.default.AWS_CHB_PATH}${params.idCustomer}/${data.customerHasBankId}/${params.code}/case-file/${data.judicialFileCaseId}/binnacle`);
            // UPDATE NAME IN DATABASE
            newBinFile.update({
                nameOriginAws: file.filename,
            });
            // DELETE TEMP FILE
            await (0, helpers_1.deleteFile)("../public/docs", file.filename);
        });
        await Promise.all(addBinFiles);
        const binnacle = await this.findByID(newJudicialBinnacle.dataValues.id);
        const allBinFiles = await models.JUDICIAL_BIN_FILE.findAll({
            where: {
                judicialBinnacleId: newJudicialBinnacle.dataValues.id,
            },
        });
        return { binnacle, allBinFiles };
    }
    async update(id, changes, files, params) {
        try {
            const judicialBinnacle = await this.findByID(id);
            const oldJudicialBinacle = Object.assign({}, judicialBinnacle.get());
            console.log(changes);
            await judicialBinnacle.update(changes);
            files.forEach(async (file) => {
                const newBinFile = await models.JUDICIAL_BIN_FILE.create({
                    judicialBinnacleId: id,
                    originalName: file.originalname,
                    nameOriginAws: "",
                    customerHasBankId: judicialBinnacle.dataValues.customerHasBankId,
                    size: file.size,
                });
                const newFileName = `${newBinFile.dataValues.id}-${file.filename}`;
                await (0, helpers_1.renameFile)(`../public/docs/`, file.filename, newFileName);
                file.filename = newFileName;
                // UPLOAD TO AWS
                await (0, aws_bucket_1.uploadFile)(file, `${config_1.default.AWS_CHB_PATH}${params.idCustomer}/${judicialBinnacle.dataValues.customerHasBankId}/${params.code}/case-file/${judicialBinnacle.dataValues.judicialFileCaseId}/binnacle`);
                // UPDATE NAME IN DATABASE
                newBinFile.update({
                    nameOriginAws: file.filename,
                });
                // DELETE TEMP FILE
                await (0, helpers_1.deleteFile)("../public/docs", file.filename);
            });
            const newJudicialBinnacle = await this.findByID(id);
            return { oldJudicialBinacle, newJudicialBinnacle };
        }
        catch (error) {
            console.error("Error in update:", error);
            throw error;
        }
    }
    async updateTariff(id, changes) {
        try {
            const judicialBinnacle = await this.findByID(id);
            const oldJudicialBinacle = Object.assign({}, judicialBinnacle.get());
            const newJudicialBinnacle = await judicialBinnacle.update(changes);
            return { oldJudicialBinacle, newJudicialBinnacle };
        }
        catch (error) {
            console.error("Error in update:", error);
            throw error;
        }
    }
    async delete(id) {
        const judicialBinnacle = await this.findByID(id);
        const oldJudicialBinacle = Object.assign({}, judicialBinnacle.get());
        await judicialBinnacle.destroy();
        return oldJudicialBinacle;
    }
    // INFO: LOGIC FOR JOBS
    async findAllBinnaclesByCHBJob(chb) {
        try {
            const currentDate = (0, moment_1.default)().format("YYYY-MM-DD HH:mm:ss");
            const subqueryResults = await sequelize_1.default.query(`
          SELECT jb1.id_judicial_binnacle
          FROM JUDICIAL_BINNACLE AS jb1
          JOIN (
            SELECT judicial_file_case_id_judicial_file_case AS judicialFileCaseId,
                   MIN(ABS(TIMESTAMPDIFF(SECOND, date, '${currentDate}'))) AS minDiff
            FROM JUDICIAL_BINNACLE
            WHERE deleted_at IS NULL
            GROUP BY judicial_file_case_id_judicial_file_case
          ) AS jb2
          ON jb1.judicial_file_case_id_judicial_file_case = jb2.judicialFileCaseId
          AND ABS(TIMESTAMPDIFF(SECOND, jb1.date, '${currentDate}')) = jb2.minDiff
          WHERE jb1.customer_has_bank_id_customer_has_bank = ? AND jb1.deleted_at IS NULL`, {
                replacements: [chb],
            });
            const relevantIds = subqueryResults[0].map((result) => result.id_judicial_binnacle);
            const rta = await models.JUDICIAL_BINNACLE.findAll({
                where: {
                    id: {
                        [sequelize_2.Op.in]: relevantIds,
                    },
                    customer_has_bank_id_customer_has_bank: chb,
                    deleted_at: null,
                },
                include: [
                    {
                        model: models.JUDICIAL_CASE_FILE,
                        as: "judicialFileCase",
                        include: [
                            {
                                model: models.CUSTOMER_USER,
                                as: "responsibleUser",
                                attributes: ["id", "name"],
                            },
                            {
                                model: models.CLIENT,
                                as: "client",
                                include: [
                                    {
                                        model: models.CITY,
                                        as: "city",
                                    },
                                ],
                            },
                            {
                                model: models.JUDICIAL_COURT,
                                as: "judicialCourt",
                            },
                        ],
                    },
                    {
                        model: models.CUSTOMER_HAS_BANK,
                        as: "customerHasBank",
                        include: [
                            {
                                model: models.BANK,
                                as: "bank",
                            },
                        ],
                    },
                ],
                raw: true,
            });
            return rta;
        }
        catch (error) {
            console.error("Error in findAllBinnaclesByCHBJob:", error);
            throw error;
        }
    }
}
exports.default = JudicialBinnacleService;
