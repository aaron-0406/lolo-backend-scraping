"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAndUploadFiles = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const stream_1 = require("stream");
const get_nine_types_1 = require("../../../libs/get-nine-types");
const aws_bucket_1 = require("../../../../../../../libs/aws_bucket");
const config_1 = __importDefault(require("../../../../../../../config/config"));
const helpers_1 = require("../../../../../../../libs/helpers");
async function processAndUploadFiles(judicialBinnacleData, binnacleIndex) {
    const extensions = ['.pdf', '.docx'];
    const originalFilePath = path_1.default.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${binnacleIndex}`);
    for (const extension of extensions) {
        const filePath = originalFilePath + extension;
        if (fs_1.default.existsSync(filePath)) {
            const fileBuffer = fs_1.default.readFileSync(filePath);
            const file = {
                fieldname: 'document',
                originalname: `binnacle-bot-document-${binnacleIndex}${extension}`,
                encoding: '7bit',
                mimetype: (0, get_nine_types_1.getMimeType)(extension),
                buffer: fileBuffer,
                size: fileBuffer.length,
                stream: stream_1.Readable.from(fileBuffer),
                destination: path_1.default.join(__dirname, '../../../../../public/docs'),
                filename: `binnacle-bot-document-${binnacleIndex}${extension}`,
                path: filePath,
            };
            await (0, aws_bucket_1.uploadFile)(file, `${config_1.default.AWS_CHB_PATH}${judicialBinnacleData.dataValues.customerHasBankId}/binnacle`);
            await (0, helpers_1.deleteFile)("../public/docs", path_1.default.basename(file.filename));
        }
    }
}
exports.processAndUploadFiles = processAndUploadFiles;
