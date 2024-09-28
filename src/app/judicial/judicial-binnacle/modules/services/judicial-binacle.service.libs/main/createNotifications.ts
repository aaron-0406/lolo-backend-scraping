import sequelize from "../../../../../../../libs/sequelize";

const { models } = sequelize;

async function createNotifications(binnacle: any, judicialBinnacle: any) {
  const notificationsCodes = judicialBinnacle.dataValues.judicialBinNotifications.map(
    (notification: any) => notification.notificationCode
  );

  const newNotifications = binnacle.notifications.filter(
    (notification: any) => !notificationsCodes.includes(notification.notificationCode)
  );

  if (newNotifications.length) {
    await Promise.all(newNotifications.map(async (notification: any) => {
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
