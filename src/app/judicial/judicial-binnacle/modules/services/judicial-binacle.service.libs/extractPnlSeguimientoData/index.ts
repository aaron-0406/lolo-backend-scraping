import path from "path";
import { Page } from "puppeteer";
import { waitForDownload } from "./waitForDownload";
import { clickDynamicAnchor } from "./clickDynamicAnchor";
import { renameDownloadedFile } from "./renameDownloadedFile";
import { Notification, PnlSeguimientoData } from "../../../types/external-types";

export async function extractPnlSeguimientoData(page: Page, downloadPath:string): Promise<PnlSeguimientoData[]> {
  const binnacles: PnlSeguimientoData[] = await page.evaluate(async () => {
      const results: PnlSeguimientoData[] = [];
      let index = 1;

      while (true) {
          const pnlSeguimiento = document.querySelector(`#pnlSeguimiento${index}`);
          if (!pnlSeguimiento) break;

          const data: PnlSeguimientoData = {
              index,
              resolutionDate: extractTextContent(pnlSeguimiento, "Fecha de Resolución:"),
              entryDate: extractTextContent(pnlSeguimiento, "Fecha de Ingreso:"),
              resolution: extractTextContent(pnlSeguimiento, "Resolución:") ?? "",
              notificationType: extractTextContent(pnlSeguimiento, "Tipo de Notificación:") === "Acto:" ? "" : extractTextContent(pnlSeguimiento, "Tipo de Notificación:"),
              acto: extractTextContent(pnlSeguimiento, "Acto:"),
              fojas: extractTextContent(pnlSeguimiento, "Fojas:"),
              folios: extractTextContent(pnlSeguimiento, "Folios:"),
              proveido: extractTextContent(pnlSeguimiento, "Proveido:"),
              sumilla: extractTextContent(pnlSeguimiento, "Sumilla:"),
              userDescription: extractTextContent(pnlSeguimiento, "Descripción de Usuario:"),
              notifications: [],
              urlDownload: getEnlaceDescarga(pnlSeguimiento),
          };

          // Extraer información de notificaciones
          const notificacionesDivs = pnlSeguimiento.querySelectorAll('.panel-body .borderinf');
          for (const div of notificacionesDivs) {
              const notificationCode = extractNotificationCode(div);
              const notificacion: Notification = {
                  notificationCode: notificationCode,
                  addressee: extractTextContent(div, "Destinatario:"),
                  shipDate: extractTextContent(div, "Fecha de envio:"),
                  attachments: extractTextContent(div, "Anexo(s):"),
                  deliveryMethod: extractTextContent(div, "Forma de entrega:"),
              };

              const detalles = await getDetallesAdicionales(div);
              if (detalles) {
                  notificacion.resolutionDate = detalles.resolutionDate;
                  notificacion.notificationPrint = detalles.notificationPrint;
                  notificacion.sentCentral = detalles.sentCentral;
                  notificacion.centralReceipt = detalles.centralReceipt;
                  notificacion.notificationToRecipientOn = detalles.notificationToRecipientOn;
                  notificacion.chargeReturnedToCourtOn = detalles.chargeReturnedToCourtOn;
              }

              if (notificationCode) {
                  data.notifications.push(notificacion);
              }
          }

          results.push(data);
          index++;
      }

      // Funciones auxiliares
      function extractTextContent(element: Element, label: string): string | null {
          const labelElement = Array.from(element.querySelectorAll('*')).find(el => el.textContent?.includes(label));
          if (labelElement) {
              const textContent = labelElement.textContent || '';
              const labelIndex = textContent.indexOf(label);
              if (labelIndex !== -1) {
                  return textContent.substring(labelIndex + label.length).trim().split('\n')[0].trim();
              }
          }
          return null;
      }

      function extractNotificationCode(element: Element): string | null {
          const codeElement = element.querySelector('h5.redb');
          if (!codeElement) return null;

          const codeText = codeElement.textContent?.trim().split(' ')[1];
          return codeText !== undefined ? codeText : null;
      }

      function getEnlaceDescarga(element: Element): string | null {
          const enlace = element.querySelector('.dBotonDesc a.aDescarg');
          return enlace ? (enlace as HTMLAnchorElement).href : null;
      }

      async function getDetallesAdicionales(notificacionDiv: Element): Promise<{
          resolutionDate?: string | null;
          notificationPrint?: string | null;
          sentCentral?: string | null;
          centralReceipt?: string | null;
          notificationToRecipientOn?: string | null;
          chargeReturnedToCourtOn?: string | null;
      } | null> {
          const btnMasDetalle = notificacionDiv.querySelector(".btnMasDetalle");
          if (!btnMasDetalle) return null;

          const modalId = (btnMasDetalle as HTMLButtonElement).getAttribute("data-target");
          const modal = document.querySelector(modalId ?? "");
          if (!modal) return null;

          const details = {
              resolutionDate: extractTextContent(modal, "Fecha de Resolución:")?.length
                  ? extractTextContent(modal, "Fecha de Resolución:")
                  : null,
              notificationPrint: extractTextContent(modal, "Notificación Impresa el:")?.length
                  ? extractTextContent(modal, "Notificación Impresa el:")
                  : null,
              sentCentral: extractTextContent(modal, "Enviada a la Central de Notificación o Casilla Electrónica:")?.length
                  ? extractTextContent(modal, "Enviada a la Central de Notificación o Casilla Electrónica:")
                  : null,
              centralReceipt: extractTextContent(modal, "Recepcionada en la central de Notificación el:")?.length
                  ? extractTextContent(modal, "Recepcionada en la central de Notificación el:")
                  : null,
              notificationToRecipientOn: extractTextContent(modal, "Notificación al destinatario el:")?.length
                  ? extractTextContent(modal, "Notificación al destinatario el:")
                  : null,
              chargeReturnedToCourtOn: extractTextContent(modal, "Cargo devuelto al juzgado el:")?.length
                  ? extractTextContent(modal, "Cargo devuelto al juzgado el:")
                  : null,
          };

          return details;
      }

      return results;
  });

  let startTime = Date.now();

  for (const data of binnacles) {
    try{

      if (data.urlDownload) {
        console.log("Descargando archivo dinámico", data.urlDownload);

        await clickDynamicAnchor(page, data.urlDownload);

        const downloadedFilePath = await waitForDownload(downloadPath, startTime);

        const fileExtension = path.extname(downloadedFilePath);

        const newFileName = `binnacle-bot-document-${data.index}${fileExtension}`;
        await renameDownloadedFile(downloadedFilePath, newFileName);

        startTime = Date.now();
      }
    } catch(error){
      console.log("Error al descargar archivos", error);
      continue
    }
  }

  return binnacles;
}