import {
  Model,
  DataTypes,
  Sequelize,
  ModelAttributes,
  ModelCtor,
} from "sequelize";
import { CustomerType } from "../../app/dash/types/customer.type";

const CUSTOMER_TABLE = "CUSTOMER";

const CustomerSchema: ModelAttributes<Customer, CustomerType> = {
  id: {
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
    field: "id_customer",
    type: DataTypes.INTEGER,
  },
  ruc: {
    allowNull: false,
    unique: true,
    type: DataTypes.STRING(11),
  },
  companyName: {
    allowNull: false,
    field: "company_name",
    type: DataTypes.STRING(150),
  },
  urlIdentifier: {
    allowNull: false,
    unique: true,
    field: "url_identifier",
    type: DataTypes.STRING(100),
  },
  description: {
    allowNull: false,
    type: DataTypes.TEXT("tiny"),
  },
  state: {
    allowNull: false,
    type: DataTypes.TINYINT({ length: 1 }),
  },
  createdAt: {
    allowNull: false,
    field: "created_at",
    defaultValue: DataTypes.NOW,
    type: DataTypes.DATE,
  },
  isScrapperActive:{
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: "is_scrapper_active",
    defaultValue: false,
  }
};

class Customer extends Model {
  static associate(models: { [key: string]: ModelCtor<Model> }) {
    this.hasMany(models.CUSTOMER_USER, {
      as: "customerUser",
      foreignKey: "customerId",
    });

    this.hasMany(models.CITY, {
      as: "city",
      foreignKey: "customerId",
    });

    this.belongsToMany(models.BANK, {
      as: "customerBanks",
      through: models.CUSTOMER_HAS_BANK,
      foreignKey: "idCustomer",
      otherKey: "idBank",
    });
  }

  static config(sequelize: Sequelize) {
    return {
      sequelize,
      tableName: CUSTOMER_TABLE,
      modelName: CUSTOMER_TABLE,
      timestamps: false,
    };
  }
}

export default { CUSTOMER_TABLE, CustomerSchema, Customer };
