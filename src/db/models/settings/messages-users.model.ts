import {
  Model,
  DataTypes,
  Sequelize,
  ModelAttributes,
  ModelCtor,
} from "sequelize";

import { MessagesUsersType } from "../../../app/settings/types/messages-users.type";
import customerHasBankModel from "../many-to-many/customer-has-bank.model";
import customerUserModel from "../customer-user.model";

const MESSAGES_USERS_TABLE = "MESSAGES_USERS";
const { CUSTOMER_HAS_BANK_TABLE } = customerHasBankModel;
const { CUSTOMER_USER_TABLE } = customerUserModel;

const MessagesUserSchema: ModelAttributes<MessagesUsers, MessagesUsersType> = {
  id: {
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
    field: "id_messages_users",
    type: DataTypes.INTEGER,
  },
  messageId: {
    allowNull: false,
    field: "message_id",
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
  customerHasBankId: {
    allowNull: false,
    field: "customer_has_bank_id_customer_has_bank",
    type: DataTypes.INTEGER,
    references: {
      model: CUSTOMER_HAS_BANK_TABLE,
      key: "id_customer_has_bank",
    }
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
  }
};

class MessagesUsers extends Model {
  static associate(models: { [key: string]: ModelCtor<Model> }) {
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
  static config(sequelize: Sequelize) {
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

export default {
  MESSAGES_USERS_TABLE,
  MessagesUserSchema,
  MessagesUsers,
};