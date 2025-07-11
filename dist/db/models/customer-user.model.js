"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const customer_model_1 = __importDefault(require("./customer.model"));
const roles_model_1 = __importDefault(require("./roles.model"));
const CUSTOMER_USER_TABLE = "CUSTOMER_USER";
const CustomerUserSchema = {
    id: {
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
        field: "id_customer_user",
        type: sequelize_1.DataTypes.INTEGER,
    },
    name: {
        allowNull: false,
        type: sequelize_1.DataTypes.STRING(100),
    },
    lastName: {
        allowNull: false,
        field: "last_name",
        type: sequelize_1.DataTypes.STRING(100),
    },
    phone: {
        allowNull: false,
        type: sequelize_1.DataTypes.STRING(50),
    },
    dni: {
        allowNull: false,
        unique: true,
        type: sequelize_1.DataTypes.STRING(8),
    },
    email: {
        allowNull: false,
        unique: true,
        type: sequelize_1.DataTypes.STRING(70),
    },
    password: {
        allowNull: false,
        unique: true,
        type: sequelize_1.DataTypes.TEXT,
    },
    state: {
        allowNull: false,
        type: sequelize_1.DataTypes.TINYINT({ length: 1 }),
    },
    createdAt: {
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: "created_at",
        type: sequelize_1.DataTypes.DATE,
    },
    roleId: {
        allowNull: false,
        field: "role_id_role",
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: roles_model_1.default.ROLE_TABLE,
            key: "id_role",
        },
        onUpdate: "CASCADE",
        onDelete: "NO ACTION",
    },
    customerId: {
        allowNull: false,
        field: "customer_id_customer",
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: customer_model_1.default.CUSTOMER_TABLE,
            key: "id_customer",
        },
        onUpdate: "CASCADE",
        onDelete: "NO ACTION",
    },
    loginAttempts: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: "login_attempts",
    },
    code2fa: {
        allowNull: true,
        type: sequelize_1.DataTypes.STRING(70),
    },
    firstAccess: {
        allowNull: false,
        field: "first_access",
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
};
class CustomerUser extends sequelize_1.Model {
    static associate(models) {
        this.belongsTo(models.CUSTOMER, { as: "customer" });
        this.belongsTo(models.ROLE, { as: "role" });
        this.hasMany(models.CLIENT, {
            as: "client",
            foreignKey: "customerUserId",
        });
        this.hasMany(models.COMMENT, {
            as: "comment",
            foreignKey: "customerUserId",
        });
        this.hasMany(models.SCHEDULED_NOTIFICATIONS_USERS, {
            as: 'scheduledNotificationsUsers',
            foreignKey: 'customerUserId'
        });
        this.hasMany(models.JUDICIAL_CASE_FILE, {
            as: "customerUser",
            foreignKey: "customerUserId",
        });
        this.hasMany(models.JUDICIAL_CASE_FILE, {
            as: "responsibleUser",
            foreignKey: "responsibleUserId",
        });
        this.hasMany(models.MESSAGES_USERS, {
            as: "messagesUsers",
            foreignKey: "customerUserId",
        });
        this.hasMany(models.MESSAGE, {
            as: "messages",
            foreignKey: "customerUserId",
        });
        this.hasMany(models.USER_MESSAGE_SUBSCRIPTIONS, {
            as: "userMessageSubscriptions",
            foreignKey: "customerUserId",
        });
    }
    static config(sequelize) {
        return {
            sequelize,
            tableName: CUSTOMER_USER_TABLE,
            modelName: CUSTOMER_USER_TABLE,
            timestamps: false,
        };
    }
}
exports.default = { CUSTOMER_USER_TABLE, CustomerUserSchema, CustomerUser };
