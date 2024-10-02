import { Op } from "sequelize"
import { Express } from "express";
import path from "path";
import fs from 'fs';
import moment from "moment-timezone";
import { Readable } from "stream";
import sequelize from "../../../../../libs/sequelize";
import { extractPnlSeguimientoData } from "./judicial-binacle.service.libs/extractPnlSeguimientoData";
import { getCaseFileInfo } from "./judicial-binacle.service.libs/getCaseFileInfo/getCaseFileInfo";
import { setupBrowser } from "./judicial-binacle.service.libs/main/setupBrowser";
import { validateAndNavigateCaseFile } from "./judicial-binacle.service.libs/main/validateAndNavigateCaseFile";
import { deleteFile } from "../../../../../libs/helpers";
import { uploadFile } from "../../../../../libs/aws_bucket";
import config from "../../../../../config/config";
import { Notification } from "../types/external-types";
import { getMimeType } from "../libs/get-nine-types";
// import extractTextContent from "../utils/extract-text-content";

const { models } = sequelize;

// ! THINGS TO FIX
  // 1. detect if normar captcha is solved
  // 2. detect if bot is detected where it shouldn't be
  // 3. detect if case file is valid

export class JudicialBinacleService {
  constructor() {}

  // async getAllCaseFiles(): Promise<CaseFiles> {
  //   return caseFilesData as CaseFiles;
  // }

  async resetAllCaseFiles(): Promise<void> {
    await models.JUDICIAL_CASE_FILE.update({ wasScanned: false }, { where: { isScanValid: true } });
  }
  //? Puppeteer
  async getAllCaseFilesDB() {
    try {

      const hidalgoCustomersIds = await models.CUSTOMER_HAS_BANK.findAll({
        where: {
          customer_id_customer: 1,
        },
      });

      const caseFiles = await models.JUDICIAL_CASE_FILE.findAll({
        where: {
          customer_has_bank_id: {[Op.in]: hidalgoCustomersIds.map((customer) => customer.dataValues.id)},
          // number_case_file:"02373-2021-0-1601-JR-CI-07"
        },
        include: [
          {
            model: models.JUDICIAL_BINNACLE,
            as: "judicialBinnacle",
            include: [
              {
                model: models.JUDICIAL_BIN_NOTIFICATION,
                as: "judicialBinNotifications",
                attributes:{
                  exclude: ["judicialBinnacleId"]
                }
              }
            ]
          },
          {
            model: models.CUSTOMER_HAS_BANK,
            as: "customerHasBank",
            include:[
              {
                model: models.CUSTOMER,
                as: "customer",
              }
            ]
          },
          {
            model: models.CLIENT,
            as: "client",
          }
        ]
      });

      return caseFiles
    } catch (error) {
      console.error("Error en la conexión a la base de datos", error);
      return [];
    }
  }


  async main(): Promise<{ notScanedCaseFiles: number, errorsCounter: number }> {
    let errorsCounter:number = 0;
    try {
      const downloadPath = path.join(__dirname, "../../../../../public/docs");

      if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

      const caseFiles = await this.getAllCaseFilesDB();

      const { browser } = await setupBrowser(downloadPath);

      if(errorsCounter > 4) return { notScanedCaseFiles: 0, errorsCounter: errorsCounter };

      for (const caseFile of caseFiles) {
        if (
          !caseFile.dataValues.isScanValid ||
          caseFile.dataValues.wasScanned ||
          !caseFile.dataValues.processStatus ||
          caseFile.dataValues.processStatus === "Concluido"
        )
          continue;

          const page = await browser.newPage();
          try {
            page.on('dialog', async (dialog) => {
              console.log('Diálogo detectado:', dialog.message());

              await dialog.accept();
            });


          const client = await page.target().createCDPSession();

          await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,
          });

          const binnacleTypes = await models.JUDICIAL_BIN_TYPE_BINNACLE.findAll({
            where: {
              customer_has_bank_id_customer_has_bank:
                caseFile.dataValues.customerHasBankId,
            },
          });

          if (!binnacleTypes) {
            console.log("No existe binnacle type");
            continue;
          }


          const proceduralStages = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.findAll({
            where: {
              customer_has_bank_id_customer_has_bank:
                caseFile.dataValues.customerHasBankId,
            },
          });

          if (!proceduralStages) {
            console.log("No existe procedural stage");
            continue;
          }

          let isValidCaseFile;

          isValidCaseFile = await validateAndNavigateCaseFile(page, caseFile);

          if (!isValidCaseFile) {
              await caseFile.update({
                isScanValid: false
              })
              if (!page.isClosed()) {
                await page.close();
              }
            continue;
          }

          await page.waitForSelector("#command > button");
          await page.click("#command > button");

          // TODO: Save case file
          const caseFileInfo = await getCaseFileInfo(page);
          const caseFileBinacles = await extractPnlSeguimientoData(page);

          let newBinnacles:any[] = []

          const binnaclesIndexs = caseFile.dataValues.judicialBinnacle
            .filter((binnacle: any) => binnacle.dataValues.index !== null)
            .map((binnacle: any) => binnacle.dataValues.index);

          if (binnaclesIndexs.length) newBinnacles = caseFileBinacles.filter((binnacle:any) => !binnaclesIndexs.includes(binnacle.index));
          else newBinnacles = caseFileBinacles;

          await Promise.all( newBinnacles.map(async (binnacle:any) => {

            try {
              const existingJudicialBinnacle = caseFile.dataValues.judicialBinnacle.find(
                (registeredBinnacle: any) => registeredBinnacle.dataValues.index === binnacle.index
              );

              if (existingJudicialBinnacle) {

                console.log("Verificando si hay nuevas notificaciones... 🔔");

                let registeredNotificationCodes: string[] = [];
                const matchedBinnacle = newBinnacles.find(
                  (binnacle: any) => binnacle.index === existingJudicialBinnacle.dataValues.index
                );

                if (existingJudicialBinnacle.dataValues.judicialBinNotifications.length) {
                  registeredNotificationCodes = existingJudicialBinnacle.dataValues.judicialBinNotifications.map(
                    (notification: any) => notification.dataValues.notificationCode
                  );
                }

                const newNotifications = matchedBinnacle.notifications.filter(
                  (notification: any) => !registeredNotificationCodes.includes(notification.notificationCode)
                ) ?? [];

                if (!newNotifications.length) return;

                await Promise.all(
                  newNotifications.map(async (notification: any) => {
                    try {
                      await models.JUDICIAL_BIN_NOTIFICATION.create({
                        notificationCode: notification.notificationCode,
                        addressee: notification.addressee,
                        shipDate: notification.shipDate,
                        attachments: notification.attachments,
                        deliveryMethod: notification.deliveryMethod,
                        resolutionDate: notification.resolutionDate,
                        notificationPrint: notification.notificationPrint,
                        sentCentral: notification.sentCentral,
                        centralReceipt: notification.centralReceipt,
                        notificationToRecipientOn: notification.notificationToRecipientOn,
                        chargeReturnedToCourtOn: notification.chargeReturnedToCourtOn,
                        idJudicialBinnacle: existingJudicialBinnacle.dataValues.id,
                      });
                      console.log(`Notificación creada: ${notification.notificationCode}`);
                    } catch (error) {
                      console.error(
                        `Error al crear notificación con código ${notification.notificationCode}:`,
                        error
                      );
                    }
                  })
                );
                console.log("Verificación de notificaciones terminada... 🔔");
                return
              }
            } catch (error) {
              console.error("Error en la conexión a la base de datos o en el proceso:", error);
            }

            const resolutionDate = moment(
              binnacle.resolutionDate,
              "DD/MM/YYYY HH:mm"
            ).isValid()
              ? moment
                  .tz(binnacle.resolutionDate, "DD/MM/YYYY HH:mm","America/Lima")
                  .format("YYYY-MM-DD HH:mm:ss")
              : null;

            const entryDate = moment(
              binnacle.entryDate,
              "DD/MM/YYYY HH:mm"
            ).isValid()
              ? moment
                  .tz(binnacle.entryDate, "DD/MM/YYYY HH:mm", "America/Lima")
                  .format("YYYY-MM-DD HH:mm:ss")
              : null;

            const provedioDate = moment(
              binnacle.proveido,
              "DD/MM/YYYY HH:mm"
            ).isValid()
              ? moment
                  .tz(binnacle.proveido, "DD/MM/YYYY HH:mm", "America/Lima")
                  .format("YYYY-MM-DD HH:mm:ss")
              : null;

              const binnacleType = binnacle.resolutionDate
              ? binnacleTypes.find(
                  (binnacleType: any) =>
                    binnacleType.dataValues.typeBinnacle === "RESOLUCION"
                )
              : binnacleTypes.find(
                  (binnacleType: any) =>
                    binnacleType.dataValues.typeBinnacle === "ESCRITO"
                );
            const proceduralStage = proceduralStages[0].dataValues.id
            const folios = typeof binnacle.folios === "string" ? Number(binnacle.folios) : null;
            const fojas = typeof binnacle.fojas === "string" ? Number(binnacle.fojas) : null;

            const judicialBinnacleData = await models.JUDICIAL_BINNACLE.create({
              judicialBinProceduralStageId: proceduralStage,
              lastPerformed: binnacle.sumilla ?? '',
              binnacleTypeId: binnacleType?.dataValues.id,
              date: new Date(),
              judicialFileCaseId: caseFile.dataValues.id,
              customerHasBankId: caseFile.dataValues.customerHasBankId,

              index: binnacle.index,
              resolutionDate: resolutionDate,
              entryDate: entryDate,
              notificationType: binnacle.notificationType,
              acto: binnacle.acto,
              fojas: fojas,
              folios: folios,
              provedioDate: provedioDate,
              userDescription: binnacle.userDescription,
              createdBy: "BOT",

              totalTariff: 0,
              tariffHistory: "[]",
            });

            if (judicialBinnacleData) {
              try {
                const extensions = ['.pdf', '.docx'];
                const originalFilePath = path.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${binnacle.index}`)

                for (const extension of extensions) {
                  if (fs.existsSync(originalFilePath + extension)) {
                    const fileWithExtension = originalFilePath + extension;
                    const fileStats = fs.statSync(fileWithExtension);

                    const fileExtension = path.extname(fileWithExtension);

                    console.log("Creando new bin file");

                    const newBinFile = await models.JUDICIAL_BIN_FILE.create({
                      judicialBinnacleId: judicialBinnacleData.dataValues.id,
                      originalName: `binnacle-bot-document-${binnacle.index}${fileExtension}`,
                      nameOriginAws: "",
                      customerHasBankId: judicialBinnacleData.dataValues.customerHasBankId,
                      size: fileStats.size,
                    });

                    console.log("File buffer", newBinFile);

                    const fileBuffer = fs.readFileSync(fileWithExtension);

                    // Crea un flujo de lectura para el archivo
                    const fileStream = Readable.from(fileBuffer);

                    // Crea el archivo con la extensión correcta
                    const file: Express.Multer.File = {
                      fieldname: 'document',
                      originalname: `binnacle-bot-document-${binnacle.index}${fileExtension}`,
                      encoding: '7bit',
                      mimetype: getMimeType(fileExtension),
                      buffer: fileBuffer,
                      size: fileBuffer.length,
                      stream: fileStream,
                      destination: path.join(__dirname, '../../../../../public/docs'),
                      filename: `binnacle-bot-document-${binnacle.index}${fileExtension}`,
                      path: fileWithExtension,
                    };

                    //Sube el archivo a AWS (descomentando cuando sea necesario)
                    // await uploadFile(
                    //   file,
                    //   `${config.AWS_CHB_PATH}${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.id}/${judicialBinnacleData.dataValues.customerHasBankId}/${caseFile.dataValues.client.dataValues.code}/case-file/${caseFile.dataValues.id}/binnacle`
                    // );

                    newBinFile.update({
                      nameOriginAws: `binnacle-bot-document-${binnacle.index}${path.extname(fileWithExtension)}`,
                    });

                    await deleteFile("../public/docs", path.basename(file.filename));
                  }else{
                    console.log("File not exists", originalFilePath);
                  }
                }
              } catch (error) {
                console.log("File not uploaded", error);
              }
            }

            if(!binnacle.notifications.length) return

            await Promise.all(binnacle.notifications.map(async (notification:Notification) => {binnacle
              const shipDate =
                notification.shipDate &&
                moment(notification.shipDate, "DD/MM/YYYY HH:mm").isValid()
                  ? moment.tz(notification.shipDate, "DD/MM/YYYY HH:mm", "America/Lima").format(
                      "YYYY-MM-DD HH:mm:ss"
                    )
                  : null;
              const resolutionDate =
                notification.resolutionDate &&
                moment(notification.resolutionDate, "DD/MM/YYYY HH:mm").isValid()
                  ? moment.tz(
                      notification.resolutionDate,
                      "DD/MM/YYYY HH:mm",
                      "America/Lima"
                    ).format("YYYY-MM-DD HH:mm:ss")
                  : null;
              const notificationPrint =
                notification.notificationPrint &&
                moment(
                  notification.notificationPrint,
                  "DD/MM/YYYY HH:mm"
                ).isValid()
                  ? moment.tz(
                      notification.notificationPrint,
                      "DD/MM/YYYY HH:mm",
                      "America/Lima"
                    ).format("YYYY-MM-DD HH:mm:ss")
                  : null;
              const sentCentral =
                notification.sentCentral &&
                moment(notification.sentCentral, "DD/MM/YYYY HH:mm").isValid()
                  ? moment
                      .tz(
                        notification.sentCentral,
                        "DD/MM/YYYY HH:mm",
                        "America/Lima"
                      )
                      .format("YYYY-MM-DD HH:mm:ss")
                  : null;
                const centralReceipt =
                  notification.centralReceipt &&
                  moment(
                    notification.centralReceipt,
                    "DD/MM/YYYY HH:mm"
                  ).isValid()
                    ? moment.tz(
                        notification.centralReceipt,
                        "DD/MM/YYYY HH:mm",
                        "America/Lima"
                      ).format("YYYY-MM-DD HH:mm:ss")
                    : null;
                const notificationToRecipientOn =
                  notification.notificationToRecipientOn &&
                  moment(
                    notification.notificationToRecipientOn,
                    "DD/MM/YYYY HH:mm"
                  ).isValid()
                    ? moment.tz(
                        notification.notificationToRecipientOn,
                        "DD/MM/YYYY HH:mm",
                        "America/Lima"
                      ).format("YYYY-MM-DD HH:mm:ss")
                    : null;
                const chargeReturnedToCourtOn =
                  notification.chargeReturnedToCourtOn &&
                  moment(
                    notification.chargeReturnedToCourtOn,
                    "DD/MM/YYYY HH:mm"
                  ).isValid()
                    ? moment
                        .tz(
                          notification.chargeReturnedToCourtOn,
                          "DD/MM/YYYY HH:mm",
                          "America/Lima"
                        )
                        .format("YYYY-MM-DD HH:mm:ss")
                    : null;

                await models.JUDICIAL_BIN_NOTIFICATION.create({
                  notificationCode: notification.notificationCode,
                  addressee: notification.addressee,
                  shipDate: shipDate,
                  attachments: notification.attachments,
                  deliveryMethod: notification.deliveryMethod,
                  resolutionDate: resolutionDate,
                  notificationPrint: notificationPrint,
                  sentCentral: sentCentral,
                  centralReceipt: centralReceipt,
                  notificationToRecipientOn: notificationToRecipientOn,
                  chargeReturnedToCourtOn: chargeReturnedToCourtOn,
                  idJudicialBinacle: judicialBinnacleData.dataValues.id,
                });
              // console.log("Creado notificacion: ",  judicialBinNotification);
            }))
          }))
          // delete all docs from public/docs


          Promise.all(newBinnacles.map(async (judicialBinnacle: any) => {
            const baseFilePath = path.join(__dirname, `../../../../../public/docs/binnacle-bot-document-${judicialBinnacle.index}`);

            const extensions = ['.pdf', '.docx'];

            for (const ext of extensions) {
              const filePath = `${baseFilePath}${ext}`;
              console.log("Deleting file", filePath);
              if (fs.existsSync(filePath)) {
                await deleteFile("../public/docs", path.basename(filePath));
              }
            }
          }));

          console.log("Notificaciones creadas correctamente, terminando todo");
          if (!page.isClosed()) {
            await page.close();
          }
          await caseFile.update({ wasScanned: true, isScanValid: true });

        } catch (error) {
          console.error(
            `Error processing case file ${caseFile.dataValues.numberCaseFile}: ${error}`
          );
          if (!page.isClosed()) {
            await page.close();
          }
          errorsCounter++;
        }

      }

      await browser.close();

    } catch (error) {
      console.error(error);
    }
    const notScanedCaseFiles = await models.JUDICIAL_CASE_FILE.findAll({
      where: {
        isScanValid: true,
        wasScanned: false,
      },
    });

    return { notScanedCaseFiles: notScanedCaseFiles.length, errorsCounter: errorsCounter };
  }
}

