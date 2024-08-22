"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const sequelize_2 = require("sequelize");
const { models } = sequelize_1.default;
class JudicialCaseFileRelatedProcessService {
    constructor() { }
    async findAllRelatedProcessbyCaseFileId(fileCaseId, query) {
        const { limit, page, filter, courts, proceduralWays, subjects, users, responsibles } = query;
        const limite = parseInt(limit, 10);
        const pagina = parseInt(page, 10);
        const clientName = filter;
        const listCourts = JSON.parse(courts);
        const listProceduralWays = JSON.parse(proceduralWays);
        const listSubjects = JSON.parse(subjects);
        const listResponsibles = JSON.parse(responsibles);
        const listUsers = JSON.parse(users);
        const filters = {};
        if (listCourts.length) {
            filters.judicial_court_id_judicial_court = { [sequelize_2.Op.in]: listCourts };
        }
        if (listProceduralWays.length) {
            filters.judicial_procedural_way_id_judicial_procedural_way = {
                [sequelize_2.Op.in]: listProceduralWays,
            };
        }
        if (listSubjects.length) {
            filters.judicial_subject_id_judicial_subject = { [sequelize_2.Op.in]: listSubjects };
        }
        if (listUsers.length) {
            filters.customer_user_id_customer_user = { [sequelize_2.Op.in]: listUsers };
        }
        if (listResponsibles.length) {
            filters.responsible_user_id = { [sequelize_2.Op.in]: listResponsibles };
        }
        let filtersWhere = {
            id_judicial_case_file_related: fileCaseId,
        };
        // Agregar filtro por nombre de cliente si se proporciona
        if (clientName) {
            filtersWhere = Object.assign(Object.assign({}, filtersWhere), { "$client.name$": { [sequelize_2.Op.like]: `%${clientName}%` } });
        }
        // Combinar filtros adicionales si se proporcionan
        if (Object.keys(filters).length > 0) {
            filtersWhere = {
                [sequelize_2.Op.and]: [{ [sequelize_2.Op.or]: [filters] }, filtersWhere],
            };
        }
        const quantity = await models.JUDICIAL_CASE_FILE.count({
            include: [
                {
                    model: models.CLIENT,
                    as: "client",
                },
            ],
            where: filtersWhere,
        });
        const caseFiles = await models.JUDICIAL_CASE_FILE.findAll({
            include: [
                {
                    model: models.CUSTOMER_USER,
                    as: "customerUser",
                    attributes: ["id", "name"],
                },
                {
                    model: models.CUSTOMER_USER,
                    as: "responsibleUser",
                    attributes: ["id", "name"],
                },
                {
                    model: models.JUDICIAL_COURT,
                    as: "judicialCourt",
                },
                {
                    model: models.JUDICIAL_PROCEDURAL_WAY,
                    as: "judicialProceduralWay",
                },
                {
                    model: models.JUDICIAL_SUBJECT,
                    as: "judicialSubject",
                },
                {
                    model: models.JUDICIAL_SEDE,
                    as: "judicialSede",
                },
                {
                    model: models.CLIENT,
                    as: "client",
                    attributes: ["id", "name"],
                },
            ],
            limit: limite,
            offset: (pagina - 1) * limite,
            where: filtersWhere,
        });
        return { caseFiles, quantity };
    }
    async findAll() {
        const rta = await models.JUDICIAL_CASE_FILE.findAll();
        return rta;
    }
    async findAllByClient(clientId) {
        const judicialCaseFile = await models.JUDICIAL_CASE_FILE.findAll({
            where: {
                clientId,
            },
        });
        if (!judicialCaseFile) {
            throw boom_1.default.notFound("Expedientes no encontrados");
        }
        return judicialCaseFile;
    }
    async findAllByCHB(chb, query) {
        const { limit, page, filter, courts, proceduralWays, subjects, users } = query;
        const limite = parseInt(limit, 10);
        const pagina = parseInt(page, 10);
        const clientName = filter;
        const listCourts = JSON.parse(courts);
        const listProceduralWays = JSON.parse(proceduralWays);
        const listSubjects = JSON.parse(subjects);
        const listUsers = JSON.parse(users);
        const filters = {};
        if (listCourts.length) {
            filters.judicial_court_id_judicial_court = { [sequelize_2.Op.in]: listCourts };
        }
        if (listProceduralWays.length) {
            filters.judicial_procedural_way_id_judicial_procedural_way = {
                [sequelize_2.Op.in]: listProceduralWays,
            };
        }
        if (listSubjects.length) {
            filters.judicial_subject_id_judicial_subject = { [sequelize_2.Op.in]: listSubjects };
        }
        if (listUsers.length) {
            filters.customer_user_id_customer_user = { [sequelize_2.Op.in]: listUsers };
        }
        let filtersWhere = {
            customer_has_bank_id: chb,
        };
        // Agregar filtro por nombre de cliente si se proporciona
        if (clientName) {
            filtersWhere = Object.assign(Object.assign({}, filtersWhere), { "$client.name$": { [sequelize_2.Op.like]: `%${clientName}%` } });
        }
        // Combinar filtros adicionales si se proporcionan
        if (Object.keys(filters).length > 0) {
            filtersWhere = {
                [sequelize_2.Op.and]: [{ [sequelize_2.Op.or]: [filters] }, filtersWhere],
            };
        }
        const quantity = await models.JUDICIAL_CASE_FILE.count({
            include: [
                {
                    model: models.CLIENT,
                    as: "client",
                },
            ],
            where: filtersWhere,
        });
        const caseFiles = await models.JUDICIAL_CASE_FILE.findAll({
            include: [
                {
                    model: models.CUSTOMER_USER,
                    as: "customerUser",
                    attributes: ["id", "name"],
                },
                {
                    model: models.CUSTOMER_USER,
                    as: "responsibleUser",
                    attributes: ["id", "name"],
                },
                {
                    model: models.JUDICIAL_COURT,
                    as: "judicialCourt",
                },
                {
                    model: models.JUDICIAL_PROCEDURAL_WAY,
                    as: "judicialProceduralWay",
                },
                {
                    model: models.JUDICIAL_SUBJECT,
                    as: "judicialSubject",
                },
                {
                    model: models.CLIENT,
                    as: "client",
                    attributes: ["id", "name"],
                },
            ],
            limit: limite,
            offset: (pagina - 1) * limite,
            where: filtersWhere,
        });
        return { caseFiles, quantity };
    }
    async existNumberCaseFile(customerId, numberCaseFile) {
        const judicialCaseFile = await models.JUDICIAL_CASE_FILE.findOne({
            where: {
                number_case_file: numberCaseFile,
            },
        });
        if (!judicialCaseFile) {
            return false;
        }
        const customerHasBank = await models.CUSTOMER_HAS_BANK.findOne({
            where: {
                id_customer_has_bank: judicialCaseFile === null || judicialCaseFile === void 0 ? void 0 : judicialCaseFile.dataValues.customerHasBankId,
            },
        });
        if (!customerHasBank) {
            return false;
        }
        if (customerId == customerHasBank.dataValues.idCustomer) {
            return true;
        }
        else {
            return false;
        }
    }
    async findByID(id) {
        const judicialCaseFile = await models.JUDICIAL_CASE_FILE.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: models.CUSTOMER_USER,
                    as: "customerUser",
                    attributes: ["id", "name"],
                },
                {
                    model: models.JUDICIAL_COURT,
                    as: "judicialCourt",
                },
                {
                    model: models.JUDICIAL_PROCEDURAL_WAY,
                    as: "judicialProceduralWay",
                },
                {
                    model: models.JUDICIAL_SUBJECT,
                    as: "judicialSubject",
                },
                {
                    model: models.CLIENT,
                    as: "client",
                    attributes: ["id", "name"],
                },
            ],
        });
        if (!judicialCaseFile) {
            throw boom_1.default.notFound("Expediente no encontrado");
        }
        return judicialCaseFile;
    }
    async findByNumberCaseFile(numberCaseFile, chb) {
        const judicialCaseFile = await models.JUDICIAL_CASE_FILE.findOne({
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
                            model: models.CUSTOMER_USER,
                            as: "customerUser",
                            attributes: ["id", "name"],
                        },
                    ],
                },
            ],
            where: {
                numberCaseFile,
                customer_has_bank_id: chb,
            },
        });
        if (!judicialCaseFile) {
            throw boom_1.default.notFound("Expediente no encontrado");
        }
        return judicialCaseFile;
    }
    async findRelatedNumberCaseFile(numberCaseFile, chb) {
        const codes = numberCaseFile.split("-");
        codes[2] = "%";
        const filterNumberCaseFile = codes.join("-");
        const judicialCaseFile = await models.JUDICIAL_CASE_FILE.findAll({
            include: {
                model: models.CLIENT,
                as: "client",
                include: [
                    {
                        model: models.CUSTOMER_USER,
                        as: "customerUser",
                        attributes: ["id", "name"],
                    },
                ],
            },
            where: {
                numberCaseFile: {
                    [sequelize_2.Op.like]: filterNumberCaseFile,
                },
                customer_has_bank_id: chb,
            },
        });
        if (!judicialCaseFile) {
            throw boom_1.default.notFound("Expediente no encontrado");
        }
        return judicialCaseFile;
    }
    async create(data, customerId) {
        const existCaseFile = await this.existNumberCaseFile(customerId, data.numberCaseFile);
        if (!existCaseFile) {
            const newJudicialCaseFile = await models.JUDICIAL_CASE_FILE.create(data);
            const judicialCaseFile = await this.findByID(newJudicialCaseFile.dataValues.id);
            return judicialCaseFile;
        }
        else {
            throw boom_1.default.notFound("Ya existe un expediente con este código");
        }
    }
    async update(id, changes) {
        const judicialCaseFile = await this.findByID(id);
        const oldJudicialCaseFile = Object.assign({}, judicialCaseFile.get());
        const newJudicialCaseFile = await judicialCaseFile.update(changes);
        return { oldJudicialCaseFile, newJudicialCaseFile };
    }
    async updateProcessStatus(id, changes) {
        const judicialCaseFile = await this.findByID(id);
        const rta = await judicialCaseFile.update(changes);
        return rta;
    }
    async delete(id) {
        const client = await this.findByID(id);
        const oldJudicialCaseFile = Object.assign({}, client.get());
        await client.destroy();
        return oldJudicialCaseFile;
    }
}
exports.default = JudicialCaseFileRelatedProcessService;
