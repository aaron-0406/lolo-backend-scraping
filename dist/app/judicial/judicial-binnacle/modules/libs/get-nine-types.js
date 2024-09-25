"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMimeType = getMimeType;
function getMimeType(extension) {
    switch (extension) {
        case '.pdf': return 'application/pdf';
        case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case '.jpg': return 'image/jpeg';
        case '.png': return 'image/png';
        // Agrega más tipos MIME según lo necesario
        default: return 'application/octet-stream';
    }
}
