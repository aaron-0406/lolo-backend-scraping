"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const customer_has_bank_model_1 = __importDefault(require("../many-to-many/customer-has-bank.model"));
const customer_user_model_1 = __importDefault(require("../customer-user.model"));
const MESSAGES_USERS_TABLE = "MESSAGES_USERS";
const { CUSTOMER_HAS_BANK_TABLE } = customer_has_bank_model_1.default;
const { CUSTOMER_USER_TABLE } = customer_user_model_1.default;
const MessagesUserSchema = {
    id: {
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
        field: "id_messages_users",
        type: sequelize_1.DataTypes.INTEGER,
    },
    messageId: {
        allowNull: false,
        field: "message_id",
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
    customerHasBankId: {
        allowNull: false,
        field: "customer_has_bank_id_customer_has_bank",
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: CUSTOMER_HAS_BANK_TABLE,
            key: "id_customer_has_bank",
        }
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
    }
};
class MessagesUsers extends sequelize_1.Model {
    static associate(models) {
        this.belongsTo(models.MESSAGE, {
            as: "message",
            foreignKey: "messageId",
        });
        this.belongsTo(models.CUSTOMER_USER, {
            as: "customerUser",
            foreignKey: "customerUserId",
        });
        this.belongsTo(models.CUSTOMER_HAS_BANK, {
            as: "customerHasBank",
            foreignKey: "customerHasBankId",
        });
    }
    static config(sequelize) {
        return {
            sequelize,
            tableName: MESSAGES_USERS_TABLE,
            modelName: MESSAGES_USERS_TABLE,
            timestamps: false,
            paranoid: true,
            deletedAt: "deleted_at",
        };
    }
}
exports.default = {
    MESSAGES_USERS_TABLE,
    MessagesUserSchema,
    MessagesUsers,
};
