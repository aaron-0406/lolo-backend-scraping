import sequelize from "../../../../../libs/sequelize";
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
// import extractTextContent from "../utils/extract-text-content";

const { models } = sequelize;

export class JudicialBinacleService {
  constructor() {}

  async getAllCaseFiles(): Promise<CaseFiles> {
    return caseFilesData as CaseFiles;
  }

  //? Puppeteer
  async getAllCaseFilesDB() {
    try {
      const caseFiles = await models.JUDICIAL_CASE_FILE.findAll({
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
          }
        ]
      });
      return caseFiles;
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
      if (!errElement?.style?.display) return true;
      return false;
    });

    const isCorrectCaptcha = await page.evaluate(() => {
      const errElement = document.getElementById("codCaptchaError");
      if (!errElement?.style?.display) return true;
      return false;
    });

    // console.log("existe el case file", caseFileExist);
    // console.log("es correcto el captcha", isCorrectCaptcha);

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

    await page.screenshot({
      path: path.join(
        __dirname,
        `../../../../../public/captchas/captcha-${boundingBox.x}-${boundingBox.y}-${boundingBox.width}-${boundingBox.height}.png`
      ),
      clip: {
        x: boundingBox.x,
        y: boundingBox.y + boundingBox.y / 2,
        width: boundingBox.width,
        height: boundingBox.height,
      },
    });

    const screenshotFile = path.resolve(
      __dirname,
      `../../../../../public/captchas/captcha-${boundingBox.x}-${boundingBox.y}-${boundingBox.width}-${boundingBox.height}.png`
    );

    if (!fs.existsSync(screenshotFile)) {
      console.log("No captured screenshot");
      return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
    }

    try {
      const { stdout, stderr } = await execAsync(
        `python3 ${PYTHON_SCRIPT_PATH} ${screenshotFile}`
      );
      if (stderr) {
        console.error(`Error en el script de Python: ${stderr}`);
        return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
      }
      const replaceStdout = stdout.replace(/'/g, '"');
      const parsedStdout = JSON.parse(replaceStdout);

      await page.locator('input[id="codigoCaptcha"]').fill(parsedStdout.code);
      await page.click("#consultarExpedientes").then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const caseFileExist = await page.evaluate(() =>{
          const errElement = document.getElementById("mensajeNoExisteExpedientes");
          if (!errElement?.style?.display) return true;
          return false;
        })

        const isCorrectCaptcha = await page.evaluate(() => {
          const errElement = document.getElementById("codCaptchaError");
          if (!errElement?.style?.display) return true;
          return false;
        });

          // console.log("existe el case file", caseFileExist);
          // console.log("es correcto el captcha", isCorrectCaptcha);
      });

      [isCasFileTrue, isSolved] = await Promise.all([
        page.evaluate(() => {
          const errElement = document.getElementById("mensajeNoExisteExpedientes");
          if (!errElement) return true;
          return false;
        }),
        page.evaluate(() => {
          const errorCaptcha = document.getElementById("codCaptchaError");
          if (!errorCaptcha) return true;
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
      return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
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

  async  extractPnlSeguimientoData(page: Page): Promise<PnlSeguimientoData[]> {
    const results: PnlSeguimientoData[] = await page.evaluate(async () => {
      const results: PnlSeguimientoData[] = [];
      let index = 1;

      while (true) {
        const pnlSeguimiento = document.querySelector(`#pnlSeguimiento${index}`);
        if (!pnlSeguimiento) break;

        const data: PnlSeguimientoData = {
          index,
          resolutionDate: extractTextContent(
            pnlSeguimiento,
            "Fecha de Resolución:"
          ),
          entryDate: extractTextContent(pnlSeguimiento, "Fecha de Ingreso:"),
          resolution: extractTextContent(pnlSeguimiento, "Resolución:") ?? "",
          notificationType:
            extractTextContent(pnlSeguimiento, "Tipo de Notificación:") ===
            "Acto:"
              ? ""
              : extractTextContent(pnlSeguimiento, "Tipo de Notificación:"),
          acto: extractTextContent(pnlSeguimiento, "Acto:"),
          fojas: extractTextContent(pnlSeguimiento, "Fojas:"),
          folios: extractTextContent(pnlSeguimiento, "Folios:"),
          proveido: extractTextContent(pnlSeguimiento, "Proveido:"),
          sumilla: extractTextContent(pnlSeguimiento, "Sumilla:"),
          userDescription: extractTextContent(
            pnlSeguimiento,
            "Descripción de Usuario:"
          ),
          notifications: [],
          urlDownload: getEnlaceDescarga(pnlSeguimiento),
        };

        // Extraer información de notificaciones
        const notificacionesDivs = pnlSeguimiento.querySelectorAll('.panel-body .borderinf');
        for (const div of notificacionesDivs) {
          const notificacion: Notification = {
            number: extractTextContent(div, "Destinatario:"),
            addressee: extractTextContent(div, "Destinatario:"),
            shipDate: extractTextContent(div, "Fecha de envio:"),
            attachments: extractTextContent(div, "Anexo(s):"),
            deliveryMethod: extractTextContent(div, "Forma de entrega:"),
          };

          // Extraer información adicional del modal si existe
          const detalles = await getDetallesAdicionales(div);
          if (detalles) {
            notificacion.resolutionDate = detalles.resolutionDate;
            notificacion.notificationPrint = detalles.notificationPrint;
            notificacion.sentCentral = detalles.sentCentral;
            notificacion.centralReceipt = detalles.centralReceipt;
          }

          if (notificacion.number) {
            data.notifications.push(notificacion);
            }
        }

        results.push(data);
        index++;
      }

      function extractTextContent  (element: Element, label: string): string | null {
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

      function getEnlaceDescarga(element: Element): string | null {
        const enlace = element.querySelector('.dBotonDesc a.aDescarg');
        return enlace ? (enlace as HTMLAnchorElement).href : null;
      }

      async function getDetallesAdicionales(notificacionDiv: Element): Promise<{
        resolutionDate?: string | null;
        notificationPrint?: string | null;
        sentCentral?: string | null;
        centralReceipt?: string | null;
      } | null> {
        const btnMasDetalle = notificacionDiv.querySelector(".btnMasDetalle");
        if (!btnMasDetalle) return null;

        // Abrir el modal y esperar a que se cargue
        const modalId = (btnMasDetalle as HTMLButtonElement).getAttribute(
          "data-target"
        );
        const modal = document.querySelector(modalId ?? "");
        if (!modal) return null;

        // Extraer la información del modal
        const details = {
          resolutionDate: extractTextContent(modal, "Fecha de Resolución:")
            ?.length
            ? extractTextContent(modal, "Fecha de Resolución:")
            : null,
          notificationPrint: extractTextContent(
            modal,
            "Notificación Impresa el:"
          )?.length
            ? extractTextContent(modal, "Notificación Impresa el:")
            : null,
          sentCentral: extractTextContent(
            modal,
            "Enviada a la Central de Notificación o Casilla Electrónica:"
          )?.length
            ? extractTextContent(
                modal,
                "Enviada a la Central de Notificación o Casilla Electrónica:"
              )
            : null,
          centralReceipt: extractTextContent(
            modal,
            "Recepcionada en la central de Notificación el:"
          )?.length
            ? extractTextContent(
                modal,
                "Recepcionada en la central de Notificación el:"
              )
            : null,
        };

        return details;
      }
      // writeFileSync('pnlSeguimientoData.json', JSON.stringify(results, null, 2), 'utf-8');
      // console.log('Datos guardados en pnlSeguimientoData.json');
      return results;
    });
    return results;
  }

  async main(): Promise<void> {
    try {
      const caseFiles = await this.getAllCaseFilesDB();
      console.log(caseFiles);
      const browser = await puppeteerExtra.launch({
        headless: false,
        slowMo: 5,
      });

      for (const caseFile of caseFiles) {
        console.log(caseFile.dataValues);
        try {
          let isValidCaseFile = false;
          const page = await browser.newPage();
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
            console.log(`Number case file: ${numberCaseFile}`);
            await this.fillCaseFileNumber(page, numberCaseFile);

            const { isSolved, isCasFileTrue, isBotDetected } =
              await this.removeNormalCaptchaV1(page);
            if (isSolved && isCasFileTrue && !isBotDetected) {
              console.log("Solved and is true, waiting for navigation");
              isValidCaseFile = true;
              attempt = 0;
              break;
            } else if (!isCasFileTrue) {
              console.log("isCasFileTrue is false, waiting for navigation");
              isValidCaseFile = false;
              break;
            } else {
              console.log(
                `Attempt ${attempt + 1} failed, reloading page and retrying...`
              );
              await page.reload();
            }
          }

          if (!isValidCaseFile) {
            // await page.close();
            continue;
          }

          await page.waitForSelector("#command > button");
          await page.click("#command > button");

          // TODO: Save case file
          const caseFileInfo = await this.getCaseFileInfo(page);
          const caseFileBinacles = await this.extractPnlSeguimientoData(page);
          console.log(caseFileInfo);
          console.log(caseFileBinacles);

          await page.close();
        } catch (error) {
          console.error(
            `Error processing case file ${caseFile.dataValues.numberCaseFile}: ${error}`
          );
        }
      }
    } catch (error) {
      console.error(error);
    }



    // await browser.close();
  }
}