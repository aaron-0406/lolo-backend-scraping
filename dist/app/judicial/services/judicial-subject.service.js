"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialSubjectService {
    constructor() { }
    async findAll() {
        const rta = await models.JUDICIAL_SUBJECT.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.JUDICIAL_SUBJECT.findAll({
            where: { customerHasBankId: chb },
        });
        return rta;
    }
    async findByID(id) {
        const judicialSubject = await models.JUDICIAL_SUBJECT.findOne({
            where: {
                id,
            },
        });
        if (!judicialSubject) {
            throw boom_1.default.notFound("Materia no encontrado");
        }
        return judicialSubject;
    }
    async create(data) {
        const newJudicialSubject = await models.JUDICIAL_SUBJECT.create(data);
        return newJudicialSubject;
    }
    async update(id, changes) {
        const judicialSubject = await this.findByID(id);
        const oldJudicialSubject = Object.assign({}, judicialSubject.get());
        const newJudicialSubject = await judicialSubject.update(changes);
        return { oldJudicialSubject, newJudicialSubject };
    }
    async delete(id) {
        const judicialSubject = await this.findByID(id);
        const oldJudicialSubject = Object.assign({}, judicialSubject.get());
        await judicialSubject.destroy();
        return oldJudicialSubject;
    }
}
exports.default = JudicialSubjectService;
