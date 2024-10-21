import { Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { JEC_URL } from "../../../constants/judicial-binacle.constants";
import { removeHCaptcha } from "../removeHCaptcha/removeHCaptcha";

export async function removeNormalCaptchaV2SR(
{ page, solver }: { page: Page, solver: any }
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

  const captchaDir = path.resolve(__dirname, '../../../../../public/audio-captchas');

  // Verifica si la carpeta existe, si no, la crea
  if (!fs.existsSync(captchaDir)) { fs.mkdirSync(captchaDir, { recursive: true } );}

  try {
    let  data = "";
    try {
      const value = await page.locator("#btnRepro").scroll({
        scrollTop: -30,
      }).then(async()=>{
        await page.locator("#btnRepro").click();
        await new Promise(resolve => setTimeout(resolve, 5000));

        if(page.url() !== JEC_URL) await removeHCaptcha(page)

          const valueCaptcha = await page.evaluate(() => {
          const inputAudio = document.getElementById("1zirobotz0") as HTMLInputElement;
          return inputAudio?.value;
        })
        return valueCaptcha;
      });

      data = value !== "NULL" ? value : 'NOT FOUND';

      console.log(`El valor del captcha es: ${value}`);
    } catch (error) {
      console.error('Error al esperar el selector del input:', error);
    }
    await page.locator('input[id="codigoCaptcha"]').fill(data);
    await page.click("#consultarExpedientes").then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // await page.waitForSelector("#mensajeNoExisteExpedientes");
      // await page.waitForSelector("#codCaptchaError");

      const isCorrectCaptcha = await page.evaluate(() =>{
        const errElement = document.getElementById("codCaptchaError");
        return errElement?.style
        if (errElement?.style["0"] === "display" || !errElement?.style["0"] ) {
          isSolved = true
          return errElement?.style
        }else{
          isSolved = false;
          return errElement?.style
        }
      })

      const caseFileExist = await page.evaluate(() => {
        const errElement = document.getElementById("mensajeNoExisteExpedientes");
        return errElement?.style
        if (errElement?.style["0"] === "display" || !errElement?.style["0"] ) {
          isCasFileTrue = true
          return errElement?.style
        }else{
          isCasFileTrue = false;
          return errElement?.style
        }
      });

      const botDetected = await page.evaluate(() => {
        const errElement = document.getElementById("custom_footer");
        return errElement?.style
      });


        console.log("Case file last", caseFileExist);
        console.log("Captcha last", isCorrectCaptcha);
        console.log("Bot detected", botDetected);
    });

    const delay = (ms:any) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(2000);


    // [isCasFileTrue, isSolved] = await Promise.all([
    //   page.evaluate(() => {
    //     const errElement = document.getElementById("mensajeNoExisteExpedientes");
    //     if (errElement?.style["0"] === "display" || !errElement?.style["0"] ) return true;
    //     return false;
    //   }),
    //   page.evaluate(() => {
    //     const errorCaptcha = document.getElementById("codCaptchaError");
    //     if (errorCaptcha?.style["0"] === "display" || !errorCaptcha?.style["0"] ) return true;
    //     return false;
    //   }),
    //   // page.evaluate(() => {
    //   //   const botDetected = document.getElementById("captcha-bot-detected");
    //   //   if(!botDetected) return true;
    //   //   return false
    //   // }),
    // ]);

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
    return { isSolved, isCasFileTrue, isBotDetected };

  } catch (error: any) {
    console.error(`Error executing Python script: ${error.message}`);
    return { isSolved: false, isCasFileTrue: true, isBotDetected: false };
  }
}