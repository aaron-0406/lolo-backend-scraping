import sequelize from "../../../libs/sequelize";
import boom from "@hapi/boom";
import { MessageType } from "../types/message.type";
import CustomerHasBankService from "../../dash/services/customer-has-bank.service";

const service = new CustomerHasBankService();

const { models } = sequelize;

class MessageService {
  constructor() {}

  async findAll(customerId:string) {
    const data = await service.findAllByCustomerId(customerId);
  }

  async create(data: Omit<MessageType, "id" | "createdAt" | "updatedAt" | "deletedAt">) {
    try{
      const newMessage = await models.MESSAGE.create(data);
      return newMessage;

    } catch(e){
      console.log(e)
    }
  }

  async update(id: string, data: MessageType) {
    const message = await models.MESSAGE.findByPk(id);

    if (!message) {
      throw boom.notFound("Message no encontrada");
    }

    await message.update(data);

    return message;
  }

  async delete(id: string) {
    const message = await models.MESSAGE.findByPk(id);

    if (!message) {
      throw boom.notFound("Message no encontrada");
    }

    await message.destroy();

    return { id };
  }
}

export default MessageService;