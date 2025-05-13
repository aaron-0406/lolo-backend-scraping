import {
  Model,
  DataTypes,
  Sequelize,
  ModelAttributes,
  ModelCtor,
} from "sequelize";

import { MessageType } from "../../../app/settings/types/message.type";
import customerHasBankModel from "../many-to-many/customer-has-bank.model";
import customerUserModel from "../customer-user.model";
import clientModel from "../client.model";
import caseFileModel from "../judicial-case-file.model";

const { CUSTOMER_HAS_BANK_TABLE } = customerHasBankModel;
const { CUSTOMER_USER_TABLE } = customerUserModel;
const { CLIENT_TABLE } = clientModel;
const { JUDICIAL_CASE_FILE_TABLE } = caseFileModel;

const MESSAGE_TABLE = "MESSAGE";

const MessageSchema: ModelAttributes<Message, MessageType> = {
  id: {
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
    field: "id_message",
    type: DataTypes.INTEGER,
  },
  customerUserId: {
    allowNull: false,
    references: {
      model: CUSTOMER_USER_TABLE,
      key: "id_customer_user",
    },
    field: "customer_user_id_customer_user",
    type: DataTypes.INTEGER,
  },
  subject: {
    allowNull: false,
    field: "subject",
    type: DataTypes.STRING(150),
  },
  body: {
    allowNull: false,
    field: "body",
    type: DataTypes.TEXT("long"),
  },
  wasRead: {
    allowNull: false,
    field: "was_read",
    type: DataTypes.BOOLEAN,
  },
  customerHasBankId: {
    allowNull: false,
    field: "customer_has_bank_id_customer_has_bank",
    type: DataTypes.INTEGER,
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
    type: DataTypes.STRING(150),
  },
  clientId: {
    allowNull: true,
    field: "client_id_client",
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
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
    defaultValue: DataTypes.NOW,
    type: DataTypes.DATE,
  },
  updatedAt: {
    allowNull: false,
    field: "updated_at",
    defaultValue: DataTypes.NOW,
    type: DataTypes.DATE,
  },
  deletedAt: {
    allowNull: true,
    field: "deleted_at",
    type: DataTypes.DATE,
  },
};

class Message extends Model {
  static associate(models: { [key: string]: ModelCtor<Model> }) {
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

  static config(sequelize: Sequelize) {
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

export default {
  MESSAGE_TABLE,
  MessageSchema,
  Message,
};