import { Model, DataTypes, Sequelize, ModelAttributes, ModelCtor } from "sequelize";
import { UserMessageSubscriptionsType } from "../../app/settings/types/user-message-subscriptions.type";
import customerHasBankModel from "./many-to-many/customer-has-bank.model";
import customerUserModel from "./customer-user.model";

const { CUSTOMER_HAS_BANK_TABLE } = customerHasBankModel;
const { CUSTOMER_USER_TABLE } = customerUserModel;

const USER_MESSAGE_SUBSCRIPTIONS_TABLE = "USER_MESSAGE_SUBSCRIPTIONS";

const UserMessageSubscriptionsSchema: ModelAttributes<
  UserMessageSubscriptions,
  UserMessageSubscriptionsType
> = {
  id: {
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
    field: "id_user_message_subscriptions",
    type: DataTypes.INTEGER,
  },
  customerUserId: {
    allowNull: false,
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
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
    type: DataTypes.BOOLEAN,
    field: "is_active_subscription",
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

class UserMessageSubscriptions extends Model {
  static associate(models: { [key: string]: ModelCtor<Model> }) {
    this.belongsTo(models.CUSTOMER_HAS_BANK, {
      as: "customerHasBank",
      foreignKey: "customerHasBankId",
    });
    this.belongsTo(models.CUSTOMER_USER, {
      as: "customerUser",
      foreignKey: "customerUserId",
    });
  }

  static config(sequelize: Sequelize) {
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

export default {
  USER_MESSAGE_SUBSCRIPTIONS_TABLE,
  UserMessageSubscriptionsSchema,
  UserMessageSubscriptions,
};