"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const judicial_scheduled_notifications_job_1 = __importDefault(require("../../../jobs/judicial/judicial-scheduled-notifications.job"));
const { models } = sequelize_1.default;
class ScheduledNotificationsService {
    constructor() { }
    async findAll() {
        const rta = await models.SCHEDULED_NOTIFICATIONS.findAll({
            include: [
                {
                    model: models.SCHEDULED_NOTIFICATIONS_USERS,
                    as: "scheduledNotificationsUsers",
                    include: [
                        {
                            model: models.CUSTOMER_USER,
                            as: "customerUser",
                        },
                    ],
                },
            ],
        });
        if (!rta) {
            throw boom_1.default.notFound("No existen notificaciones programadas");
        }
        return rta;
    }
    async findAllByChb(chb) {
        const rta = await models.SCHEDULED_NOTIFICATIONS.findAll({
            where: {
                customer_has_bank_id_customer_has_bank: chb,
            },
        });
        if (!rta) {
            throw boom_1.default.notFound("No existen notificaciones programadas");
        }
        const formatData = rta.map((item) => {
            return (Object.assign(Object.assign({}, item.dataValues), { daysToNotify: JSON.parse(item.dataValues.daysToNotify) }));
        });
        return formatData;
    }
    async create(data) {
        const newScheduledNotification = await models.SCHEDULED_NOTIFICATIONS.create(data);
        (0, judicial_scheduled_notifications_job_1.default)();
        return newScheduledNotification;
    }
    async update(id, data) {
        const notification = await models.SCHEDULED_NOTIFICATIONS.findByPk(id);
        if (!notification) {
            throw boom_1.default.notFound("Notificación programada no encontrada");
        }
        const oldNotification = Object.assign({}, notification.get());
        const newNotification = await notification.update(data);
        (0, judicial_scheduled_notifications_job_1.default)();
        return {
            oldNotification,
            newNotification: Object.assign(Object.assign({}, newNotification.dataValues), { daysToNotify: JSON.parse(newNotification.dataValues.daysToNotify) }),
        };
    }
    async delete(id) {
        const scheduledNotification = await models.SCHEDULED_NOTIFICATIONS.findByPk(id);
        if (!scheduledNotification) {
            throw boom_1.default.notFound("Notificación programada no encontrada");
        }
        await scheduledNotification.destroy();
        (0, judicial_scheduled_notifications_job_1.default)();
        return scheduledNotification;
    }
}
exports.default = ScheduledNotificationsService;
