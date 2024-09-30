import { Page } from "puppeteer";
import path from "path";
import fs from "fs";

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
  if (!fs.existsSync(captchaDir)) {
    fs.mkdirSync(captchaDir, { recursive: true });
  }



  try {
    const data = "";
    // click on the speachAudio button #btnRepro
  // Esperar a que el botón de reproducción esté visible
  await page.waitForSelector('#btnRepro', { visible: true });

  // Hacer clic en el botón de reproducción
  await page.click('#btnRepro');

  // Esperar un momento para que el audio se procese y el input aparezca
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Esperar el input que tiene el valor del captcha usando el XPath
  try {
    await page.waitForSelector('#1zirobotz0', { visible: true, timeout: 60000 }); // Aumenta el timeout a 60 segundos

    // Obtener el valor del input
  const value = await page.evaluate(() => {
    const inputElement = document.querySelector<HTMLInputElement>('#1zirobotz0');
    return inputElement ? inputElement.value : null; // Devuelve el valor o null si no se encuentra
  });


    // Mostrar el valor en consola
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

        console.log("Case file last", caseFileExist);
        console.log("Captcha last", isCorrectCaptcha);
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
          return [true, true, true];
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
        else return [true, true, true];
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