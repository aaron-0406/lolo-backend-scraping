import { PnlSeguimientoData } from "../../types/external-types";

export const generateJsonStructureToNewBinnacle = ({
  data,
  titleDescription = "",
  numberCaseFile = "",
  urls,
}: {
  data: PnlSeguimientoData;
  titleDescription: string;
  numberCaseFile?: string;
  urls?: string;
}) => {
  const result = {
    header: {
      title: `Lolo Bank [${titleDescription}] - ${numberCaseFile}`,
      resolutionDate: data.resolutionDate || null,
      entryDate: data.entryDate || null,
      resolution: data.resolution || null,
      fojas: data.fojas || null,
      folios: data.folios || null,
    },
    sections: [
      {
        title: "Tipo de Notificación",
        content: data.notificationType || null,
      },
      {
        title: "Sumilla",
        content: data.sumilla || null,
      },
      {
        title: "Descripción de Usuario",
        content: data.userDescription || null,
      },
    ],
    notifications: data.notifications.map((notification: any) => ({
      code: notification.notificationCode || null,
      addressee: notification.addressee || null,
      shipDate: notification.shipDate || null,
      deliveryMethod: notification.deliveryMethod || null,
    })),
    url: urls || null,
  };

  return result;
};
