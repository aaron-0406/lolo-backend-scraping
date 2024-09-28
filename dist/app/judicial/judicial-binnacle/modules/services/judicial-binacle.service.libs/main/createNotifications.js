"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../../../../../libs/sequelize"));
const { models } = sequelize_1.default;
async function createNotifications(binnacle, judicialBinnacle) {
    const notificationsCodes = judicialBinnacle.dataValues.judicialBinNotifications.map((notification) => notification.notificationCode);
    const newNotifications = binnacle.notifications.filter((notification) => !notificationsCodes.includes(notification.notificationCode));
    if (newNotifications.length) {
        await Promise.all(newNotifications.map(async (notification) => {
            await models.JUDICIAL_BIN_NOTIFICATION.create({
                notificationCode: notification.notificationCode,
                addressee: notification.addressee,
                shipDate: notification.shipDate,
                attachments: notification.attachments,
                deliveryMethod: notification.deliveryMethod,
                resolutionDate: notification.resolutionDate,
                notificationPrint: notification.notificationPrint,
                sentCentral: notification.sentCentral,
                centralReceipt: notification.centralReceipt,
                notificationToRecipientOn: notification.notificationToRecipientOn,
                chargeReturnedToCourtOn: notification.chargeReturnedToCourtOn,
                idJudicialBinacle: judicialBinnacle.dataValues.id,
            });
        }));
    }
}
