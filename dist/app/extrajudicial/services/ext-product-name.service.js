"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ExtProductNameService {
    constructor() { }
    async findAll() {
        const rta = await models.EXT_PRODUCT_NAME.findAll();
        return rta;
    }
    async findAllByCHB(chb) {
        const rta = await models.EXT_PRODUCT_NAME.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("Nombres de productos no encontrados");
        }
        return rta;
    }
    async findByID(id) {
        const extProductName = await models.EXT_PRODUCT_NAME.findOne({
            where: {
                id_ext_product_name: id,
            },
        });
        if (!extProductName) {
            throw boom_1.default.notFound("Nombre de producto no encontrado");
        }
        return extProductName;
    }
    async create(data) {
        const newProductName = await models.EXT_PRODUCT_NAME.create(data);
        return newProductName;
    }
    async update(id, changes) {
        const extProductName = await this.findByID(id);
        const oldProductName = Object.assign({}, extProductName.get());
        const newProductName = await extProductName.update(changes);
        return { oldProductName, newProductName };
    }
    async delete(id) {
        const extProductName = await this.findByID(id);
        const oldProductName = Object.assign({}, extProductName.get());
        await extProductName.destroy();
        return oldProductName;
    }
}
exports.default = ExtProductNameService;
