"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clickDynamicAnchor = clickDynamicAnchor;
async function clickDynamicAnchor(page, url) {
    await page.evaluate((url) => {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    }, url);
}
