import sequelize from "../../../../../libs/sequelize";
import { Op, where } from "sequelize"
import { CaseFileNumber, CaseFiles, CaseFileScrapingData, Notification, PnlSeguimientoData } from '../types/external-types';
import {
  JEC_URL,
  PYTHON_SCRIPT_PATH,
} from "../constants/judicial-binacle.constants";
import { Page } from "puppeteer";
import { caseFileNumberDecoder } from "../utils/case-file-decoder";
import { execAsync } from '../../../../../utils/python/exec-async';
import puppeteerExtra from "../utils/puppeteer-extra"

import caseFilesData from "../assets/mock/mockCaseFiles.json"
import path from "path";
import fs, { writeFileSync } from 'fs';
import moment from "moment";
import { renameFile } from "../libs/rename-files";
import { uploadFile } from "../../../../../libs/aws_bucket";
import config from "../../../../../config/config";
import { File } from 'formidable';
import { Readable } from "stream";
import { deleteFile } from "../../../../../libs/helpers";
import { getMimeType } from "../libs/get-nine-types";
// import extractTextContent from "../utils/extract-text-content";

const { models } = sequelize;

// ! THINGS TO FIX
  // 1. detect if normar captcha is solved
  // 2. detect if bot is detected where it shouldn't be
  // 3. detect if case file is valid

export class JudicialBinacleService {
  constructor() {}

  async getAllCaseFiles(): Promise<CaseFiles> {
    return caseFilesData as CaseFiles;
  }

  async resetAllCaseFiles(): Promise<void> {
    await models.JUDICIAL_CASE_FILE.update({ wasScanned: false }, { where: { isScanValid: true } });
  }

  //? Puppeteer
  async getAllCaseFilesDB() {
    try {
      const hidalgoCustomersIds = await models.CUSTOMER_HAS_BANK.findAll({
        where: {
          customer_id_customer: 1,
        },
      });

      const caseFiles = await models.JUDICIAL_CASE_FILE.findAll({
        where: {
          customer_has_bank_id: {[Op.in]: hidalgoCustomersIds.map((customer) => customer.dataValues.id)}
        },
        include: [
          {
            model: models.JUDICIAL_BINNACLE,
            as: "judicialBinnacle",
            include: [
              {
                model: models.JUDICIAL_BIN_NOTIFICATION,
                as: "judicialBinNotifications",
                attributes:{
                  exclude: ["judicialBinnacleId"]
                }
              }
            ]
          },
          {
            model: models.CUSTOMER_HAS_BANK,
            as: "customerHasBank",
            include:[
              {
                model: models.CUSTOMER,
                as: "customer",
              }
            ]
          },
          {
            model: models.CLIENT,
            as: "client",
          }
        ]
      });
      return caseFiles
    } catch (error) {
      console.error("Error en la conexión a la base de datos", error);
      return [];
    }
  }

  async removeHCaptcha(page: Page): Promise<boolean> {
    let attempt = 0;
    while (true) {
      try {
        console.log("🤖 Anti-bot detected");
        const data = await page.solveRecaptchas();
        if (data.solved.length && data.solved[0] && data.solved[0].isSolved) {
          await page.waitForSelector(
            "body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm"
          );
          await page.click(
            "body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm"
          );
          return true;
        } else {
          attempt++;
          console.log(
            `Attempt ${attempt + 1} failed, reloading page and retrying...`
          );
          return false;
        }
      } catch (error) {
        console.error("Error in removeHCaptcha:", error);
        throw error;
      }
    }
  }

  async fillCaseFileNumber(
    page: Page,
    numberCaseFileDecoder: CaseFileNumber
  ): Promise<void> {
    const {
      codeExp,
      codeAnio,
      codeIncidente,
      codeDistprov,
      codeOrgano,
      codEspecialidad,
      codInstancia,
    } = numberCaseFileDecoder;

 // #####################################

    const caseFileExist = await page.evaluate(() => {
      const errElement = document.getElementById("mensajeNoExisteExpedientes");
      // if (!errElement?.style?.display) return true;
      // return false;
      return errElement?.style["0"];
    });

    const isCorrectCaptcha = await page.evaluate(() => {
      const errElement = document.getElementById("codCaptchaError");
      // if (!errElement?.style?.display) return true;
      // return false;
      return errElement?.style["0"];
    });

    console.log("Case file previous", caseFileExist);
    console.log("Captcha previous", isCorrectCaptcha);

    // #####################################

    await page.waitForSelector("#myTab > li:nth-child(2) > a"),
      await page.click("#myTab > li:nth-child(2) > a"),
      await page.locator('input[id="cod_expediente"]').fill(codeExp),
      await page.locator('input[id="cod_anio"]').fill(codeAnio),
      await page.locator('input[id="cod_incidente"]').fill(codeIncidente),
      await page.locator('input[id="cod_distprov"]').fill(codeDistprov),
      await page.locator('input[id="cod_organo"]').fill(codeOrgano),
      await page.locator('input[id="cod_especialidad"]').fill(codEspecialidad),
      await page.locator('input[id="cod_instancia"]').fill(codInstancia);
  }

  async removeNormalCaptchaV1(
    page: Page
  ): Promise<{ isSolved: boolean; isCasFileTrue: boolean; isBotDetected: boolean }> {
    let isBotDetected = false;
    let isCasFileTrue = false;
    let isSolved = false;

    await page.waitForSelector("#captcha_image");
    await page.waitForSelector("#mensajeNoExisteExpedientes");
    await page.waitForSelector("#codCaptchaError");

    const imageElement = await page.$("#captcha_image");
    if (!imageElement) throw new Error("No captcha image found");
    const boundingBox = await imageElement.boundingBox();
    if (!boundingBox) throw new Error("No captcha bounding box found");

    const captchaDir = path.resolve(__dirname, '../../../../../public/captchas');

    // Verifica si la carpeta existe, si no, la crea
    if (!fs.existsSync(captchaDir)) {
      fs.mkdirSync(captchaDir, { recursive: true });
    }

    const screenshotFile = path.join(captchaDir, `captcha-${boundingBox.x}-${boundingBox.y}-${boundingBox.width}-${boundingBox.height}.png`);

    await page.screenshot({
      path: screenshotFile,
      clip: {
        x: boundingBox.x,
        y: boundingBox.y + boundingBox.y / 2,
        width: boundingBox.width,
        height: boundingBox.height,
      },
    });

    if (!fs.existsSync(screenshotFile)) {
      console.log("No captured screenshot");
      return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
    }

    try {
      const { stdout, stderr } = await execAsync(
        `python3 ${PYTHON_SCRIPT_PATH} ${screenshotFile}`
      );

      console.log("stdout", stdout);
      console.log("stderr", stderr);
      if (stderr) {
        console.error(`Error en el script de Python: ${stderr}`);
        return { isSolved: false, isCasFileTrue: true, isBotDetected: false };
      }
      const replaceStdout = stdout.replace(/'/g, '"');
      const parsedStdout = JSON.parse(replaceStdout);

      await page.locator('input[id="codigoCaptcha"]').fill(parsedStdout.code);
      await page.click("#consultarExpedientes").then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // await page.waitForSelector("#mensajeNoExisteExpedientes");
        // await page.waitForSelector("#codCaptchaError");

        // const isCorrectCaptcha = await page.evaluate(() =>{
        //   const errElement = document.getElementById("codCaptchaError");
        //   if (errElement?.style["0"] === "display" || !errElement?.style["0"] ) {
        //     isSolved = true
        //     return errElement?.style["0"]
        //   }else{
        //     isSolved = false;
        //     return errElement?.style["0"]
        //   }
        // })

        // const caseFileExist = await page.evaluate(() => {
        //   const errElement = document.getElementById("mensajeNoExisteExpedientes");
        //   if (errElement?.style["0"] === "display" || !errElement?.style["0"] ) {
        //     isCasFileTrue = true
        //     return errElement?.style["0"]
        //   }else{
        //     isCasFileTrue = false;
        //     return errElement?.style["0"]
        //   }
        // });

        //   console.log("Case file last", caseFileExist);
        //   console.log("Captcha last", isCorrectCaptcha);
      });

      const delay = (ms:any) => new Promise(resolve => setTimeout(resolve, ms));
      await delay(2000);


      [isCasFileTrue, isSolved] = await Promise.all([
        page.evaluate(() => {
          const errElement = document.getElementById("mensajeNoExisteExpedientes");
          if (errElement?.style["0"] === "display" || !errElement?.style["0"] ) return true;
          return false;
        }),
        page.evaluate(() => {
          const errorCaptcha = document.getElementById("codCaptchaError");
          if (errorCaptcha?.style["0"] === "display" || !errorCaptcha?.style["0"] ) return true;
          return false;
        }),
        // page.evaluate(() => {
        //   const botDetected = document.getElementById("captcha-bot-detected");
        //   if(!botDetected) return true;
        //   return false
        // }),
      ]);
      console.log("isBotDetected:", isBotDetected, "isSolved:", isSolved, "isCasFileTrue:", isCasFileTrue);
      return { isSolved, isCasFileTrue, isBotDetected };

    } catch (error: any) {
      console.error(`Error executing Python script: ${error.message}`);
      return { isSolved: false, isCasFileTrue: true, isBotDetected: false };
    }
  }

  async getCaseFileInfo(page: Page): Promise<CaseFileScrapingData> {
    await page.waitForSelector(".panel.panel-default");
    const data = await page.evaluate(() => {
      const getText = (selector: any, index = 0) => {
        const elements = document.querySelectorAll(selector);
        return elements.length > index
          ? elements[index].innerText.trim()
          : null;
      };

      const caseFileNumber = getText(".divRepExp .celdaGrid");
      const juridictionalBody = getText(".divRepExp .celdaGrid", 1);
      const juridictionalDistrict = getText(".divRepExp .celdaGrid", 2);
      const judge = getText(".divRepExp .celdaGrid", 3);
      const legalSpecialist = getText(".divRepExp .celdaGrid", 4);
      const initialDate = getText(".divRepExp .celdaGrid", 5);
      const process = getText(".divRepExp .celdaGrid", 6);
      const observation = getText(".divRepExp .celdaGrid", 7);
      const speciality = getText(".divRepExp .celdaGrid", 8);
      const subjects = getText(".divRepExp .celdaGrid", 9);
      const state = getText(".divRepExp .celdaGrid", 10);
      const proceduralStage = getText(".divRepExp .celdaGrid", 11);
      const completionDate = getText(".divRepExp .celdaGrid", 12);
      const location = getText(".divRepExp .celdaGrid", 13);
      const reasonForConclusion = getText(".divRepExp .celdaGrid", 14);
      const sumary = getText(".celdaGridxT");

      return {
        caseFileNumber,
        juridictionalBody,
        juridictionalDistrict,
        judge,
        legalSpecialist,
        initialDate,
        process,
        observation,
        speciality,
        subjects,
        state,
        proceduralStage,
        completionDate,
        location,
        reasonForConclusion,
        sumary,
      };
    });
    return data;
  }

  async extractPnlSeguimientoData(page: Page): Promise<PnlSeguimientoData[]> {
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

          await this.clickDynamicAnchor(page, data.urlDownload);

          const downloadPath = path.join(__dirname, "../../../../../public/docs");

          const downloadedFilePath = await this.waitForDownload(downloadPath, startTime);

          const fileExtension = path.extname(downloadedFilePath);

          const newFileName = `binnacle-bot-document-${data.index}${fileExtension}`;
          await this.renameDownloadedFile(downloadedFilePath, newFileName);

          startTime = Date.now();
        }
      } catch(error){
        console.log("Error al descargar archivos", error);
        continue
      }
    }

    return binnacles;
}

async waitForDownload(downloadPath: string, startTime: number, timeout: number = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const files = fs.readdirSync(downloadPath);
      const newFiles = files.filter((file) => {
        const filePath = path.join(downloadPath, file);
        const stats = fs.statSync(filePath);
        return stats.mtimeMs > startTime && (file.endsWith(".pdf") || file.endsWith(".doc")) && !file.endsWith(".crdownload");
      });

      if (newFiles.length > 0) {
        clearInterval(interval);
        resolve(path.join(downloadPath, newFiles[0]));
      }
    }, 1000);

    const timeoutId = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("La descarga ha excedido el tiempo límite."));
    }, timeout);
  });
}

async  renameDownloadedFile(oldPath: string, newName: string): Promise<void> {
  const newPath = path.join(path.dirname(oldPath), newName);
  fs.renameSync(oldPath, newPath);
}

async clickDynamicAnchor(page: Page, url: string): Promise<void> {
  await page.evaluate((url) => {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
  }, url);
}

  async main(): Promise<{ notScanedCaseFiles: number, errorsCounter: number }> {
    let errorsCounter:number = 0;
    try {
      const downloadPath = path.join(__dirname, "../../../../../public/docs");
      const caseFiles = await this.getAllCaseFilesDB();
      const browser = await puppeteerExtra.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        slowMo: 5,
      });

      if(errorsCounter > 4) return { notScanedCaseFiles: 0, errorsCounter: errorsCounter };

      for (const caseFile of caseFiles) {
        if (!caseFile.dataValues.isScanValid || caseFile.dataValues.wasScanned) continue;

        const page = await browser.newPage();

        page.on('dialog', async dialog => {
          await dialog.accept();
        });

        try {
          const client = await page.target().createCDPSession();
          await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,
          });

          const binnacleTypes = await models.JUDICIAL_BIN_TYPE_BINNACLE.findAll({
            where: {
              customer_has_bank_id_customer_has_bank:
                caseFile.dataValues.customerHasBankId,
            },
          });

          if (!binnacleTypes) {
            console.log("No existe binnacle type");
            continue;
          }


          const proceduralStages = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.findAll({
            where: {
              customer_has_bank_id_customer_has_bank:
                caseFile.dataValues.customerHasBankId,
            },
          });

          if (!proceduralStages) {
            console.log("No existe procedural stage");
            continue;
          }

          let isValidCaseFile = false;
          await page.goto(JEC_URL);
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const maxAttempts = 5;
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`Attempt ${attempt + 1} to solve captchas`);
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const currentUrl = page.url();
            if (currentUrl !== JEC_URL) await this.removeHCaptcha(page);

            const numberCaseFile = caseFileNumberDecoder(
              caseFile.dataValues.numberCaseFile
            );
            console.log(`Number case file: ${caseFile.dataValues.numberCaseFile}`);
            await this.fillCaseFileNumber(page, numberCaseFile);

            const { isSolved, isCasFileTrue, isBotDetected } = await this.removeNormalCaptchaV1(page);
            if (isSolved && isCasFileTrue && !isBotDetected) {
              console.log("Solved and is true, waiting for navigation");
              isValidCaseFile = true;
              attempt = 0;
              break;
            } else if (!isCasFileTrue) {
              console.log("isCasFileTrue is false, waiting for navigation");
              isValidCaseFile = false;
              break;
            } else if (!isSolved) {
              console.log(
                `Attempt ${attempt + 1} failed, reloading page and retrying...`
              );
              await page.reload();
            }
          }

          if (!isValidCaseFile) {
              await caseFile.update({
                isScanValid: false
              })
            page.close();
            continue;
          }

          await page.waitForSelector("#command > button");
          await page.click("#command > button");

          // TODO: Save case file
          const caseFileInfo = await this.getCaseFileInfo(page);
          const caseFileBinacles = await this.extractPnlSeguimientoData(page);

          let newBinnacles:any[] = []

          const binnaclesIndexs = caseFile.dataValues.judicialBinnacle
            .filter((binnacle: any) => binnacle.dataValues.index !== null)
            .map((binnacle: any) => binnacle.dataValues.index);

          if (binnaclesIndexs.length) newBinnacles = caseFileBinacles.filter((binnacle:any) => !binnaclesIndexs.includes(binnacle.index));
          else newBinnacles = caseFileBinacles;

          if (!newBinnacles.length){
            // delete all docs from public/docs
            Promise.all(caseFile.dataValues.judicialBinnacle.map(async (judicialBinnacle:any) => {
              const originalFilePath = path.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${judicialBinnacle.dataValues.index}.pdf`);
              if (fs.existsSync(originalFilePath)) {
                await deleteFile("../public/docs", `binnacle-bot-document-${judicialBinnacle.dataValues.index}.pdf`);
              }
            }))
          }

          await Promise.all( newBinnacles.map(async (binnacle:any) => {

            try {
              const judicialBinnacle = caseFile.dataValues.judicialBinnacle.find((binnacleRegistred:any) => binnacleRegistred.dataValues.index === binnacle.index);

              if (judicialBinnacle) {
                // verify if there are new notifications
                let notificationsCodes = [];
                const binnacle = newBinnacles.find((binnacle:any) => binnacle.index === judicialBinnacle.dataValues.index);
                if (judicialBinnacle.dataValues.judicialBinNotifications.length)
                  notificationsCodes =
                    judicialBinnacle.dataValues.judicialBinNotifications.map(
                      (notification: any) => notification.notificationCode
                    );

                const newNotifications = binnacle.notifications.filter((notification:any) => !notificationsCodes.includes(notification.notificationCode)) ?? [];
                if (!newNotifications.length) return;

                await Promise.all(newNotifications.map(async (notification:any) => {
                  const judicialBinNotification = await models.JUDICIAL_BIN_NOTIFICATION.create({
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
                  // console.log("Creado notificacion: ", judicialBinNotification);
                }))

                return;
              }
            } catch (error) {
              console.log("Error en la conexión a la base de datos", error);
              return;
            }

            const resolutionDate = moment(binnacle.resolutionDate, "DD/MM/YYYY HH:mm").isValid() ? moment(binnacle.resolutionDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;

            const entryDate = moment(binnacle.entryDate, "DD/MM/YYYY HH:mm").isValid() ? moment(binnacle.entryDate, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;

            const provedioDate =  moment(binnacle.proveido, "DD/MM/YYYY HH:mm").isValid() ? moment(binnacle.proveido, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD HH:mm:ss") : null;

              const binnacleType = binnacle.resolutionDate
              ? binnacleTypes.find(
                  (binnacleType: any) =>
                    binnacleType.dataValues.typeBinnacle === "RESOLUCION"
                )
              : binnacleTypes.find(
                  (binnacleType: any) =>
                    binnacleType.dataValues.typeBinnacle === "ESCRITO"
                );
            const proceduralStage = proceduralStages[0].dataValues.id
            const folios = typeof binnacle.folios === "string" ? Number(binnacle.folios) : null;
            const fojas = typeof binnacle.fojas === "string" ? Number(binnacle.fojas) : null;

            const judicialBinnacleData = await models.JUDICIAL_BINNACLE.create({
              judicialBinProceduralStageId: proceduralStage,
              lastPerformed: binnacle.sumilla,
              binnacleTypeId: binnacleType?.dataValues.id,
              date: new Date(),
              judicialFileCaseId: caseFile.dataValues.id,
              customerHasBankId: caseFile.dataValues.customerHasBankId,

              index: binnacle.index,
              resolutionDate: resolutionDate,
              entryDate: entryDate,
              notificationType: binnacle.notificationType,
              acto: binnacle.acto,
              fojas: fojas,
              folios: folios,
              provedioDate: provedioDate,
              userDescription: binnacle.userDescription,
              createdBy: "BOT",

              totalTariff: 0,
              tariffHistory: "[]",
            });

            if (judicialBinnacleData) {
              try {
                const extensions = ['.pdf', '.docx'];
                const originalFilePath = path.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${binnacle.index}`)

                for (const extension of extensions) {
                  if (fs.existsSync(originalFilePath + extension)) {
                    const fileWithExtension = originalFilePath + extension;
                    const fileStats = fs.statSync(fileWithExtension);

                    const fileExtension = path.extname(fileWithExtension);

                    console.log("Creando new bin file");

                    const newBinFile = await models.JUDICIAL_BIN_FILE.create({
                      judicialBinnacleId: judicialBinnacleData.dataValues.id,
                      originalName: `binnacle-bot-document-${binnacle.index}${fileExtension}`,
                      nameOriginAws: "",
                      customerHasBankId: judicialBinnacleData.dataValues.customerHasBankId,
                      size: fileStats.size,
                    });

                    console.log("File buffer", newBinFile);

                    const fileBuffer = fs.readFileSync(fileWithExtension);

                    // Crea un flujo de lectura para el archivo
                    const fileStream = Readable.from(fileBuffer);

                    // Crea el archivo con la extensión correcta
                    const file: Express.Multer.File = {
                      fieldname: 'document',
                      originalname: `binnacle-bot-document-${binnacle.index}${fileExtension}`,
                      encoding: '7bit',
                      mimetype: getMimeType(fileExtension),
                      buffer: fileBuffer,
                      size: fileBuffer.length,
                      stream: fileStream,
                      destination: path.join(__dirname, '../../../../../public/docs'),
                      filename: `binnacle-bot-document-${binnacle.index}${fileExtension}`,
                      path: fileWithExtension,
                    };

                    //Sube el archivo a AWS (descomentando cuando sea necesario)
                    await uploadFile(
                      file,
                      `${config.AWS_CHB_PATH}${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.id}/${judicialBinnacleData.dataValues.customerHasBankId}/${caseFile.dataValues.client.dataValues.code}/case-file/${caseFile.dataValues.id}/binnacle`
                    );

                    newBinFile.update({
                      nameOriginAws: `binnacle-bot-document-${binnacle.index}${path.extname(fileWithExtension)}`,
                    });

                    await deleteFile("../public/docs", path.basename(file.filename));
                  }else{
                    console.log("File not exists", originalFilePath);
                  }
                }
              } catch (error) {
                console.log("File not uploaded", error);
              }
            }

            if(!binnacle.notifications.length) return

            await Promise.all(binnacle.notifications.map(async (notification:Notification) => {binnacle
              const shipDate =
                notification.shipDate &&
                moment(notification.shipDate, "DD/MM/YYYY HH:mm").format(
                  "YYYY-MM-DD HH:mm:ss"
                ) !== "Invalid date"
                  ? moment(notification.shipDate, "DD/MM/YYYY HH:mm").format(
                      "YYYY-MM-DD HH:mm:ss"
                    )
                  : null;
              const resolutionDate =
                notification.resolutionDate &&
                moment(notification.resolutionDate, "DD/MM/YYYY HH:mm").format(
                  "YYYY-MM-DD HH:mm:ss"
                ) !== "Invalid date"
                  ? moment(
                      notification.resolutionDate,
                      "DD/MM/YYYY HH:mm"
                    ).format("YYYY-MM-DD HH:mm:ss")
                  : null;
              const notificationPrint =
                notification.notificationPrint &&
                moment(
                  notification.notificationPrint,
                  "DD/MM/YYYY HH:mm"
                ).format("YYYY-MM-DD HH:mm:ss") !== "Invalid date"
                  ? moment(
                      notification.notificationPrint,
                      "DD/MM/YYYY HH:mm"
                    ).format("YYYY-MM-DD HH:mm:ss")
                  : null;
              const sentCentral =
                notification.sentCentral &&
                moment(notification.sentCentral, "DD/MM/YYYY HH:mm").format(
                  "YYYY-MM-DD HH:mm:ss"
                ) !== "Invalid date"
                  ? moment(notification.sentCentral, "DD/MM/YYYY HH:mm").format(
                      "YYYY-MM-DD HH:mm:ss"
                    )
                  : null;
                const centralReceipt =
                  notification.centralReceipt &&
                  moment(notification.centralReceipt, "DD/MM/YYYY HH:mm").format(
                    "YYYY-MM-DD HH:mm:ss"
                  ) !== "Invalid date"
                    ? moment(notification.centralReceipt, "DD/MM/YYYY HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                      )
                    : null;
                const notificationToRecipientOn =
                  notification.notificationToRecipientOn &&
                  moment(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm").format(
                    "YYYY-MM-DD HH:mm:ss"
                  ) !== "Invalid date"
                    ? moment(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                      )
                    : null;
                const chargeReturnedToCourtOn =
                  notification.chargeReturnedToCourtOn &&
                  moment(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm").format(
                    "YYYY-MM-DD HH:mm:ss"
                  ) !== "Invalid date"
                    ? moment(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                      )
                    : null;

                await models.JUDICIAL_BIN_NOTIFICATION.create({
                  notificationCode: notification.notificationCode,
                  addressee: notification.addressee,
                  shipDate: shipDate,
                  attachments: notification.attachments,
                  deliveryMethod: notification.deliveryMethod,
                  resolutionDate: resolutionDate,
                  notificationPrint: notificationPrint,
                  sentCentral: sentCentral,
                  centralReceipt: centralReceipt,
                  notificationToRecipientOn: notificationToRecipientOn,
                  chargeReturnedToCourtOn: chargeReturnedToCourtOn,
                  idJudicialBinacle: judicialBinnacleData.dataValues.id,
                });
              // console.log("Creado notificacion: ",  judicialBinNotification);
            }))
          }))
          // delete all docs from public/docs


          Promise.all(newBinnacles.map(async (judicialBinnacle: any) => {
            const baseFilePath = path.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${judicialBinnacle.index}`);

            const extensions = ['.pdf', '.docx'];

            for (const ext of extensions) {
              const filePath = `${baseFilePath}${ext}`;
              console.log("Deleting file", filePath);
              if (fs.existsSync(filePath)) {
                await deleteFile("../public/docs", path.basename(filePath));
              }
            }
          }));

          console.log("Notificaciones creadas correctamente, terminando todo");
          await page.close();
          await caseFile.update({ wasScanned: true, isScanValid: true });

        } catch (error) {
          console.error(
            `Error processing case file ${caseFile.dataValues.numberCaseFile}: ${error}`
          );
          await page.close();
          errorsCounter++;
        }

      }

      await browser.close();

    } catch (error) {
      console.error(error);
    }
    const notScanedCaseFiles = await models.JUDICIAL_CASE_FILE.findAll({
      where: {
        isScanValid: true,
        wasScanned: false,
      },
    });

    return { notScanedCaseFiles: notScanedCaseFiles.length, errorsCounter: errorsCounter };
  }
}

