"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const customer_has_bank_model_1 = __importDefault(require("../many-to-many/customer-has-bank.model"));
const customer_user_model_1 = __importDefault(require("../customer-user.model"));
const { CUSTOMER_HAS_BANK_TABLE } = customer_has_bank_model_1.default;
const { CUSTOMER_USER_TABLE } = customer_user_model_1.default;
const MESSAGE_TABLE = "MESSAGE";
const MessageSchema = {
    id: {
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
        field: "id_message",
        type: sequelize_1.DataTypes.INTEGER,
    },
    customerUserId: {
        allowNull: false,
        references: {
            model: CUSTOMER_USER_TABLE,
            key: "id_customer_user",
        },
        field: "customer_user_id_customer_user",
        type: sequelize_1.DataTypes.INTEGER,
    },
    subject: {
        allowNull: false,
        field: "subject",
        type: sequelize_1.DataTypes.STRING(150),
    },
    body: {
        allowNull: false,
        field: "body",
        type: sequelize_1.DataTypes.TEXT("long"),
    },
    wasRead: {
        allowNull: false,
        field: "was_read",
        type: sequelize_1.DataTypes.BOOLEAN,
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
    keyMessage: {
        allowNull: true,
        field: "key_message",
        type: sequelize_1.DataTypes.STRING(150),
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
class Message extends sequelize_1.Model {
    static associate(models) {
        this.belongsTo(models.CUSTOMER_HAS_BANK, { as: "customerHasBank" });
        this.hasMany(models.MESSAGES_USERS, {
            as: "messagesUsers",
            foreignKey: "messageId",
        });
    }
    static config(sequelize) {
        return {
            sequelize,
            tableName: MESSAGE_TABLE,
            modelName: MESSAGE_TABLE,
            timestamps: true,
            paranoid: true,
            deletedAt: "deleted_at",
        };
    }
}
exports.default = {
    MESSAGE_TABLE,
    MessageSchema,
    Message,
};
