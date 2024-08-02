import caseFilesData from "../../../../../assets/mock/mockCaseFiles.json";

import { CaseFileNumber, CaseFiles } from "../types/external-types";
import {
  JEC_URL,
  PYTHON_SCRIPT_PATH,
} from "../constants/judicial-binacle.constants";

import puppeteerExtra from "../utils/puppeteer-extra"
import { Page } from "puppeteer";
import { caseFileNumberDecoder } from "../utils/case-file-decoder";
import path from "path";
import fs from 'fs';
import { execAsync } from '../../../../../utils/python/exec-async';

export class JudicialBinacleService {
  // private hCaptchaSolution: any;
  // private hCaptchaError: any;

  constructor() {
    // this.hCaptchaSolution = undefined;
    // this.hCaptchaError = undefined;
  }
  async getAllCaseFiles (): Promise<CaseFiles> {
    return caseFilesData as CaseFiles;
  }

  //? Puppeteer

  async removeHCaptcha(page: Page): Promise<void> {
    try {
      console.log("Anti-bot detected");

        const { solved } = await page.solveRecaptchas();

        if (solved.length) {
          console.log("Captcha solved:", solved);

          await page.waitForSelector("body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm",
            { visible: true, timeout: 5000 });

          await page.click("body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm");
          await page.waitForNavigation();

        } else {
          throw new Error("HCaptcha not solved");
        }
    } catch (error) {
      console.error("Error in removeHCaptcha:", error);
      throw error;
    }
  }

  async removeNormalCaptcha(page: Page): Promise<{isSolved: boolean, isCasFileTrue: boolean}> {
    await page.waitForSelector('#captcha_image');
    const imageElement = await page.$("#captcha_image");
    if (!imageElement) throw new Error("No captcha image found");
    const boundingBox = await imageElement.boundingBox();
    if (!boundingBox) throw new Error("No captcha bounding box found");

    await page.screenshot({
      path: path.join(__dirname, `../../../../../public/captchas/captcha-${boundingBox.x}-${boundingBox.y}-${boundingBox.width}-${boundingBox.height}.png`),
      clip: {
        x: boundingBox.x,
        y: boundingBox.y + boundingBox.y / 2,
        width: boundingBox.width,
        height: boundingBox.height
      }
    })

    const screenshotFile = path.resolve(__dirname, `../../../../../public/captchas/captcha-${boundingBox.x}-${boundingBox.y}-${boundingBox.width}-${boundingBox.height}.png`);

    if (!fs.existsSync(screenshotFile)){
      console.log('No captured screenshot');
      return { isSolved: false, isCasFileTrue: false };
    }

    try {
      const { stdout, stderr } = await execAsync(`python3 ${PYTHON_SCRIPT_PATH} ${screenshotFile}`);
      if (stderr) {
        console.error(`Error en el script de Python: ${stderr}`);
        return { isSolved: false, isCasFileTrue: false };
      }
      if(!stdout) return { isSolved: false, isCasFileTrue: false };
      const replaceStdout = stdout.replace(/'/g, '"');
      const parsedStdout = JSON.parse(replaceStdout);
      Promise.all([
        await page.locator('input[id="codigoCaptcha"]').fill(parsedStdout.code),
        await page.click("#consultarExpedientes"),
        await page.waitForNavigation(),
        await page.waitForSelector("#command > button"),
        await page.click("#command > button"),
      ]);
      const errElementInvisible = await page.evaluate(() => {
        const errElement = document.getElementById(
          "mensajeNoExisteExpedientes"
        );
        if (!errElement) return false;
        return errElement && errElement.hidden;
      });

      return { isSolved: true, isCasFileTrue: errElementInvisible };

    } catch(error : any) {
      console.error(`Error excuting Python script: ${error.message}`);
      return { isSolved: false, isCasFileTrue: false };
    }



  }

  async getCaseFilesInformation (): Promise<void> {

  }

  async fillCaseFileNumber (page:Page, numberCaseFileDecoder: CaseFileNumber): Promise<void> {
    const {
      codeExp,
      codeAnio,
      codeIncidente,
      codeDistprov,
      codeOrgano,
      codEspecialidad,
      codInstancia,
    } = numberCaseFileDecoder;
    await page.click('#myTab > li:nth-child(2) > a'),
    await page.locator('input[id="cod_expediente"]').fill(codeExp),
    await page.locator('input[id="cod_anio"]').fill(codeAnio),
    await page.locator('input[id="cod_incidente"]').fill(codeIncidente),
    await page.locator('input[id="cod_distprov"]').fill(codeDistprov),
    await page.locator('input[id="cod_organo"]').fill(codeOrgano),
    await page
      .locator('input[id="cod_especialidad"]')
      .fill(codEspecialidad),
    await page.locator('input[id="cod_instancia"]').fill(codInstancia)
  }

  async main (): Promise<void> {

    const caseFiles = await this.getAllCaseFiles();

    caseFiles.forEach(async (caseFile) => {
      if (!caseFile.is_valid) return;
      let isValidCaseFile = false;
      const browser = await puppeteerExtra.launch({
        headless: false,
        slowMo: 10,
      });
      const page = await browser.newPage();
      await page.goto(JEC_URL);
      const currentUrl = page.url();


      if (currentUrl !== JEC_URL) await this.removeHCaptcha(page);

      const maxAttempts = 3;

      console.log(`Max attempts: ${maxAttempts}`);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {

        console.log(`Attempt ${attempt + 1} to solve captcha`);

        const numberCaseFile = caseFileNumberDecoder(caseFile.number_case_file);

        console.log(`Number case file: ${numberCaseFile}`);

        await this.fillCaseFileNumber(page, numberCaseFile);

        const { isSolved, isCasFileTrue } = await this.removeNormalCaptcha(page);
        if (isSolved && !isCasFileTrue) {
          console.log("Solved and is true");
          isValidCaseFile = true;
          break;
        }
        else{
          console.log(`Attempt ${attempt + 1} failed, reloading page and retrying...`);
          await page.reload();
        }
      }
      if (!isValidCaseFile) return;

      // TODO: Save case file
      console.log("Save case file");

    })
  }
}

