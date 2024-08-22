"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
const TariffType = {
    CONTENTIOUS_PROCESS: "PROCESOS CONTENCIOSOS",
    REQUEST_OF: "POR SOLICITUD DE",
};
class TariffService {
    constructor() { }
    async findAll() {
        let contentiousProcessesHeaders = [];
        let requestOfHeaders = [];
        const rta = await models.TARIFF.findAll({
            include: [
                {
                    model: models.TARIFF_INTERVAL_MATCH,
                    as: "tariffIntervalMatch",
                    include: [
                        {
                            model: models.TARIFF_INTERVAL,
                            as: "tariffInterval",
                            attributes: ["id", "description", "interval", "intervalDescription"],
                        }
                    ]
                }
            ],
        });
        if (!rta) {
            throw boom_1.default.notFound("No existen tarifas");
        }
        const contentiousProcesses = rta.filter(tariff => tariff.dataValues.type === TariffType.CONTENTIOUS_PROCESS);
        const requestOf = rta.filter(tariff => tariff.dataValues.type === TariffType.REQUEST_OF);
        if (!contentiousProcesses.length)
            return;
        if (!contentiousProcesses[0].dataValues.tariffIntervalMatch.length)
            return;
        contentiousProcesses[0].dataValues.tariffIntervalMatch.forEach((intervalMatch) => {
            contentiousProcessesHeaders.push({
                description: intervalMatch.dataValues.tariffInterval.dataValues.description,
                headerTitle: intervalMatch.dataValues.tariffInterval.dataValues
                    .intervalDescription,
            });
        });
        if (!requestOf.length)
            return;
        if (!requestOf[0].dataValues.tariffIntervalMatch.length)
            return;
        requestOf[0].dataValues.tariffIntervalMatch.forEach((intervalMatch) => {
            requestOfHeaders.push({
                description: intervalMatch.dataValues.tariffInterval.dataValues.description,
                headerTitle: intervalMatch.dataValues.tariffInterval.dataValues
                    .intervalDescription,
            });
        });
        return { contentiousProcessesHeaders, requestOfHeaders, contentiousProcesses, requestOf };
    }
    async findAllByType(type) {
        const rta = await models.TARIFF.findAll({
            where: {
                type,
            },
            include: [
                {
                    model: models.TARIFF_INTERVAL_MATCH,
                    as: "intervals",
                    attributes: ["id", "value"],
                    include: [
                        {
                            model: models.TARIFF_INTERVAL,
                            as: "interval",
                            attributes: ["id", "description", "interval", "intervalDescription"],
                        }
                    ]
                }
            ],
        });
        if (!rta) {
            throw boom_1.default.notFound("No existen tarifas");
        }
        return rta;
    }
    async create(data) {
        const newTariff = await models.TARIFF.create(data);
        return newTariff;
    }
    async update(id, data) {
        const tariff = await models.TARIFF.findByPk(id);
        if (!tariff) {
            throw boom_1.default.notFound("Tarifa no encontrada");
        }
        await tariff.update(data);
        return tariff;
    }
    async delete(id) {
        const tariff = await models.TARIFF.findByPk(id);
        if (!tariff) {
            throw boom_1.default.notFound("Tarifa no encontrada");
        }
        await tariff.destroy();
        return { id };
    }
}
exports.default = TariffService;
