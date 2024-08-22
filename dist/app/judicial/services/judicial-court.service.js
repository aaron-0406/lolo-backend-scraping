"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialCourtService {
    constructor() { }
    async findAll() {
        const rta = await models.JUDICIAL_COURT.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_COURT.findAll({
            where: { customerHasBankId: chb },
            include: [
                {
                    model: models.CITY,
                    as: "city",
                    attributes: ["id", "name"],
                },
            ],
        });
        return rta;
    }
    async findByID(id) {
        const judicialCourt = await models.JUDICIAL_COURT.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: models.CITY,
                    as: "city",
                    attributes: ["id", "name"],
                },
            ],
        });
        if (!judicialCourt) {
            throw boom_1.default.notFound("Juzgado no encontrado");
        }
        return judicialCourt;
    }
    async create(data) {
        const newJudicialCourt = await models.JUDICIAL_COURT.create(data);
        await newJudicialCourt.reload({
            include: {
                model: models.CITY,
                as: "city",
                attributes: ["id", "name"],
            },
        });
        return newJudicialCourt;
    }
    async update(id, changes) {
        const judicialCourt = await this.findByID(id);
        const oldJudicialCourt = Object.assign({}, judicialCourt.get());
        const newJudicialCourt = await judicialCourt.update(changes);
        await newJudicialCourt.reload({
            include: {
                model: models.CITY,
                as: "city",
                attributes: ["id", "name"],
            },
        });
        return { oldJudicialCourt, newJudicialCourt };
    }
    async delete(id) {
        const court = await this.findByID(id);
        const oldJudicialCourt = Object.assign({}, court.get());
        await court.destroy();
        return oldJudicialCourt;
    }
}
exports.default = JudicialCourtService;
