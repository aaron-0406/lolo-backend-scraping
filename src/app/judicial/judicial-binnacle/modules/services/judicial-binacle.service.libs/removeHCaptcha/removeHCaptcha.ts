import { Page } from "puppeteer";

export async function removeHCaptcha(page: Page) {

  let attempt = 0;
  while (true) {
    try {
      console.log("🤖 Anti-bot detected");
      const data = await page.solveRecaptchas();
      console.log("data", data)
      if (data.solved.length && data.solved[0] && data.solved[0].isSolved) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await page.waitForSelector(
          "body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm"
        );
        await page.click(
          "body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input.btn.btn-success.btn-sm"
        );
        new Promise((resolve) => setTimeout(resolve, 10000));
        break;
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