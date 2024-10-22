import { Page } from "puppeteer";
import { CaseFileNumber } from "../../../types/external-types";
export async function fillCaseFileNumber(
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

  await page.waitForSelector("#mensajeNoExisteExpedientes")
  await page.waitForSelector("#codCaptchaError")

  const caseFileExist = await page.evaluate(() => {
    const errElement = document.getElementById("mensajeNoExisteExpedientes");
    // if (!errElement?.style?.display) return true;
    // return false;
    return errElement?.style;
  });

  const isCorrectCaptcha = await page.evaluate(() => {
    const errElement = document.getElementById("codCaptchaError");
    // if (!errElement?.style?.display) return true;
    // return false;
    return errElement?.style;
  });

  const isBotDetected = await page.evaluate(() => {
    const errElement = document.getElementById("custom_footer");
    // if (!errElement?.style?.display) return true;
    // return false;
    return errElement?.style;
  });

  // console.log("Case file previous", caseFileExist);
  // console.log("Captcha previous", isCorrectCaptcha);
  // console.log("Bot detected", isBotDetected);
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