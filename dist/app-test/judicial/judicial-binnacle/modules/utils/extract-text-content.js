"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function extractTextContent(element, label) {
    const labelElement = Array.from(element.querySelectorAll('*')).find(el => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.includes(label); });
    if (labelElement) {
        const textContent = labelElement.textContent || '';
        const labelIndex = textContent.indexOf(label);
        if (labelIndex !== -1) {
            return textContent.substring(labelIndex + label.length).trim().split('\n')[0].trim();
        }
    }
    return null;
}
exports.default = extractTextContent;
