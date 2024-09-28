import path from "path";
import fs from "fs";
import { Express } from "express";
import { Readable } from "stream";
import { getMimeType } from "../../../libs/get-nine-types";
import { uploadFile } from "../../../../../../../libs/aws_bucket";
import config from "../../../../../../../config/config";
import { deleteFile } from "../../../../../../../libs/helpers";

export async function processAndUploadFiles(judicialBinnacleData: any, binnacleIndex: number) {
  const extensions = ['.pdf', '.docx'];
  const originalFilePath = path.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${binnacleIndex}`);

  for (const extension of extensions) {
    const filePath = originalFilePath + extension;
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);

      const file: Express.Multer.File = {
        fieldname: 'document',
        originalname: `binnacle-bot-document-${binnacleIndex}${extension}`,
        encoding: '7bit',
        mimetype: getMimeType(extension),
        buffer: fileBuffer,
        size: fileBuffer.length,
        stream: Readable.from(fileBuffer),
        destination: path.join(__dirname, '../../../../../public/docs'),
        filename: `binnacle-bot-document-${binnacleIndex}${extension}`,
        path: filePath,
      };

      await uploadFile(file, `${config.AWS_CHB_PATH}${judicialBinnacleData.dataValues.customerHasBankId}/binnacle`);
      await deleteFile("../public/docs", path.basename(file.filename));
    }
  }
}
