import { puppeteerExtra } from "../../../utils/puppeteer-extra";

export async function setupBrowser(downloadPath: string) {
  const browser = await puppeteerExtra.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--single-process",
    ],
    slowMo: 5,
  });

  return { browser };
}
