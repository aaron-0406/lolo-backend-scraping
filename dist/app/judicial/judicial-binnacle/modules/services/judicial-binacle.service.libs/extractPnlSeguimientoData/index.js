"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPnlSeguimientoData = extractPnlSeguimientoData;
const path_1 = __importDefault(require("path"));
const waitForDownload_1 = require("./waitForDownload");
const clickDynamicAnchor_1 = require("./clickDynamicAnchor");
const renameDownloadedFile_1 = require("./renameDownloadedFile");
async function extractPnlSeguimientoData(page) {
    const binnacles = await page.evaluate(async () => {
        var _a;
        const results = [];
        let index = 1;
        while (true) {
            const pnlSeguimiento = document.querySelector(`#pnlSeguimiento${index}`);
            if (!pnlSeguimiento)
                break;
            const data = {
                index,
                resolutionDate: extractTextContent(pnlSeguimiento, "Fecha de Resolución:"),
                entryDate: extractTextContent(pnlSeguimiento, "Fecha de Ingreso:"),
                resolution: (_a = extractTextContent(pnlSeguimiento, "Resolución:")) !== null && _a !== void 0 ? _a : "",
                notificationType: extractTextContent(pnlSeguimiento, "Tipo de Notificación:") === "Acto:" ? "" : extractTextContent(pnlSeguimiento, "Tipo de Notificación:"),
                acto: extractTextContent(pnlSeguimiento, "Acto:"),
                fojas: extractTextContent(pnlSeguimiento, "Fojas:"),
                folios: extractTextContent(pnlSeguimiento, "Folios:"),
                proveido: extractTextContent(pnlSeguimiento, "Proveido:"),
                sumilla: extractTextContent(pnlSeguimiento, "Sumilla:"),
                userDescription: extractTextContent(pnlSeguimiento, "Descripción de Usuario:"),
                notifications: [],
                urlDownload: getEnlaceDescarga(pnlSeguimiento),
            };
            // Extraer información de notificaciones
            const notificacionesDivs = pnlSeguimiento.querySelectorAll('.panel-body .borderinf');
            for (const div of notificacionesDivs) {
                const notificationCode = extractNotificationCode(div);
                const notificacion = {
                    notificationCode: notificationCode,
                    addressee: extractTextContent(div, "Destinatario:"),
                    shipDate: extractTextContent(div, "Fecha de envio:"),
                    attachments: extractTextContent(div, "Anexo(s):"),
                    deliveryMethod: extractTextContent(div, "Forma de entrega:"),
                };
                const detalles = await getDetallesAdicionales(div);
                if (detalles) {
                    notificacion.resolutionDate = detalles.resolutionDate;
                    notificacion.notificationPrint = detalles.notificationPrint;
                    notificacion.sentCentral = detalles.sentCentral;
                    notificacion.centralReceipt = detalles.centralReceipt;
                    notificacion.notificationToRecipientOn = detalles.notificationToRecipientOn;
                    notificacion.chargeReturnedToCourtOn = detalles.chargeReturnedToCourtOn;
                }
                if (notificationCode) {
                    data.notifications.push(notificacion);
                }
            }
            results.push(data);
            index++;
        }
        // Funciones auxiliares
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
        function extractNotificationCode(element) {
            var _a;
            const codeElement = element.querySelector('h5.redb');
            if (!codeElement)
                return null;
            const codeText = (_a = codeElement.textContent) === null || _a === void 0 ? void 0 : _a.trim().split(' ')[1];
            return codeText !== undefined ? codeText : null;
        }
        function getEnlaceDescarga(element) {
            const enlace = element.querySelector('.dBotonDesc a.aDescarg');
            return enlace ? enlace.href : null;
        }
        async function getDetallesAdicionales(notificacionDiv) {
            var _a, _b, _c, _d, _e, _f;
            const btnMasDetalle = notificacionDiv.querySelector(".btnMasDetalle");
            if (!btnMasDetalle)
                return null;
            const modalId = btnMasDetalle.getAttribute("data-target");
            const modal = document.querySelector(modalId !== null && modalId !== void 0 ? modalId : "");
            if (!modal)
                return null;
            const details = {
                resolutionDate: ((_a = extractTextContent(modal, "Fecha de Resolución:")) === null || _a === void 0 ? void 0 : _a.length)
                    ? extractTextContent(modal, "Fecha de Resolución:")
                    : null,
                notificationPrint: ((_b = extractTextContent(modal, "Notificación Impresa el:")) === null || _b === void 0 ? void 0 : _b.length)
                    ? extractTextContent(modal, "Notificación Impresa el:")
                    : null,
                sentCentral: ((_c = extractTextContent(modal, "Enviada a la Central de Notificación o Casilla Electrónica:")) === null || _c === void 0 ? void 0 : _c.length)
                    ? extractTextContent(modal, "Enviada a la Central de Notificación o Casilla Electrónica:")
                    : null,
                centralReceipt: ((_d = extractTextContent(modal, "Recepcionada en la central de Notificación el:")) === null || _d === void 0 ? void 0 : _d.length)
                    ? extractTextContent(modal, "Recepcionada en la central de Notificación el:")
                    : null,
                notificationToRecipientOn: ((_e = extractTextContent(modal, "Notificación al destinatario el:")) === null || _e === void 0 ? void 0 : _e.length)
                    ? extractTextContent(modal, "Notificación al destinatario el:")
                    : null,
                chargeReturnedToCourtOn: ((_f = extractTextContent(modal, "Cargo devuelto al juzgado el:")) === null || _f === void 0 ? void 0 : _f.length)
                    ? extractTextContent(modal, "Cargo devuelto al juzgado el:")
                    : null,
            };
            return details;
        }
        return results;
    });
    let startTime = Date.now();
    for (const data of binnacles) {
        try {
            if (data.urlDownload) {
                console.log("Descargando archivo dinámico", data.urlDownload);
                await (0, clickDynamicAnchor_1.clickDynamicAnchor)(page, data.urlDownload);
                const downloadPath = path_1.default.join(__dirname, "../../../../../../../public/docs");
                const downloadedFilePath = await (0, waitForDownload_1.waitForDownload)(downloadPath, startTime);
                const fileExtension = path_1.default.extname(downloadedFilePath);
                const newFileName = `binnacle-bot-document-${data.index}${fileExtension}`;
                await (0, renameDownloadedFile_1.renameDownloadedFile)(downloadedFilePath, newFileName);
                startTime = Date.now();
            }
        }
        catch (error) {
            console.log("Error al descargar archivos", error);
            continue;
        }
    }
    return binnacles;
}
