import { Page } from "puppeteer";
import { CaseFileScrapingData } from "../../../types/external-types";

export async function getCaseFileInfo(page: Page): Promise<CaseFileScrapingData> {
  await page.waitForSelector(".panel.panel-default");
  const data = await page.evaluate(() => {
    const getText = (selector: any, index = 0) => {
      const elements = document.querySelectorAll(selector);
      return elements.length > index
        ? elements[index].innerText.trim()
        : null;
    };

    const caseFileNumber = getText(".divRepExp .celdaGrid");
    const juridictionalBody = getText(".divRepExp .celdaGrid", 1);
    const juridictionalDistrict = getText(".divRepExp .celdaGrid", 2);
    const judge = getText(".divRepExp .celdaGrid", 3);
    const legalSpecialist = getText(".divRepExp .celdaGrid", 4);
    const initialDate = getText(".divRepExp .celdaGrid", 5);
    const process = getText(".divRepExp .celdaGrid", 6);
    const observation = getText(".divRepExp .celdaGrid", 7);
    const speciality = getText(".divRepExp .celdaGrid", 8);
    const subjects = getText(".divRepExp .celdaGrid", 9);
    const state = getText(".divRepExp .celdaGrid", 10);
    const proceduralStage = getText(".divRepExp .celdaGrid", 11);
    const completionDate = getText(".divRepExp .celdaGrid", 12);
    const location = getText(".divRepExp .celdaGrid", 13);
    const reasonForConclusion = getText(".divRepExp .celdaGrid", 14);
    const sumary = getText(".celdaGridxT");

    return {
      caseFileNumber,
      juridictionalBody,
      juridictionalDistrict,
      judge,
      legalSpecialist,
      initialDate,
      process,
      observation,
      speciality,
      subjects,
      state,
      proceduralStage,
      completionDate,
      location,
      reasonForConclusion,
      sumary,
    };
  });
  return data;
}