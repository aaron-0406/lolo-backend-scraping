"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const judicial_case_file_model_1 = __importDefault(require("./judicial-case-file.model"));
const customer_has_bank_model_1 = __importDefault(require("./many-to-many/customer-has-bank.model"));
const judicial_bin_procedural_stage_model_1 = __importDefault(require("./judicial-bin-procedural-stage.model"));
const judicial_bin_type_binnacle_model_1 = __importDefault(require("./judicial-bin-type-binnacle.model"));
const JUDICIAL_BINNACLE_TABLE = "JUDICIAL_BINNACLE";
const { JUDICIAL_CASE_FILE_TABLE } = judicial_case_file_model_1.default;
const { JUDICIAL_BIN_PROCEDURAL_STAGE_TABLE } = judicial_bin_procedural_stage_model_1.default;
const { CUSTOMER_HAS_BANK_TABLE } = customer_has_bank_model_1.default;
const { JUDICIAL_BIN_TYPE_BINNACLE_TABLE } = judicial_bin_type_binnacle_model_1.default;
const JudicialBinnacleSchema = {
    id: {
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
        field: "id_judicial_binnacle",
        type: sequelize_1.DataTypes.INTEGER,
    },
    binnacleTypeId: {
        allowNull: false,
        type: sequelize_1.DataTypes.INTEGER,
        field: "type_binnacle_id_type_binnacle",
        references: {
            model: JUDICIAL_BIN_TYPE_BINNACLE_TABLE,
            key: "id_judicial_bin_type_binnacle",
        },
    },
    createdAt: {
        allowNull: false,
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: "created_at",
    },
    updatedAt: {
        allowNull: false,
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: "updated_at",
    },
    deletedAt: {
        allowNull: true,
        type: sequelize_1.DataTypes.DATE,
        field: "deleted_at",
    },
    customerHasBankId: {
        allowNull: false,
        type: sequelize_1.DataTypes.INTEGER,
        field: "customer_has_bank_id_customer_has_bank",
        references: {
            model: CUSTOMER_HAS_BANK_TABLE,
            key: "id_customer_has_bank",
        },
    },
    date: {
        allowNull: false,
        type: sequelize_1.DataTypes.DATE,
        field: "date",
    },
    judicialBinProceduralStageId: {
        allowNull: false,
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: null,
        references: {
            model: JUDICIAL_BIN_PROCEDURAL_STAGE_TABLE,
            key: "id_judicial_bin_procedural_stage",
        },
        field: "judicial_bin_procedural_stage_id_judicial_bin_procedural_stage",
    },
    judicialFileCaseId: {
        allowNull: false,
        type: sequelize_1.DataTypes.INTEGER,
        field: "judicial_file_case_id_judicial_file_case",
        references: {
            model: JUDICIAL_CASE_FILE_TABLE,
            key: "id_judicial_case_file",
        },
        onUpdate: "CASCADE",
        onDelete: "NO ACTION",
    },
    lastPerformed: {
        allowNull: false,
        type: sequelize_1.DataTypes.TEXT("long"),
        field: "last_performed",
    },
    index: {
        allowNull: true,
        type: sequelize_1.DataTypes.INTEGER,
        field: "index",
    },
    resolutionDate: {
        allowNull: true,
        type: sequelize_1.DataTypes.DATE,
        field: "resolution_date",
    },
    entryDate: {
        allowNull: true,
        type: sequelize_1.DataTypes.DATE,
        field: "entry_date",
    },
    notificationType: {
        allowNull: true,
        type: sequelize_1.DataTypes.STRING(200),
        field: "notification_type",
    },
    acto: {
        allowNull: true,
        type: sequelize_1.DataTypes.STRING(200),
        field: "acto",
    },
    fojas: {
        allowNull: true,
        type: sequelize_1.DataTypes.NUMBER,
        field: "fojas",
    },
    folios: {
        allowNull: true,
        type: sequelize_1.DataTypes.NUMBER,
        field: "folios",
    },
    provedioDate: {
        allowNull: true,
        type: sequelize_1.DataTypes.DATE,
        field: "provedio_date",
    },
    userDescription: {
        allowNull: true,
        type: sequelize_1.DataTypes.STRING(200),
        field: "user_description",
    },
    createdBy: {
        allowNull: true,
        type: sequelize_1.DataTypes.NUMBER,
        field: "created_by",
    },
    totalTariff: {
        allowNull: false,
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: "total_tariff",
    },
    tariffHistory: {
        allowNull: false,
        defaultValue: "",
        type: sequelize_1.DataTypes.TEXT("long"),
        field: "tariff_history",
    },
};
class JudicialBinnacle extends sequelize_1.Model {
    static associate(models) {
        this.belongsTo(models.CUSTOMER_HAS_BANK, { as: "customerHasBank" });
        this.belongsTo(models.JUDICIAL_CASE_FILE, {
            as: "judicialFileCaseBinnacles",
            foreignKey: "judicialFileCaseId",
        });
        this.hasMany(models.JUDICIAL_BIN_FILE, {
            as: "judicialBinFiles",
            foreignKey: "judicialBinnacleId",
        });
        this.belongsTo(models.JUDICIAL_BIN_TYPE_BINNACLE, { as: "binnacleType" });
        this.belongsTo(models.JUDICIAL_BIN_PROCEDURAL_STAGE, {
            as: "judicialBinProceduralStage",
        });
        this.hasMany(models.JUDICIAL_BIN_NOTIFICATION, {
            as: "judicialBinNotifications",
            foreignKey: "idJudicialBinacle",
        });
    }
    static config(sequelize) {
        return {
            sequelize,
            tableName: JUDICIAL_BINNACLE_TABLE,
            modelName: JUDICIAL_BINNACLE_TABLE,
            timestamps: true,
            paranoid: true,
            deleteAt: "deleted_at",
        };
    }
}
exports.default = {
    JUDICIAL_BINNACLE_TABLE,
    JudicialBinnacleSchema,
    JudicialBinnacle,
};
