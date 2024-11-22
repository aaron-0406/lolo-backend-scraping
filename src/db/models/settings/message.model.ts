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

const { CUSTOMER_HAS_BANK_TABLE } = customerHasBankModel;
const { CUSTOMER_USER_TABLE } = customerUserModel;

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
    this.hasMany(models.MESSAGES_USERS, {
      as: "messagesUsers",
      foreignKey: "messageId",
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