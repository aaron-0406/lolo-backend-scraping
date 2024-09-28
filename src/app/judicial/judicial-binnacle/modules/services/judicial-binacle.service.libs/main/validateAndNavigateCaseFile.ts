import { Page } from "puppeteer";
import { JEC_URL } from "../../../constants/judicial-binacle.constants";
import { removeHCaptcha } from "../removeHCaptcha/removeHCaptcha";
import { caseFileNumberDecoder } from "../../../utils/case-file-decoder";
import { fillCaseFileNumber } from "../fillCaseFileNumber/fillCaseFileNumber";
import { removeNormalCaptchaV1 } from "../removeNormalCaptchaV1/removeNormalCaptchaV1";
import { solver } from "../../../utils/puppeteer-extra";

export async function validateAndNavigateCaseFile(page: Page, caseFile: any): Promise<boolean> {
  await page.goto(JEC_URL);
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (page.url() !== JEC_URL) await removeHCaptcha(page);

    const numberCaseFile = caseFileNumberDecoder(caseFile.dataValues.numberCaseFile);
    await fillCaseFileNumber(page, numberCaseFile);

    const { isSolved, isCasFileTrue, isBotDetected } = await removeNormalCaptchaV1({ page, solver });

    if (isSolved && isCasFileTrue && !isBotDetected) {
      return true;
    } else if (!isCasFileTrue) {
      return false;
    } else {
      await page.reload();
    }
  }
  return false;
}
