import sequelize from "../../../libs/sequelize";
import boom from "@hapi/boom";
import { CustomerUserType } from "../types/customer-user.type";
import { encryptPassword } from "../../../libs/bcrypt";
import { Op } from "sequelize";

const { models } = sequelize;

class CustomerUserService {
  constructor() {}

  async findAll() {
    const rta = await models.CUSTOMER_USER.findAll();
    return rta;
  }

  async findUserBot(chb: number) {
    // TODO: Change this logic
    const customer = await models.CUSTOMER_HAS_BANK.findByPk(chb);
    let dni = "";
    let customerId = 0;
    if (customer?.dataValues?.idCustomer == 1) {
      customerId = 1;
      dni = "00000001";
    } else if (customer?.dataValues?.idCustomer == 22) {
      customerId = 22;
      dni = "00000002";
    }

    try {
      const rta = await models.CUSTOMER_USER.findOne({
        where: {
          dni,
          customerId,
        },
      });

      if (!rta) return null;
      return rta;
    } catch (e) {
      console.log(e);
    }
  }

  async findAllByCustomerID(customerId: string) {
    const rta = await models.CUSTOMER_USER.findAll({
      include: ["role"],
      attributes: {
        exclude: ["password"],
      },
      where: {
        customer_id_customer: customerId,
      },
    });

    if (!rta) {
      throw boom.notFound("Cliente no encontrado");
    }
    return rta;
  }

  async findOne(id: string) {
    const user = await models.CUSTOMER_USER.findByPk(id, {
      include: ["role"],
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      throw boom.notFound("Usuario no encontrado");
    }
    return user;
  }

  async failedAttemptsCounter(id: string, logged: boolean) {
    const user = await this.findOne(id);

    const loginAttempts = logged ? 0 : user.dataValues.loginAttempts + 1;
    user.update({ ...user, loginAttempts });
  }

  async create(data: CustomerUserType) {
    const [user, created] = await models.CUSTOMER_USER.findOrCreate({
      where: {
        dni: data.dni,
        customer_id_customer: data.customerId,
      },
      include: ["role"],
      attributes: {
        exclude: ["password"],
      },
      defaults: data,
    });

    if (!created) {
      throw boom.notFound("Usuario ya existente");
    }

    await user.reload({
      include: ["role"],
      attributes: {
        exclude: ["password"],
      },
    });

    return user;
  }

  async update(id: string, changes: CustomerUserType) {
    const user = await this.findOne(id);
    const oldUser = { ...user.get() };
    if (changes.password)
      changes.password = await encryptPassword(changes.password);
    const newUser = await user.update(changes);

    await newUser.reload({
      include: ["role"],
      attributes: {
        exclude: ["password"],
      },
    });

    return { oldUser, newUser };
  }

  async updateState(id: string, state: boolean) {
    state ?? this.failedAttemptsCounter(id, true);

    const user = await this.findOne(id);
    const oldUser = { ...user.get() };
    const newUser = await user.update({ ...user, state });

    return { oldUser, newUser };
  }

  async delete(id: string) {
    const user = await this.findOne(id);
    const oldUser = { ...user.get() };
    await user.destroy();

    return oldUser;
  }

  async removeCode2fa(id: string) {
    const user = await this.findOne(id);
    const oldUser = { ...user.get() };
    const newUser = await user.update({
      ...user,
      code2fa: null,
      firstAccess: false,
    });

    return { oldUser, newUser };
  }
}

export default CustomerUserService;
