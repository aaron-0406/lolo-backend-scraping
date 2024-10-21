import puppeteerExtra from "puppeteer-extra";
import puppeteerExtraPluginRecaptcha from "puppeteer-extra-plugin-recaptcha";
import * as TwoCaptcha from "@2captcha/captcha-solver";

puppeteerExtra.use(puppeteerExtraPluginRecaptcha({
  provider: {
    id: "2captcha",
    token: process.env.RECAPTCHA_TOKEN,
  }
}));

if (!TwoCaptcha.Solver) {
  throw new Error("Solver is undefined. Please check the @2captcha/captcha-solver import.");
}

const solver = new TwoCaptcha.Solver(process.env.RECAPTCHA_TOKEN!, 10);

export { solver, puppeteerExtra };
