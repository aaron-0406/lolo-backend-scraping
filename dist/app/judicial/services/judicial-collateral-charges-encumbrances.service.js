"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialCollateralChargesEncumbrancesService {
    constructor() { }
    async findAllByCollateralId(collateralId) {
        try {
            const rta = await models.JUDICIAL_COLLATERAL_CHARGES_ENCUMBRANCES.findAll({
                where: {
                    judicialCollateralIdJudicialCollateral: collateralId,
                },
                attributes: {
                    exclude: [
                        "judicialCollateralChargesEncumbrancesTypeLoadId",
                        "judicialCollateralChargesEncumbrancesId",
                    ],
                },
            });
            if (!rta) {
                throw boom_1.default.notFound("Collateral cargas y gravantes no encontradas");
            }
            return rta;
        }
        catch (error) {
            console.error(error);
        }
    }
    async findByID(id) {
        const judicialCollateralChargesEncumbrances = await models.JUDICIAL_COLLATERAL_CHARGES_ENCUMBRANCES.findOne({
            where: {
                id,
            },
            attributes: {
                exclude: [
                    "judicialCollateralChargesEncumbrancesTypeLoadId",
                    "judicialCollateralChargesEncumbrancesId",
                ],
            },
        });
        if (!judicialCollateralChargesEncumbrances) {
            throw boom_1.default.notFound("Collateral charges encumbrances no encontrado");
        }
        return judicialCollateralChargesEncumbrances;
    }
    async create(data) {
        const newJudicialCollateralChargesEncumbrances = await models.JUDICIAL_COLLATERAL_CHARGES_ENCUMBRANCES.create(data);
        return newJudicialCollateralChargesEncumbrances;
    }
    async update(id, changes) {
        const judicialCollateralChargesEncumbrances = await this.findByID(id);
        const rta = await judicialCollateralChargesEncumbrances.update(changes);
        return rta;
    }
    async delete(id) {
        const judicialCollateralChargesEncumbrances = await this.findByID(id);
        await judicialCollateralChargesEncumbrances.destroy();
        return { id };
    }
}
exports.default = JudicialCollateralChargesEncumbrancesService;
