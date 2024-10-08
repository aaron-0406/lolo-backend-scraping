import Joi from "joi";
import { ScheduledNotificationType } from "../types/scheduled-notifications.type";

const id = Joi.number();
const customerHasBankId = Joi.number();
const nameNotification = Joi.string();
const descriptionNotification = Joi.string();
const frequencyToNotify = Joi.number();
const hourTimeToNotify = Joi.date();
const logicKey = Joi.string();
const state = Joi.boolean();
const daysToNotyfy = Joi.string();
const createScheduledNotificationSchema = Joi.object<
  Omit<
    ScheduledNotificationType,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  >,
  true
>({
  nameNotification: nameNotification.required(),
  descriptionNotification: descriptionNotification.required(),
  frequencyToNotify: frequencyToNotify.required(),
  hourTimeToNotify: hourTimeToNotify.required(),
  logicKey: logicKey.required(),
  state: state.required(),
  customerHasBankId: customerHasBankId.required(),
  daysToNotify: daysToNotyfy.required(),
});

const updateScheduledNotificationSchema = Joi.object<
  Omit<
    ScheduledNotificationType,
    "id" | "customerHasBankId" | "createdAt" | "updatedAt" | "deletedAt"
  >,
  true
>({
  nameNotification: nameNotification.required(),
  descriptionNotification: descriptionNotification.required(),
  frequencyToNotify: frequencyToNotify.required(),
  hourTimeToNotify: hourTimeToNotify.required(),
  logicKey: logicKey.required(),
  state: state.required(),
  daysToNotify: daysToNotyfy.required(),
});

const getScheduledNotificationSchema = Joi.object<{ id: number }, true>({
  id: id.required(),
});

const getScheduledNotificationSchemaByCHBSchema = Joi.object<
  { chb: number },
  true
>({
  chb: customerHasBankId.required(),
});

const deleteScheduledNotificationSchema = Joi.object<{ id: number }, true>({
  id: id.required(),
});

export default {
  createScheduledNotificationSchema,
  updateScheduledNotificationSchema,
  getScheduledNotificationSchema,
  getScheduledNotificationSchemaByCHBSchema,
  deleteScheduledNotificationSchema,
};
