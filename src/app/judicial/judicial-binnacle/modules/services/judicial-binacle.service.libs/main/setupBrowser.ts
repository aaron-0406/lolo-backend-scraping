import { puppeteerExtra } from "../../../utils/puppeteer-extra";

export async function setupBrowser(downloadPath: string) {
  const browser = await puppeteerExtra.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    slowMo: 5,
  });

  return { browser };
}
