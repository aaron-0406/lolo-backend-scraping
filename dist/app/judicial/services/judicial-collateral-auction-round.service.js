"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class JudicialCollateralAuctionRoundService {
    constructor() { }
    async findAllAuctionbyCollateralId(collateralId, chb, query) {
        let filtersWhere = {
            judicialCollateralIdJudicialCollateral: collateralId,
            customerHasBankId: chb,
        };
        try {
            const judicialCollateralAuctionRounds = await models.JUDICIAL_COLLATERAL_AUCTION_ROUND.findAll({
                where: filtersWhere,
                attributes: {
                    exclude: ["judicialCollateralId"]
                }
            });
            if (!judicialCollateralAuctionRounds) {
                throw boom_1.default.notFound("No se encontraron rondas de remate");
            }
            return judicialCollateralAuctionRounds;
        }
        catch (error) {
            console.log(error);
        }
    }
    async findAllAuctionbyCaseFileId(caseFileId) {
        try {
            const rta = await models.JUDICIAL_CASE_FILE_HAS_COLLATERAL.findAll({
                where: {
                    judicialCaseFileId: caseFileId,
                },
                include: [
                    {
                        model: models.JUDICIAL_COLLATERAL,
                        as: "judicialCollateral",
                        where: {
                            deletedAt: null,
                        },
                        include: [
                            {
                                model: models.JUDICIAL_COLLATERAL_AUCTION_ROUND,
                                as: "judicialCollateralAuctionRound",
                                where: {
                                    deletedAt: null,
                                },
                                attributes: {
                                    exclude: ["judicialCollateralId"]
                                }
                            }
                        ]
                    }
                ]
            });
            const judicialCollateralAuctionRounds = rta.flatMap((item) => item.dataValues.judicialCollateral.dataValues.judicialCollateralAuctionRound);
            if (!judicialCollateralAuctionRounds || judicialCollateralAuctionRounds.length === 0) {
                throw boom_1.default.notFound("No se encontraron rondas de remate");
            }
            return judicialCollateralAuctionRounds;
        }
        catch (error) {
            console.log(error);
        }
    }
    async getAuctionById(chb, collateralId, id) {
        try {
            const judicialCollateralAuctionRound = await models.JUDICIAL_COLLATERAL_AUCTION_ROUND.findOne({
                where: {
                    id,
                    customerHasBankId: chb,
                    judicialCollateralIdJudicialCollateral: collateralId,
                },
                attributes: {
                    exclude: ["judicialCollateralId"]
                }
            });
            if (!judicialCollateralAuctionRound)
                throw boom_1.default.notFound("Ronda de remate no encontrada");
            return judicialCollateralAuctionRound;
        }
        catch (error) {
            console.log(error);
        }
    }
    async create(data) {
        try {
            const newJudicialCollateralAuctionRound = await models.JUDICIAL_COLLATERAL_AUCTION_ROUND.create(data);
            return newJudicialCollateralAuctionRound;
        }
        catch (error) {
            console.log(error);
        }
    }
    async update(chb, collateralId, id, data) {
        try {
            const judicialCollateralAuctionRound = await models.JUDICIAL_COLLATERAL_AUCTION_ROUND.findOne({
                where: {
                    id,
                    customerHasBankId: chb,
                    judicialCollateralIdJudicialCollateral: collateralId,
                },
                attributes: {
                    exclude: ["judicialCollateralId"]
                }
            });
            if (!judicialCollateralAuctionRound) {
                throw boom_1.default.notFound("Ronda de remate no encontrada");
            }
            const oldData = Object.assign({}, judicialCollateralAuctionRound === null || judicialCollateralAuctionRound === void 0 ? void 0 : judicialCollateralAuctionRound.get());
            const newData = await judicialCollateralAuctionRound.update(data);
            return { oldData, newData };
        }
        catch (error) {
            console.log(error);
        }
    }
    async delete(chb, collateralId, id) {
        try {
            const judicialCollateralAuctionRound = await models.JUDICIAL_COLLATERAL_AUCTION_ROUND.findOne({
                where: {
                    id,
                    customerHasBankId: chb,
                    judicialCollateralIdJudicialCollateral: collateralId,
                },
                attributes: {
                    exclude: ["judicialCollateralId"]
                }
            });
            const oldData = Object.assign({}, judicialCollateralAuctionRound === null || judicialCollateralAuctionRound === void 0 ? void 0 : judicialCollateralAuctionRound.get());
            if (!judicialCollateralAuctionRound)
                throw boom_1.default.notFound("Ronda de remate no encontrada");
            await judicialCollateralAuctionRound.destroy();
            return oldData;
        }
        catch (error) {
            console.log(error);
        }
    }
}
exports.default = JudicialCollateralAuctionRoundService;