"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const helpers_1 = require("../../../libs/helpers");
const sequelize_2 = require("sequelize");
const { models } = sequelize_1.default;
class CommentService {
    constructor() { }
    async findAllByClient(clientID) {
        const rta = await models.COMMENT.findAll({
            where: {
                client_id_client: clientID,
            },
            include: [
                {
                    model: models.CUSTOMER_USER,
                    as: "customerUser",
                    attributes: ["name"],
                },
                {
                    model: models.MANAGEMENT_ACTION,
                    as: "managementAction",
                    attributes: ["nameAction"],
                },
            ],
            order: [["id", "DESC"]],
        });
        return rta;
    }
    async findAllByDate(date) {
        const rta = await models.COMMENT.findAll({
            where: {
                date,
            },
            include: [
                {
                    model: models.CLIENT,
                    as: "client",
                    attributes: ["id", "code", "name", "cityId"],
                },
                {
                    model: models.MANAGEMENT_ACTION,
                    as: "managementAction",
                    attributes: ["id", "codeAction", "nameAction"],
                },
            ],
        });
        return JSON.parse(JSON.stringify(rta));
    }
    async chart(clientID) {
        const primerDia = (0, helpers_1.formatDate)((0, helpers_1.getFirstDayOfWeek)());
        const ultimoDia = (0, helpers_1.formatDate)((0, helpers_1.getLastDayOfWeek)());
        const rta = await models.COMMENT.findAll({
            attributes: [
                [sequelize_1.default.literal("DATE(date)"), "fecha"],
                [sequelize_1.default.fn("COUNT", sequelize_1.default.col("date")), "cantidad"],
            ],
            group: ["date"],
            where: {
                customer_user_id_customer_user: clientID,
                date: {
                    [sequelize_2.Op.between]: [primerDia, ultimoDia],
                },
            },
        });
        return JSON.parse(JSON.stringify(rta));
    }
    async findByID(id) {
        const comment = await models.COMMENT.findOne({
            where: {
                id_comment: id,
            },
            include: [
                {
                    model: models.CUSTOMER_USER,
                    as: "customerUser",
                    attributes: ["name"],
                },
                {
                    model: models.MANAGEMENT_ACTION,
                    as: "managementAction",
                    attributes: ["nameAction", "customerHasBankId"],
                },
            ],
        });
        if (!comment) {
            throw boom_1.default.notFound("Comment no encontrado");
        }
        return comment;
    }
    async create(data) {
        const newComment = await models.COMMENT.create(data);
        const commentFound = await this.findByID(newComment.dataValues.id);
        return commentFound;
    }
    async update(id, changes) {
        const comment = await this.findByID(id);
        const rta = await comment.update(changes);
        const commentFound = await this.findByID(rta.dataValues.id);
        return commentFound;
    }
    async delete(id) {
        const comment = await this.findByID(id);
        await comment.destroy();
        return { id };
    }
    async getCommentsGroupByDayWeekly(customerId) {
        const primerDia = (0, helpers_1.getFirstDayOfWeek)();
        const ultimoDia = (0, helpers_1.getLastDayOfWeek)();
        const primerDiaSemanaPasada = (0, helpers_1.restarDias)(primerDia, 7);
        const ultimoDiaSemanaPasada = (0, helpers_1.restarDias)(ultimoDia, 7);
        const query = `
        SELECT fecha.dia, COALESCE(COUNT(C.id_comment), 0) AS cantidad
        FROM (
          SELECT DATE('${(0, helpers_1.formatDate)(primerDiaSemanaPasada)}') + INTERVAL (days.number) DAY AS dia
          FROM (
            SELECT 0 AS number UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6
          ) AS days
          WHERE DATE('${(0, helpers_1.formatDate)(primerDiaSemanaPasada)}') + INTERVAL (days.number) DAY <= DATE('${(0, helpers_1.formatDate)(ultimoDiaSemanaPasada)}')
        ) AS fecha
        LEFT JOIN COMMENT C ON DATE(C.date) = fecha.dia
        INNER JOIN CUSTOMER_USER CU ON CU.id_customer_user = C.customer_user_id_customer_user
        INNER JOIN CUSTOMER CUS ON CUS.id_customer = CU.customer_id_customer
        WHERE CUS.id_customer = ${customerId}
        GROUP BY fecha.dia
    `;
        const comentariosPorDia = await sequelize_1.default.query(query);
        const diasSemana = [];
        while (primerDiaSemanaPasada <= ultimoDiaSemanaPasada) {
            diasSemana.push({
                dia: (0, helpers_1.formatDate)(primerDiaSemanaPasada),
                cantidad: 0,
            });
            primerDiaSemanaPasada.setDate(primerDiaSemanaPasada.getDate() + 1);
        }
        const diasFaltantes = diasSemana.filter((dia) => !comentariosPorDia[0].some((r) => r.dia === dia.dia));
        const resultadosFinales = [...comentariosPorDia[0], ...diasFaltantes];
        return (0, helpers_1.sortDaysByDate)(resultadosFinales, "dia");
    }
    async getCommentsGroupByGestorWeekly(customerId) {
        const primerDia = (0, helpers_1.getFirstDayOfWeek)();
        const ultimoDia = (0, helpers_1.getLastDayOfWeek)();
        const primerDiaSemanaPasada = (0, helpers_1.restarDias)(primerDia, 7);
        const ultimoDiaSemanaPasada = (0, helpers_1.restarDias)(ultimoDia, 7);
        const query = `
      SELECT CU.id_customer_user AS id,CU.name AS name, COUNT(C.id_comment) AS cantidad
      FROM COMMENT C
        INNER JOIN CUSTOMER_USER CU ON CU.id_customer_user = C.customer_user_id_customer_user
        INNER JOIN CUSTOMER CUS ON CUS.id_customer = CU.customer_id_customer
      WHERE CUS.id_customer=${customerId} AND
            C.date BETWEEN DATE('${(0, helpers_1.formatDate)(primerDiaSemanaPasada)}') AND DATE('${(0, helpers_1.formatDate)(ultimoDiaSemanaPasada)}')
      GROUP BY CU.id_customer_user
    `;
        const comentariosPorUsuario = await sequelize_1.default.query(query);
        const gestores = await models.CUSTOMER_USER.findAll({
            where: { customerId },
        });
        const newGestores = gestores.map((gestor) => {
            const gestorFound = comentariosPorUsuario[0].find((gestor2) => gestor2.name === gestor.dataValues.name);
            if (gestorFound) {
                return {
                    id: gestorFound.id,
                    name: gestorFound.name,
                    cantidad: gestorFound.cantidad,
                };
            }
            return {
                id: gestor.dataValues.id,
                name: gestor.dataValues.name,
                cantidad: 0,
            };
        });
        return newGestores;
    }
    async getCommentsGroupByBanks(customerId) {
        const primerDia = (0, helpers_1.getFirstDayOfWeek)();
        const ultimoDia = (0, helpers_1.getLastDayOfWeek)();
        const primerDiaSemanaPasada = (0, helpers_1.restarDias)(primerDia, 7);
        const ultimoDiaSemanaPasada = (0, helpers_1.restarDias)(ultimoDia, 7);
        const query = `
      SELECT  B.id_bank AS id, B.name AS name, COUNT(C.id_comment) AS cantidad
        FROM COMMENT C
        INNER JOIN CLIENT CLI ON CLI.id_client = C.client_id_client
        INNER JOIN CUSTOMER_HAS_BANK CHB ON CLI.customer_has_bank_id_customer_has_bank = CHB.id_customer_has_bank
        INNER JOIN BANK B ON B.id_bank = CHB.bank_id_bank
      WHERE CHB.customer_id_customer=${customerId}
            AND C.date BETWEEN DATE('${(0, helpers_1.formatDate)(primerDiaSemanaPasada)}') AND DATE('${(0, helpers_1.formatDate)(ultimoDiaSemanaPasada)}')
      GROUP BY B.id_bank
    `;
        const queryBank = `
      SELECT B.id_bank AS id, B.name AS name
      FROM BANK B
      INNER JOIN CUSTOMER_HAS_BANK CHB ON B.id_bank = CHB.bank_id_bank
      WHERE CHB.customer_id_customer=${customerId}
    `;
        const comentariosPorBanco = await sequelize_1.default.query(query);
        const banks = await sequelize_1.default.query(queryBank);
        const newBanks = banks[0].map((bank) => {
            const bankFound = comentariosPorBanco[0].find((bank2) => bank2.name === bank.name);
            if (bankFound) {
                return {
                    id: bankFound.id,
                    name: bankFound.name,
                    cantidad: bankFound.cantidad,
                };
            }
            return {
                id: bank.id,
                name: bank.name,
                cantidad: 0,
            };
        });
        return newBanks;
    }
    async getCommentsGroupByDayWeeklyUser(customerId, customerUserId) {
        const primerDia = (0, helpers_1.getFirstDayOfWeek)();
        const ultimoDia = (0, helpers_1.getLastDayOfWeek)();
        const primerDiaSemanaPasada = (0, helpers_1.restarDias)(primerDia, 7);
        const ultimoDiaSemanaPasada = (0, helpers_1.restarDias)(ultimoDia, 7);
        const query = `
        SELECT fecha.dia, COALESCE(COUNT(C.id_comment), 0) AS cantidad
        FROM (
          SELECT DATE('${(0, helpers_1.formatDate)(primerDiaSemanaPasada)}') + INTERVAL (days.number) DAY AS dia
          FROM (
            SELECT 0 AS number UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6
          ) AS days
          WHERE DATE('${(0, helpers_1.formatDate)(primerDiaSemanaPasada)}') + INTERVAL (days.number) DAY <= DATE('${(0, helpers_1.formatDate)(ultimoDiaSemanaPasada)}')
        ) AS fecha
        LEFT JOIN COMMENT C ON DATE(C.date) = fecha.dia
        INNER JOIN CUSTOMER_USER CU ON CU.id_customer_user = C.customer_user_id_customer_user
        INNER JOIN CUSTOMER CUS ON CUS.id_customer = CU.customer_id_customer
        WHERE CUS.id_customer = ${customerId} AND CU.id_customer_user = ${customerUserId}
        GROUP BY fecha.dia
    `;
        const comentariosPorDia = await sequelize_1.default.query(query);
        const diasSemana = [];
        while (primerDiaSemanaPasada <= ultimoDiaSemanaPasada) {
            diasSemana.push({
                dia: (0, helpers_1.formatDate)(primerDiaSemanaPasada),
                cantidad: 0,
            });
            primerDiaSemanaPasada.setDate(primerDiaSemanaPasada.getDate() + 1);
        }
        const diasFaltantes = diasSemana.filter((dia) => !comentariosPorDia[0].some((r) => r.dia === dia.dia));
        const resultadosFinales = [...comentariosPorDia[0], ...diasFaltantes];
        return (0, helpers_1.sortDaysByDate)(resultadosFinales, "dia");
    }
    async getCommentsGroupByGestorWeeklyUser(customerId, customerUserId) {
        const primerDia = (0, helpers_1.getFirstDayOfWeek)();
        const ultimoDia = (0, helpers_1.getLastDayOfWeek)();
        const primerDiaSemanaPasada = (0, helpers_1.restarDias)(primerDia, 7);
        const ultimoDiaSemanaPasada = (0, helpers_1.restarDias)(ultimoDia, 7);
        const query = `
      SELECT CU.id_customer_user AS id,CU.name AS name, COUNT(C.id_comment) AS cantidad
      FROM COMMENT C
        INNER JOIN CUSTOMER_USER CU ON CU.id_customer_user = C.customer_user_id_customer_user
        INNER JOIN CUSTOMER CUS ON CUS.id_customer = CU.customer_id_customer
      WHERE CUS.id_customer=${customerId} AND CU.id_customer_user = ${customerUserId} AND
            C.date BETWEEN DATE('${(0, helpers_1.formatDate)(primerDiaSemanaPasada)}') AND DATE('${(0, helpers_1.formatDate)(ultimoDiaSemanaPasada)}')
      GROUP BY CU.id_customer_user
    `;
        const comentariosPorUsuario = await sequelize_1.default.query(query);
        const gestores = await models.CUSTOMER_USER.findAll({
            where: { customerId, id: customerUserId },
        });
        const newGestores = gestores.map((gestor) => {
            const gestorFound = comentariosPorUsuario[0].find((gestor2) => gestor2.name === gestor.dataValues.name);
            if (gestorFound) {
                return {
                    id: gestorFound.id,
                    name: gestorFound.name,
                    cantidad: gestorFound.cantidad,
                };
            }
            return {
                id: gestor.dataValues.id,
                name: gestor.dataValues.name,
                cantidad: 0,
            };
        });
        return newGestores;
    }
    async getCommentsGroupByBanksUser(customerId, customerUserId) {
        const primerDia = (0, helpers_1.getFirstDayOfWeek)();
        const ultimoDia = (0, helpers_1.getLastDayOfWeek)();
        const primerDiaSemanaPasada = (0, helpers_1.restarDias)(primerDia, 7);
        const ultimoDiaSemanaPasada = (0, helpers_1.restarDias)(ultimoDia, 7);
        const query = `
      SELECT  B.id_bank AS id, B.name AS name, COUNT(C.id_comment) AS cantidad
        FROM COMMENT C
        INNER JOIN CLIENT CLI ON CLI.id_client = C.client_id_client
        INNER JOIN CUSTOMER_HAS_BANK CHB ON CLI.customer_has_bank_id_customer_has_bank = CHB.id_customer_has_bank
        INNER JOIN BANK B ON B.id_bank = CHB.bank_id_bank
        INNER JOIN CUSTOMER_USER CU ON CU.id_customer_user = C.customer_user_id_customer_user
      WHERE CHB.customer_id_customer=${customerId}
            AND CU.id_customer_user = ${customerUserId}
            AND C.date BETWEEN DATE('${(0, helpers_1.formatDate)(primerDiaSemanaPasada)}') AND DATE('${(0, helpers_1.formatDate)(ultimoDiaSemanaPasada)}')
      GROUP BY B.id_bank
    `;
        const queryBank = `
      SELECT B.id_bank AS id, B.name AS name
      FROM BANK B
      INNER JOIN CUSTOMER_HAS_BANK CHB ON B.id_bank = CHB.bank_id_bank
      WHERE CHB.customer_id_customer=${customerId}
    `;
        const comentariosPorBanco = await sequelize_1.default.query(query);
        const banks = await sequelize_1.default.query(queryBank);
        const newBanks = banks[0].map((bank) => {
            const bankFound = comentariosPorBanco[0].find((bank2) => bank2.name === bank.name);
            if (bankFound) {
                return {
                    id: bankFound.id,
                    name: bankFound.name,
                    cantidad: bankFound.cantidad,
                };
            }
            return {
                id: bank.id,
                name: bank.name,
                cantidad: 0,
            };
        });
        return newBanks;
    }
}
exports.default = CommentService;