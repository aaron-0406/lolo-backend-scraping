"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class ScheduledNotificationsUsersService {
    constructor() { }
    async findAllByScheduledNotificationId(scheduledNotificationId) {
        const rta = await models.SCHEDULED_NOTIFICATIONS_USERS.findAll({
            where: {
                scheduledNotificationId: scheduledNotificationId,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("El cliente no tiene notificaciones programadas");
        }
        return rta;
    }
    async changeNotificationsUsers(idNotification, scheludeNotificationsUsers) {
        const newScheludeNotificationsUsers = JSON.parse(scheludeNotificationsUsers);
        const notifications = await models.SCHEDULED_NOTIFICATIONS_USERS.findAll({
            where: {
                scheduledNotificationId: idNotification,
            },
            include: [
                {
                    model: models.CUSTOMER_USER,
                    as: "customerUser",
                    attributes: ["name", "email"],
                },
            ],
        });
        if (notifications.length) {
            const newNotifications = newScheludeNotificationsUsers.filter((scheludeNotificationsUser) => !notifications.some((notification) => notification.dataValues.customerUserId ===
                scheludeNotificationsUser.customerUserId));
            const notificationsToDelete = notifications.filter((notification) => !newScheludeNotificationsUsers.some((scheludeNotificationsUser) => notification.dataValues.customerUserId ===
                scheludeNotificationsUser.customerUserId));
            const notificationsChanges = [
                ...notificationsToDelete.map((notification) => notification.dataValues),
                ...newNotifications,
            ];
            const notificationsWithoutChanges = notifications.filter((notification) => !notificationsChanges.some((notificationChanges) => notification.dataValues.customerUserId ===
                notificationChanges.customerUserId));
            const formatedNotificationsWithoutChanges = notificationsWithoutChanges.map((notification) => notification.dataValues.customerUser);
            const formatedNotificationsToDelete = notificationsToDelete.map((notification) => notification.dataValues.customerUser);
            const formatedNewNotifications = [];
            try {
                for (const notification of notificationsToDelete) {
                    await models.SCHEDULED_NOTIFICATIONS_USERS.destroy({
                        where: { customerUserId: notification.dataValues.customerUserId },
                    });
                }
                for (const newNotification of newNotifications) {
                    const newNotificationData = await models.SCHEDULED_NOTIFICATIONS_USERS.create(newNotification);
                    const newNotifications = await models.SCHEDULED_NOTIFICATIONS_USERS.findOne({
                        where: {
                            customerUserId: newNotificationData.dataValues.customerUserId,
                        },
                        include: [
                            {
                                model: models.CUSTOMER_USER,
                                as: "customerUser",
                                attributes: ["name", "email"],
                            },
                        ],
                    });
                    if (!newNotifications)
                        return;
                    formatedNewNotifications.push(newNotifications.dataValues.customerUser);
                }
                return {
                    formatedNotificationsToDelete,
                    formatedNewNotifications,
                    formatedNotificationsWithoutChanges,
                };
            }
            catch (error) {
                throw error;
            }
        }
        else {
            for (const newNotification of newScheludeNotificationsUsers) {
                await models.SCHEDULED_NOTIFICATIONS_USERS.create(newNotification);
            }
        }
    }
}
exports.default = ScheduledNotificationsUsersService;
