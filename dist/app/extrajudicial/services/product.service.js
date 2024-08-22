"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ProductService {
    constructor() { }
    //INFO: CLIENTS SECTION
    async getByClientId(clientId) {
        const rta = await models.PRODUCT.findAll({
            where: {
                client_id: clientId,
            },
            include: [
                { model: models.NEGOTIATION, as: "negotiation" },
                {
                    model: models.EXT_PRODUCT_NAME,
                    as: "extProductName",
                    attributes: ["id", "productName", "customerHasBankId"],
                },
                {
                    model: models.JUDICIAL_CASE_FILE,
                    as: "judicialCaseFile",
                    attributes: ["id", "numberCaseFile"],
                },
            ],
        });
        return JSON.parse(JSON.stringify(rta));
    }
    async getByProductId(id) {
        const product = await models.PRODUCT.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: models.NEGOTIATION,
                    as: "negotiation",
                    attributes: ["name", "customerHasBankId"],
                },
                {
                    model: models.EXT_PRODUCT_NAME,
                    as: "extProductName",
                    attributes: ["id", "productName", "customerHasBankId"],
                },
                {
                    model: models.JUDICIAL_CASE_FILE,
                    as: "judicialCaseFile",
                    attributes: ["id", "numberCaseFile"],
                },
            ],
        });
        if (!product)
            throw boom_1.default.notFound("Producto no encontrado");
        return product;
    }
    //INFO: JUDICIAL - CASE FILE SECTION
    async getByJudicialCaseFileId(judicialCaseFileId) {
        const rta = await models.PRODUCT.findAll({
            where: {
                judicial_case_file_id_judicial_case_file: judicialCaseFileId,
            },
            include: [
                { model: models.NEGOTIATION, as: "negotiation" },
                {
                    model: models.EXT_PRODUCT_NAME,
                    as: "extProductName",
                    attributes: ["id", "productName", "customerHasBankId"],
                },
                {
                    model: models.JUDICIAL_CASE_FILE,
                    as: "judicialCaseFile",
                    attributes: ["id", "numberCaseFile"],
                },
            ],
        });
        return JSON.parse(JSON.stringify(rta));
    }
    async assignJudicialCaseFileToProducts(productIds, judicialCaseFileId) {
        const listProducts = JSON.parse(productIds);
        for (const productId of listProducts) {
            await models.PRODUCT.update({ judicialCaseFileId }, { where: { id: productId } });
        }
        return this.getByJudicialCaseFileId(judicialCaseFileId);
    }
    async removeJudicialCaseFileFromProduct(productRemovedId, judicialCaseFileId) {
        const oldProduct = await models.PRODUCT.update({ judicialCaseFileId: null }, {
            where: {
                id: productRemovedId,
                judicial_case_file_id_judicial_case_file: judicialCaseFileId,
            },
        });
        return { id: productRemovedId, oldProduct };
    }
    //INFO: DASHBOARD SECTION
    async getByProductCode(code) {
        const product = await models.PRODUCT.findOne({
            where: {
                code,
            },
            include: [
                { model: models.NEGOTIATION, as: "negotiation" },
                {
                    model: models.EXT_PRODUCT_NAME,
                    as: "extProductName",
                    attributes: ["id", "productName", "customerHasBankId"],
                },
                {
                    model: models.JUDICIAL_CASE_FILE,
                    as: "judicialCaseFile",
                    attributes: ["id", "numberCaseFile"],
                },
            ],
        });
        return product;
    }
    async getAllByCustomerId(id) {
        const rta = await models.PRODUCT.findAll({
            where: {
                customerId: id,
            },
        });
        return JSON.parse(JSON.stringify(rta));
    }
    async create(product) {
        const pdc = await models.PRODUCT.findOne({
            where: {
                code: product.code,
                customerId: product.customerId,
            },
        });
        if (!pdc) {
            const newProduct = await models.PRODUCT.create(product);
            await newProduct.reload({
                include: [
                    {
                        model: models.NEGOTIATION,
                        as: "negotiation",
                        attributes: ["name", "customerHasBankId"],
                    },
                    {
                        model: models.EXT_PRODUCT_NAME,
                        as: "extProductName",
                        attributes: ["id", "productName", "customerHasBankId"],
                    },
                    {
                        model: models.JUDICIAL_CASE_FILE,
                        as: "judicialCaseFile",
                        attributes: ["id", "numberCaseFile"],
                    },
                ],
            });
            return newProduct;
        }
        throw boom_1.default.notFound("El código de producto ya existe");
    }
    async update(product, id) {
        const productFound = await this.getByProductId(id);
        const oldProduct = Object.assign({}, productFound.get());
        await productFound.update(product);
        const productEdited = await this.getByProductId(id);
        return { oldProduct, productEdited };
    }
    async delete(id) {
        const product = await this.getByProductId(id);
        const oldProduct = Object.assign({}, product.get());
        await product.destroy();
        return oldProduct;
    }
    async deleteByCode(code) {
        const product = await this.getByProductCode(code);
        if (product)
            await product.destroy();
        return Number(code);
    }
}
exports.default = ProductService;
