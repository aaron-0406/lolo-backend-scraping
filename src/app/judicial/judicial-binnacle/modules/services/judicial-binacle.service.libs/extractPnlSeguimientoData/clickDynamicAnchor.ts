import { Page } from "puppeteer";

export async function clickDynamicAnchor(page: Page, url: string): Promise<void> {
  await page.evaluate((url) => {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
  }, url);
}
