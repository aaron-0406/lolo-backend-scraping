import sequelize from "../../../libs/sequelize";
import { MessagesUsersType } from "../types/messages-users.type";
const { models } = sequelize;

export class MessagesUserService {
  constructor() {}

  async findAll(messageId: string) {
    const data = await models.MESSAGES_USERS.findAll({
      where: {
        messageId,
      },
    });

    return data;
  }

  async create(data: Omit<MessagesUsersType, "id" | "createdAt" | "updatedAt" | "deletedAt">) {
    const newMessage = await models.MESSAGES_USERS.create(data);

    return newMessage;
  }

  async update(id: string, data: MessagesUsersType) {
    const message = await models.MESSAGES_USERS.findByPk(id);

    if (!message) {
      throw new Error("Message no encontrada");
    }

    await message.update(data);

    return message;
  }

  async delete(id: string) {
    const message = await models.MESSAGES_USERS.findByPk(id);

    if (!message) {
      throw new Error("Message no encontrada");
    }

    await message.destroy();

    return { id };
  }

}