import puppeteerExtra from "puppeteer-extra";
import puppeteerExtraPluginRecaptcha from "puppeteer-extra-plugin-recaptcha";

puppeteerExtra.use(puppeteerExtraPluginRecaptcha({
  provider: {
    id: "2captcha",
    token: process.env.RECAPTCHA_TOKEN,
  }
}));

export default puppeteerExtra;