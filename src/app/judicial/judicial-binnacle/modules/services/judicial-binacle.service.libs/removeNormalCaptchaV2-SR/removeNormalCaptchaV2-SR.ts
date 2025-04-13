import { Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { JEC_URL } from "../../../constants/judicial-binacle.constants";
import { removeHCaptcha } from "../removeHCaptcha/removeHCaptcha";
import { fillCaseFileNumber } from "../fillCaseFileNumber/fillCaseFileNumber";

export async function removeNormalCaptchaV2SR(
{ page, solver, numberCaseFile, caseFile }: { page: Page, solver: any, numberCaseFile: any, caseFile: any }
): Promise<{ isSolved: boolean; isCasFileTrue: boolean; isBotDetected: boolean }> {

  const captchaDir = path.resolve(__dirname, '../../../../../public/audio-captchas');

  // Verifica si la carpeta existe, si no, la crea
  if (!fs.existsSync(captchaDir)) { fs.mkdirSync(captchaDir, { recursive: true } );}
  let isBotDetected = false;
  let isCasFileTrue = false;
  let isSolved = false;

  try {
    let  data = "NOT FOUND";
    let solvedHCaptcha = false;
    try {
      while(!solvedHCaptcha){
        console.log("solved captcha", solvedHCaptcha)

        if(page.url() !== JEC_URL) {
          console.log("Trying to remove hCaptcha")
          await removeHCaptcha(page)
          console.log("Bot url: ", page.url())
          if(page.url() === "https://cej.pj.gob.pe/cej/forms/busquedaform.html#tabs-2" ) await page.goto(JEC_URL)
        }

        await page.waitForSelector("#captcha_image");
        await page.waitForSelector("#mensajeNoExisteExpedientes");
        await page.waitForSelector("#codCaptchaError");

        await fillCaseFileNumber(page, numberCaseFile, caseFile);

        const value = await page.locator("#btnRepro").scroll({
          scrollTop: -30,
        }).then(async()=>{
          await page.locator("#btnRepro").click();
          console.log("Button before submitted BTREPRO")

          await new Promise(resolve => setTimeout(resolve, 5000));

            const valueCaptcha = await page.evaluate(() => {
            const inputAudio = document.getElementById("1zirobotz0") as HTMLInputElement;
            return inputAudio?.value;
          })
          return valueCaptcha;
        });

        await new Promise((resolve)=>setTimeout(resolve, 4000))

        console.log("Case file number after submitted")

        if(page.url() !== JEC_URL) {

          console.log("Trying to remove hCaptcha before to fill and submit case file code")
          await removeHCaptcha(page)
         } else {

          data = value !== "NULL" ? value : 'NOT FOUND';

          console.log("Case file number before submitted")

          await page.locator('input[id="codigoCaptcha"]').fill(data);
          await page.click("#consultarExpedientes")

          console.log(`El valor del captcha es: ${value}`);

          console.log("Case file code filled and submitted successfully")

          console.log("Current page url is:" + page.url())

          await new Promise((resolve) => setTimeout(resolve, 4000));

          // const imageElement = await page.$("#captcha_image");
          // if (!imageElement) throw new Error("No captcha image found");
          // const boundingBox = await imageElement.boundingBox();
          // if (!boundingBox) throw new Error("No captcha bounding box found");

          [isCasFileTrue, isSolved, isBotDetected] = await
            page.evaluate(() => {
              const errElement = document.getElementById("mensajeNoExisteExpedientes");
              const errorCaptcha = document.getElementById("codCaptchaError");
              if (
                !(typeof errElement?.style === "object") &&
                !(typeof errorCaptcha?.style === "object")
              ) {
                return [true, true, false];
              };
              if (
                typeof errElement?.style === "object" &&
                typeof errorCaptcha?.style === "object" &&
                errElement?.style["0"] === "display" &&
                errElement?.style["1"] === "color"
              )
                return [true, false, false];
              if (
                typeof errElement?.style === "object" &&
                typeof errorCaptcha?.style === "object" &&
                errElement?.style["0"] === "color" &&
                errorCaptcha?.style["0"] === "display"
              ) {
                return [false, true, false];
              }
              else return [true, true, false];
            }),
            // page.evaluate(() => {
            //   const botDetected = document.getElementById("captcha-bot-detected");
            //   if(!botDetected) return true;
            //   return false
            // }),
          console.log("isBotDetected:", isBotDetected, "isSolved:", isSolved, "isCasFileTrue:", isCasFileTrue);
          solvedHCaptcha = true
          break;
        }
      }
    } catch (error) {
      console.error('Error al esperar el selector del input:', error);
      return { isSolved: false, isCasFileTrue: true, isBotDetected: false };
    }

    const delay = (ms:any) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(2000);

    // ========================================================================== //

    return { isSolved, isCasFileTrue, isBotDetected };

  } catch (error: any) {
    console.error(`Error executing Python script: ${error.message}`);
    return { isSolved: false, isCasFileTrue: true, isBotDetected: false };
  }
}