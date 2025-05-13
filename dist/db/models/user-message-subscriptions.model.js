"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const customer_has_bank_model_1 = __importDefault(require("./many-to-many/customer-has-bank.model"));
const customer_user_model_1 = __importDefault(require("./customer-user.model"));
const { CUSTOMER_HAS_BANK_TABLE } = customer_has_bank_model_1.default;
const { CUSTOMER_USER_TABLE } = customer_user_model_1.default;
const USER_MESSAGE_SUBSCRIPTIONS_TABLE = "USER_MESSAGE_SUBSCRIPTIONS";
const UserMessageSubscriptionsSchema = {
    id: {
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
        field: "id_user_message_subscriptions",
        type: sequelize_1.DataTypes.INTEGER,
    },
    customerUserId: {
        allowNull: false,
        type: sequelize_1.DataTypes.INTEGER,
        field: "customer_user_id_customer_user",
        references: {
            model: CUSTOMER_USER_TABLE,
            key: "id_customer_user",
        },
        onUpdate: "CASCADE",
        onDelete: "NO ACTION",
    },
    customerHasBankId: {
        allowNull: false,
        type: sequelize_1.DataTypes.INTEGER,
        field: "customer_has_bank_id_customer_has_bank",
        references: {
            model: CUSTOMER_HAS_BANK_TABLE,
            key: "id_customer_has_bank",
        },
        onUpdate: "CASCADE",
        onDelete: "NO ACTION",
    },
    isActiveSubscription: {
        allowNull: false,
        type: sequelize_1.DataTypes.BOOLEAN,
        field: "is_active_subscription",
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
class UserMessageSubscriptions extends sequelize_1.Model {
    static associate(models) {
        this.belongsTo(models.CUSTOMER_HAS_BANK, {
            as: "customerHasBank",
            foreignKey: "customerHasBankId",
        });
        this.belongsTo(models.CUSTOMER_USER, {
            as: "customerUser",
            foreignKey: "customerUserId",
        });
    }
    static config(sequelize) {
        return {
            sequelize,
            tableName: USER_MESSAGE_SUBSCRIPTIONS_TABLE,
            modelName: USER_MESSAGE_SUBSCRIPTIONS_TABLE,
            timestamps: true,
            paranoid: true,
            deleteAt: "deleted_at",
        };
    }
}
exports.default = {
    USER_MESSAGE_SUBSCRIPTIONS_TABLE,
    UserMessageSubscriptionsSchema,
    UserMessageSubscriptions,
};
