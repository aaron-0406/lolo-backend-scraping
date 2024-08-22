"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class DirectionService {
    constructor() { }
    async findAll() {
        const rta = await models.DIRECTION.findAll();
        return rta;
    }
    async findAllByClient(clientID) {
        const rta = await models.DIRECTION.findAll({
            where: {
                client_id_client: clientID,
            },
            include: [
                {
                    model: models.EXT_ADDRESS_TYPE,
                    as: "addressType",
                    attributes: ["type"],
                },
            ],
        });
        return rta;
    }
    async findByID(id) {
        const direction = await models.DIRECTION.findOne({
            where: {
                id_direction: id,
            },
            include: [
                {
                    model: models.EXT_ADDRESS_TYPE,
                    as: "addressType",
                    attributes: ["type", "customerHasBankId"],
                },
            ],
        });
        if (!direction)
            throw boom_1.default.notFound("Dirección no encontrada");
        return direction;
    }
    async create(data) {
        const newDirection = await models.DIRECTION.create(data);
        await newDirection.reload({
            include: [
                {
                    model: models.EXT_ADDRESS_TYPE,
                    as: "addressType",
                    attributes: ["type"],
                },
            ],
        });
        return newDirection;
    }
    async update(id, changes) {
        const direction = await this.findByID(id);
        const rta = await direction.update(changes);
        await rta.reload({
            include: [
                {
                    model: models.EXT_ADDRESS_TYPE,
                    as: "addressType",
                    attributes: ["type"],
                },
            ],
        });
        return rta;
    }
    async delete(id) {
        const direction = await this.findByID(id);
        await direction.destroy();
        return { id };
    }
}
exports.default = DirectionService;
