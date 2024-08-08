
import { CaseFileNumber, CaseFiles, Notificacion, PnlSeguimientoData } from "../types/external-types";
import {
  JEC_URL,
  PYTHON_SCRIPT_PATH,
} from "../constants/judicial-binacle.constants";
import { Page } from "puppeteer";
import { caseFileNumberDecoder } from "../utils/case-file-decoder";
import { execAsync } from '../../../../../utils/python/exec-async';
import puppeteerExtra from "../utils/puppeteer-extra"

import caseFilesData from "../../../../../assets/mock/mockCaseFiles.json";
import path from "path";
import fs, { writeFileSync } from 'fs';
// import extractTextContent from "../utils/extract-text-content";

export class JudicialBinacleService {
  constructor() {}

  async getAllCaseFiles(): Promise<CaseFiles> {
    return caseFilesData as CaseFiles;
  }

  //? Puppeteer

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
    const data = await page.evaluate(() => {
      const errElement = document.getElementById("mensajeNoExisteExpedientes");
      return errElement?.style?.display ? true : false;
    });

    console.log("data", data);

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
      await page.click("#consultarExpedientes").then(async (res) =>{
        console.log("res", res);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const data = await page.evaluate(() => {
          const errElement = document.getElementById("mensajeNoExisteExpedientes");
          return errElement?.style?.display ? true : false;
        });
          console.log("data", data);
        }
      );



      [isCasFileTrue, isSolved, isBotDetected] = await Promise.all([
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
        page.evaluate(() => {
          const botDetected = document.getElementById("captcha-bot-detected");
          return botDetected ? !botDetected.hidden : false;
        }),
      ]);
      console.log("isBotDetected:", isBotDetected, "isSolved:", isSolved, "isCasFileTrue:", isCasFileTrue);
      return { isSolved, isCasFileTrue, isBotDetected };

    } catch (error: any) {
      console.error(`Error executing Python script: ${error.message}`);
      return { isSolved: false, isCasFileTrue: false, isBotDetected: false };
    }
  }
  async getCaseFileInfo(page: Page): Promise<any> {
    await page.waitForSelector(".panel.panel-default");
    const data = await page.evaluate(() => {
      const getText = (selector: any, index = 0) => {
        const elements = document.querySelectorAll(selector);
        return elements.length > index
          ? elements[index].innerText.trim()
          : null;
      };

      const expedienteElement = getText(".divRepExp .celdaGrid");
      const organoJurisdiccional = getText(".divRepExp .celdaGrid", 1);
      const distritoJudicial = getText(".divRepExp .celdaGrid", 2);
      const juez = getText(".divRepExp .celdaGrid", 3);
      const especialistaLegal = getText(".divRepExp .celdaGrid", 4);
      const fechaInicio = getText(".divRepExp .celdaGrid", 5);
      const proceso = getText(".divRepExp .celdaGrid", 6);
      const observacion = getText(".divRepExp .celdaGrid", 7);
      const especialidad = getText(".divRepExp .celdaGrid", 8);
      const materias = getText(".divRepExp .celdaGrid", 9);
      const estado = getText(".divRepExp .celdaGrid", 10);
      const etapaProcesal = getText(".divRepExp .celdaGrid", 11);
      const fechaConclusion = getText(".divRepExp .celdaGrid", 12);
      const ubicacion = getText(".divRepExp .celdaGrid", 13);
      const motivoConclusion = getText(".divRepExp .celdaGrid", 14);
      const sumilla = getText(".celdaGridxT");

      return {
        expediente: expedienteElement,
        organoJurisdiccional,
        distritoJudicial,
        juez,
        especialistaLegal,
        fechaInicio,
        proceso,
        observacion,
        especialidad,
        materias,
        estado,
        etapaProcesal,
        fechaConclusion,
        ubicacion,
        motivoConclusion,
        sumilla,
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
          fechaResolucion: extractTextContent(
            pnlSeguimiento,
            "Fecha de Resolución:"
          ),
          resolucion: extractTextContent(pnlSeguimiento, "Resolución:") ?? "",
          tipoNotificacion:
            extractTextContent(pnlSeguimiento, "Tipo de Notificación:") ===
            "Acto:"
              ? ""
              : extractTextContent(pnlSeguimiento, "Tipo de Notificación:"),
          acto: extractTextContent(pnlSeguimiento, "Acto:"),
          fojas: extractTextContent(pnlSeguimiento, "Fojas:"),
          proveido: extractTextContent(pnlSeguimiento, "Proveido:"),
          sumilla: extractTextContent(pnlSeguimiento, "Sumilla:"),
          descripcionUsuario: extractTextContent(
            pnlSeguimiento,
            "Descripción de Usuario:"
          ),
          notificaciones: [],
          enlaceDescarga: getEnlaceDescarga(pnlSeguimiento),
        };

        // Extraer información de notificaciones
        const notificacionesDivs = pnlSeguimiento.querySelectorAll('.panel-body .borderinf');
        for (const div of notificacionesDivs) {
          const notificacion: Notificacion = {
            numero: extractTextContent(div, "Destinatario:"),
            destinatario: extractTextContent(div, "Destinatario:"),
            fechaEnvio: extractTextContent(div, "Fecha de envio:"),
            anexos: extractTextContent(div, "Anexo(s):"),
            formaEntrega: extractTextContent(div, "Forma de entrega:"),
            detallesAdicionales: null,
          };

          // Extraer información adicional del modal si existe
          const detalles = await getDetallesAdicionales(div);
          if (detalles) {
            notificacion.detallesAdicionales = detalles;
          }

          if (notificacion.numero) {
            data.notificaciones.push(notificacion);
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

      async function getDetallesAdicionales(notificacionDiv: Element): Promise<Notificacion['detallesAdicionales'] | null> {
        const btnMasDetalle = notificacionDiv.querySelector('.btnMasDetalle');
        if (!btnMasDetalle) return null;

        // Abrir el modal y esperar a que se cargue
        const modalId = (btnMasDetalle as HTMLButtonElement).getAttribute('data-target');
        const modal = document.querySelector(modalId ?? "");
        if (!modal) return null;

        // Extraer la información del modal
        const detalles: Notificacion['detallesAdicionales'] = {
          fechaResolucion: extractTextContent(modal, "Fecha de Resolución:"),
          notificacionImpresion: extractTextContent(modal, "Notificación Impresa el:"),
          enviadaCentral: extractTextContent(modal, "Enviada a la Central de Notificación o Casilla Electrónica:"),
          recepcionCentral: extractTextContent(modal, "Recepcionada en la central de Notificación el:"),
          formaEntrega: extractTextContent(modal, "Forma de entrega:")
        };

        return detalles;
      }

      return results;
    });

    writeFileSync('pnlSeguimientoData.json', JSON.stringify(results, null, 2), 'utf-8');
    console.log('Datos guardados en pnlSeguimientoData.json');

    return results;
  }

  async main(): Promise<void> {
    const caseFiles = await this.getAllCaseFiles();

    const browser = await puppeteerExtra.launch({
      headless: false,
      slowMo: 5,
    });

    for (const caseFile of caseFiles) {
      try {
        let isValidCaseFile = false;
        const page = await browser.newPage();
        await page.goto(JEC_URL);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const maxAttempts = 5;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          console.log(`Attempt ${attempt + 1} to solve captchas`);
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const currentUrl = page.url();
          if (currentUrl !== JEC_URL) await this.removeHCaptcha(page);

          const numberCaseFile = caseFileNumberDecoder(caseFile.number_case_file);
          console.log(`Number case file: ${numberCaseFile}`);
          await this.fillCaseFileNumber(page, numberCaseFile);

          const { isSolved, isCasFileTrue, isBotDetected } =
            await this.removeNormalCaptchaV1(page);
          if (isSolved && isCasFileTrue && !isBotDetected) {
            console.log("Solved and is true, waiting for navigation");
            isValidCaseFile = true;
            attempt = 0;
            break;
          }
          else if (!isCasFileTrue){
            console.log("isCasFileTrue is false, waiting for navigation");
            isValidCaseFile = false;
            break;
          }
          else {
            console.log(
              `Attempt ${attempt + 1} failed, reloading page and retrying...`
            );
            await page.reload();
          }
        }

        if (!isValidCaseFile) continue

        await page.waitForSelector("#command > button");
        await page.click("#command > button");

        // TODO: Save case file
        const caseFileInfo = await this.getCaseFileInfo(page);
        const caseFileBinacles = await this.extractPnlSeguimientoData(page);
        console.log(caseFileInfo);
        console.log(caseFileBinacles);

        await page.close();
      } catch (error) {
        console.error(`Error processing case file ${caseFile.number_case_file}: ${error}`);
      }
    }

    await browser.close();
  }
}