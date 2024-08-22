"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialCollateralChargesEncumbrancesTypeLoadService {
    constructor() { }
    async findAll(chb) {
        const rta = await models.JUDICIAL_COLLATERAL_CHARGES_ENCUMBRANCES_TYPE_LOAD.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        return rta;
    }
    async findByID(id) {
        const judicialCollateralChargesEncumbrancesTypeLoad = await models.JUDICIAL_COLLATERAL_CHARGES_ENCUMBRANCES_TYPE_LOAD.findOne({
            where: {
                id,
            },
        });
        if (!judicialCollateralChargesEncumbrancesTypeLoad) {
            throw boom_1.default.notFound("Tipo de carga y gravamen no encontrado");
        }
        return judicialCollateralChargesEncumbrancesTypeLoad;
    }
    async create(data) {
        const newJudicialCollateralChargesEncumbrancesTypeLoad = await models.JUDICIAL_COLLATERAL_CHARGES_ENCUMBRANCES_TYPE_LOAD.create(data);
        return newJudicialCollateralChargesEncumbrancesTypeLoad;
    }
    async update(id, changes) {
        const judicialCollateralChargesEncumbrancesTypeLoad = await this.findByID(id);
        const oldJudicialCollateralChargesEncumbrancesTypeLoad = Object.assign({}, judicialCollateralChargesEncumbrancesTypeLoad.get());
        const newJudicialCollateralChargesEncumbrancesTypeLoad = await judicialCollateralChargesEncumbrancesTypeLoad.update(changes);
        return { oldJudicialCollateralChargesEncumbrancesTypeLoad, newJudicialCollateralChargesEncumbrancesTypeLoad };
    }
    async delete(id) {
        const judicialCollateralChargesEncumbrancesTypeLoad = await this.findByID(id);
        const oldJudicialCollateralChargesEncumbrancesTypeLoad = Object.assign({}, judicialCollateralChargesEncumbrancesTypeLoad.get());
        await judicialCollateralChargesEncumbrancesTypeLoad.destroy();
        return oldJudicialCollateralChargesEncumbrancesTypeLoad;
    }
}
exports.default = JudicialCollateralChargesEncumbrancesTypeLoadService;
