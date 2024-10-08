"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const customer_has_bank_model_1 = __importDefault(require("./many-to-many/customer-has-bank.model"));
const client_model_1 = __importDefault(require("./client.model"));
const ext_contact_type_model_1 = __importDefault(require("./ext-contact-type.model"));
const { CUSTOMER_HAS_BANK_TABLE } = customer_has_bank_model_1.default;
const EXT_CONTACT_TABLE = "EXT_CONTACT";
const ExtContactSchema = {
    id: {
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
        field: "id_ext_contact",
        type: sequelize_1.DataTypes.INTEGER,
    },
    name: {
        allowNull: false,
        type: sequelize_1.DataTypes.STRING(200),
    },
    phone: {
        allowNull: true,
        type: sequelize_1.DataTypes.STRING(50),
    },
    email: {
        allowNull: true,
        type: sequelize_1.DataTypes.STRING(200),
    },
    dni: {
        allowNull: true,
        type: sequelize_1.DataTypes.STRING(20),
    },
    state: {
        allowNull: false,
        type: sequelize_1.DataTypes.TINYINT({ length: 1 }),
    },
    clientId: {
        allowNull: false,
        field: "client_id_client",
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: client_model_1.default.CLIENT_TABLE,
            key: "id_client",
        },
        onUpdate: "CASCADE",
        onDelete: "NO ACTION",
    },
    customerHasBankId: {
        allowNull: false,
        field: "customer_has_bank_id_customer_has_bank",
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: CUSTOMER_HAS_BANK_TABLE,
            key: "id_customer_has_bank",
        },
        onUpdate: "CASCADE",
        onDelete: "NO ACTION",
    },
    extContactTypeId: {
        allowNull: true,
        field: "ext_contact_type_id_ext_contact_type",
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: ext_contact_type_model_1.default.EXT_CONTACT_TYPE_TABLE,
            key: "id_ext_contact_type",
        },
        onUpdate: "CASCADE",
        onDelete: "NO ACTION",
    },
    createdAt: {
        allowNull: false,
        field: "created_at",
        defaultValue: sequelize_1.DataTypes.NOW,
        type: sequelize_1.DataTypes.DATE,
    },
    updatedAt: {
        allowNull: false,
        field: "updated_at",
        defaultValue: sequelize_1.DataTypes.NOW,
        type: sequelize_1.DataTypes.DATE,
    },
    deletedAt: {
        allowNull: true,
        field: "deleted_at",
        type: sequelize_1.DataTypes.DATE,
    },
};
class ExtContact extends sequelize_1.Model {
    static associate(models) {
        this.belongsTo(models.CLIENT, { as: "client" });
        this.belongsTo(models.CUSTOMER_HAS_BANK, { as: "customerHasBank" });
        this.belongsTo(models.EXT_CONTACT_TYPE, {
            as: "extContactType",
            foreignKey: "extContactTypeId",
        });
    }
    static config(sequelize) {
        return {
            sequelize,
            tableName: EXT_CONTACT_TABLE,
            modelName: EXT_CONTACT_TABLE,
            timestamps: true,
            paranoid: true,
            deletedAt: "deleted_at",
        };
    }
}
exports.default = { EXT_CONTACT_TABLE, ExtContactSchema, ExtContact };
