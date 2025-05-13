"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const customer_has_bank_model_1 = __importDefault(require("../many-to-many/customer-has-bank.model"));
const customer_user_model_1 = __importDefault(require("../customer-user.model"));
const client_model_1 = __importDefault(require("../client.model"));
const judicial_case_file_model_1 = __importDefault(require("../judicial-case-file.model"));
const { CUSTOMER_HAS_BANK_TABLE } = customer_has_bank_model_1.default;
const { CUSTOMER_USER_TABLE } = customer_user_model_1.default;
const { CLIENT_TABLE } = client_model_1.default;
const { JUDICIAL_CASE_FILE_TABLE } = judicial_case_file_model_1.default;
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
    clientId: {
        allowNull: true,
        field: "client_id_client",
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: CLIENT_TABLE,
            key: "id_client",
        },
        onUpdate: "CASCADE",
        onDelete: "NO ACTION",
    },
    judicialCaseFileId: {
        allowNull: true,
        field: "case_file_id_case_file",
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: JUDICIAL_CASE_FILE_TABLE,
            key: "id_judicial_case_file",
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
class Message extends sequelize_1.Model {
    static associate(models) {
        this.belongsTo(models.CUSTOMER_HAS_BANK, { as: "customerHasBank" });
        this.belongsTo(models.CLIENT, { as: "client" });
        this.belongsTo(models.JUDICIAL_CASE_FILE, { as: "judicialCaseFile" });
        this.hasMany(models.MESSAGES_USERS, {
            as: "messagesUsers",
            foreignKey: "messageId",
        });
        this.belongsTo(models.CUSTOMER_USER, {
            as: "customerUser",
            foreignKey: "customerUserId",
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
