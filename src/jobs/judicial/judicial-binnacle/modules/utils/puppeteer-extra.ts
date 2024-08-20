import puppeteerExtra from "puppeteer-extra";
import puppeteerExtraPluginRecaptcha from "puppeteer-extra-plugin-recaptcha";

puppeteerExtra.use(puppeteerExtraPluginRecaptcha({
  provider: {
    id: "2captcha",
    token: "381cad2fec56070d12efeefa8d3bcfe2",
  }
}));

export default puppeteerExtra;