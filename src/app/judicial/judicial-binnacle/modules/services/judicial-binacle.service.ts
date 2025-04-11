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
import { getMimeType } from "../libs/get-nine-types";
import { Notification } from "../types/external-types";
import { deleteFolderContents } from "./judicial-binacle.service.libs/main/deleteFolderContents";
import { v4 } from "uuid";
import config from "../../../../../config/config";
import * as nodemailer from 'nodemailer';
import { generateHtmlStructureToNewBinnacle } from "../assets/html-templates/generateHtmlStructureToNewBinnacle";
import { MessageType } from "../../../../settings/types/message.type";
import { generateJsonStructureToNewBinnacle } from "../assets/json-templates/generateJsonStructureToNewBinnacle";
import CustomerUserService from "../../../../dash/services/customer-user.service";
import MessageService from "../../../../settings/services/message.service";
import { MessagesUserService } from "../../../../settings/services/messages-user.service";

const customerUserService = new CustomerUserService()
const messageService = new MessageService()
const messagesUsersService = new MessagesUserService()

const { models } = sequelize;

// ! THINGS TO FIX
  //// 1. detect if normar captcha is solved
  //// 2. detect if bot is detected where it shouldn't be
  //// 3. detect if case file is valid

export class JudicialBinacleService {
  constructor() {}

  // async getAllCaseFiles(): Promise<CaseFiles> {
  //   return caseFilesData as CaseFiles;
  // }

  //! Temp tu reload count of valid case fieles
  async resetAllCaseFiles(): Promise<void> {
    await models.JUDICIAL_CASE_FILE.update(
      { wasScanned: false },
      {
        where: {
          [Op.and]: [
            { is_scan_valid: true }, // caseFile.dataValues.isScanValid
            { was_scanned: true }, // caseFile.dataValues.wasScanned
            { process_status: "Activo" }, // caseFile.dataValues.processStatus
          ],
        },
      }
    );
  }
  //? Puppeteer
  async getAllCaseFilesDB() {
    try {

      const activeCustomersIds = await models.CUSTOMER.findAll({
        where: {
          is_scrapper_active: true,
        },
        attributes: ["id_customer"]
      });

      const customerHasBanksIds = await models.CUSTOMER_HAS_BANK.findAll({
        where: {
          customer_id_customer: {
            [Op.in]: activeCustomersIds.map(
              (customer) => customer.dataValues.id_customer
            ),
          },
        },
      });

      const caseFiles = await models.JUDICIAL_CASE_FILE.findAll({
        where: {
          customer_has_bank_id: {
            [Op.in]: [28, 30, 31],
          },
          [Op.and]: [
            { is_scan_valid: true }, // caseFile.dataValues.isScanValid
            { was_scanned: false }, // caseFile.dataValues.wasScanned
            { process_status:"Activo" }, // caseFile.dataValues.processStatus
          ],
          // number_case_file:"04660-2015-0-1601-JR-CI-06"
        },
        include: [
          {
            model: models.JUDICIAL_BINNACLE,
            as: "judicialBinnacle",
            include: [
              {
                model: models.JUDICIAL_BIN_NOTIFICATION,
                as: "judicialBinNotifications",
                attributes: {
                  exclude: ["judicialBinnacleId"],
                },
              },
            ],
          },
          {
            model: models.CUSTOMER_HAS_BANK,
            as: "customerHasBank",
            include: [
              {
                model: models.CUSTOMER,
                as: "customer",
              },
            ],
          },
          {
            model: models.CLIENT,
            as: "client",
          },
          {
            model: models.CUSTOMER_USER,
            as: "customerUser",
          },
        ],
        limit: 5000,
        offset: 0,
      });
      // console.log(
      //   caseFiles.map(
      //     (caseFileData: any) => caseFileData.dataValues.customerUser.dataValues.email
      //   )
      // );

      return caseFiles
    } catch (error) {
      console.error("Error during connection to database", error);
      return [];
    }
  }


  async main(): Promise<{ notScanedCaseFiles: number, errorsCounter: number }> {
    let errorsCounter:number = 0;
    try {
      const downloadPath = path.join(__dirname, "../../../../../public/docs");

      const caseFiles = await this.getAllCaseFilesDB();

      const { browser } = await setupBrowser(downloadPath);

      if(errorsCounter > 4) return { notScanedCaseFiles: 0, errorsCounter: errorsCounter };

      for (const caseFile of caseFiles) {
        if (!fs.existsSync(downloadPath)) {
          console.log("Create a folder to save files")
          fs.mkdirSync(downloadPath);
        }
        else{
          await deleteFolderContents(downloadPath)
          fs.mkdirSync(downloadPath);
        }

        if (
          !caseFile.dataValues.isScanValid ||
          caseFile.dataValues.wasScanned ||
          !caseFile.dataValues.processStatus ||
          caseFile.dataValues.processStatus === "Concluido"
        )
          continue;

          const page = await browser.newPage();
          try {
            page.on('dialog', async (dialog: any) => {
              console.log('Dialog detected:', dialog.message());

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
            console.log("Binnacle type not found");
            continue;
          }


          const proceduralStages = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.findAll({
            where: {
              customer_has_bank_id_customer_has_bank:
                caseFile.dataValues.customerHasBankId,
            },
          });

          if (!proceduralStages) {
            console.log("Procedural stage not found");
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
          const caseFileBinacles = await extractPnlSeguimientoData(page, downloadPath);

          // console.log(caseFileBinacles)

          let binnaclesFromDB: any[] = [];
          let prevBinnaclesIndexs: any[]= []
          let newBinnaclesFound: any[] = [];
          let insertedBinnacles: any[] = [];

          // console.log("Case file code: ", caseFile.dataValues.numberCaseFile)

          prevBinnaclesIndexs = caseFile.dataValues.judicialBinnacle
            .filter((binnacle: any) => binnacle.dataValues.index !== null)
            .map((binnacle: any) => binnacle.dataValues.index);
          binnaclesFromDB = caseFile.dataValues.judicialBinnacle
            .filter((binnacle: any) => binnacle.dataValues.index !== null)
            .map((binnacle: any) => binnacle);



          const newBinnaclesIndex = caseFileBinacles.map((binnacle:any) => binnacle.index);

          if (newBinnaclesIndex.length > prevBinnaclesIndexs.length) {
            const contNewBinnacles = newBinnaclesIndex.length - prevBinnaclesIndexs.length;

            // Get all binnacles
            const prevBinnacles = caseFile.dataValues.judicialBinnacle
              .filter((binnacle: any) => binnacle.dataValues.index !== null)
              .map((binnacle: any) => binnacle);

            await Promise.all(prevBinnacles.map(async (prevBinnacle: any) => {
              await prevBinnacle.update({
                index: prevBinnacle.dataValues.index + contNewBinnacles
              });
            }));


            // Get the new binnacles from the database filtering by index
            binnaclesFromDB = await models.JUDICIAL_BINNACLE.findAll({
              where: {
                judicial_file_case_id_judicial_file_case: caseFile.dataValues.id,
                index: {
                  [Op.not]: null
                }
              },
              include: [
                {
                  model: models.JUDICIAL_BIN_NOTIFICATION,
                  as: "judicialBinNotifications",
                  attributes: {
                    exclude: ["judicialBinnacleId"]
                  }
                }
              ]
            });

            // Update the previous indices in memory
            // prevBinnaclesIndexs = prevBinnaclesIndexs.map((index: number) => index + contNewBinnacles);
            prevBinnaclesIndexs = binnaclesFromDB.filter((binnacle: any) =>  binnacle.dataValues.index !== null).map((binnacle: any) => binnacle.dataValues.index);
          }

          if(newBinnaclesIndex.length < prevBinnaclesIndexs.length){
            const contNewBinnacles = newBinnaclesIndex.length - prevBinnaclesIndexs.length;
            // Find the eliminated binnacle by index

          }

          newBinnaclesFound = caseFileBinacles.filter(
            (binnacle: any) => !prevBinnaclesIndexs.includes(binnacle.index)
          )
          // console.log("Previous binnacles indexs updated:", binnaclesFromDB.filter(binnacle => binnacle.dataValues.index !== null)) // []
          console.log("New binnacles found", newBinnaclesFound) // [8]
          // console.log("New binnacles found length ", newBinnaclesFound.length) // [8]

          // ! Read only new binnacles to create [4] => DB
          // ! Read only new binnacles to create [5] => CEJ
          // ! 1 - Read only new binnacles to create
          // ! 5-4 -> 1
          // ! + 1

          if(newBinnaclesFound.length){
            insertedBinnacles = await Promise.all(newBinnaclesFound.map(async (binnacle:any) => {

              console.log("Adding binnacles to database... 📁");

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
              },{ returning: true });


              if (judicialBinnacleData) {
                try {
                  const extensions = [".pdf", ".docx"];
                  const originalFilePath = path.join(
                    __dirname,
                    `../../../../../public/docs/binnacle-bot-document-${binnacle.index}`
                  );

                  const newBinnacleName = `[BBD]-${v4()}`;
                  for (const extension of extensions) {
                    const fileWithExtension = `${originalFilePath}${extension}`;

                    if (fs.existsSync(fileWithExtension)) {
                      console.log("Archivo encontrado:", fileWithExtension);

                      const fileStats = fs.statSync(fileWithExtension);
                      const fileExtension = path.extname(fileWithExtension);

                      // **Renombrar el archivo localmente**
                      const newLocalFilePath = path.join(
                        __dirname,
                        `../../../../../public/docs/${newBinnacleName}${fileExtension}`
                      );
                      fs.renameSync(fileWithExtension, newLocalFilePath);

                      console.log("Archivo renombrado localmente:", newLocalFilePath);

                      const newBinFile = await models.JUDICIAL_BIN_FILE.create({
                        judicialBinnacleId: judicialBinnacleData.dataValues.id,
                        originalName: `${newBinnacleName}${fileExtension}`,
                        nameOriginAws: "",
                        customerHasBankId: judicialBinnacleData.dataValues.customerHasBankId,
                        size: fileStats.size,
                      });

                      const fileBuffer = fs.readFileSync(newLocalFilePath);
                      const fileStream = Readable.from(fileBuffer);

                      const file: Express.Multer.File = {
                        fieldname: "document",
                        originalname: `${newBinnacleName}${fileExtension}`,
                        encoding: "7bit",
                        mimetype: getMimeType(fileExtension),
                        buffer: fileBuffer,
                        size: fileBuffer.length,
                        stream: fileStream,
                        destination: path.join(__dirname, "../../../../../public/docs"),
                        filename: `${newBinnacleName}${fileExtension}`,
                        path: newLocalFilePath,
                      };

                      await uploadFile(
                        file,
                        `${config.AWS_CHB_PATH}${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.id}/${judicialBinnacleData.dataValues.customerHasBankId}/${caseFile.dataValues.client.dataValues.code}/case-file/${caseFile.dataValues.id}/binnacle`
                      );

                      await newBinFile.update({
                        nameOriginAws: `${newBinnacleName}${fileExtension}`,
                      });

                      await deleteFile("../public/docs", path.basename(file.filename));

                      console.log("Archivo renombrado, subido y eliminado localmente.");
                    } else {
                      console.log("El archivo no existe:", fileWithExtension);
                    }
                  }
                } catch (error) {
                  console.log("Error al subir el archivo:", error);
                }
              }

              if(!binnacle.notifications.length) {
                return judicialBinnacleData.dataValues
              }

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
              return judicialBinnacleData.dataValues
            }))

            // console.log("Inserted binnacles: ", insertedBinnacles)
            // Test account created: {
            //   user: 'jblyf2ftfkgyv32f@ethereal.email',
            //   pass: '5StqmXTdVgdcHc7afv',
            //   smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
            //   imap: { host: 'imap.ethereal.email', port: 993, secure: true },
            //   pop3: { host: 'pop3.ethereal.email', port: 995, secure: true },
            //   web: 'https://ethereal.email',
            //   mxEnabled: false
            // }

            {/** ! TEST SEND EMAILS */}
            // await Promise.all(newBinnaclesFound.map(async(binnacle:any) => {

            //   const transporter = nodemailer.createTransport({
            //     host: "smtp.ethereal.email",
            //     port: 587,
            //     secure: false,
            //     auth: {
            //       user: 'jblyf2ftfkgyv32f@ethereal.email',
            //       pass: '5StqmXTdVgdcHc7afv',
            //     },
            //   })

            //   const message = {
            //     from: 'jblyf2ftfkgyv32f@ethereal.email',
            //     to: 'luis.silva@gmail.com',
            //     subject: "Notificación de PNL",
            //     text: "Notificación de PNL",
            //     html: generateHtmlStructureToNewBinnacle(binnacle, "Nueva bitácora registrada")
            //   }

            //   const info = await transporter.sendMail(message)

            //   const previewUrl = nodemailer.getTestMessageUrl(info);
            //   console.log("Preview URL to new binnacle:", previewUrl);
            // }))

            { /** ! PROD SEND EMAILS */}
            // await Promise.all(newBinnaclesFound.map(async(binnacle:any) => {
            //   const transporter = nodemailer.createTransport({
            //     host: config.AWS_EMAIL_HOST,
            //     port: 587,
            //     secure: false,
            //     auth: {
            //       user: config.AWS_EMAIL_USER,
            //       pass: config.AWS_EMAIL_PASSWORD,
            //     },
            //   })

            //   const message = {
            //     from: config.AWS_EMAIL,
            //     to: `${caseFile.dataValues.customerUser.dataValues.email},luisarmandoballadares@gmail.com,intjavaaron@gmail.com,mahidalgo@hidalgovidalabogados.com`,
            //     subject: "Notificación de PNL",
            //     text: "Nueva bitácora registrada",
            //     html: generateHtmlStructureToNewBinnacle({
            //       data: binnacle,
            //       titleDescription:"Nueva bitácora registrada",
            //       numberCaseFile:caseFile.dataValues.numberCaseFile
            //     })
            //   }

            //   await transporter.sendMail(message)
            // }))

            // TODO - Send new binnacle to APP
            const userBot = await customerUserService.findUserBot(caseFile?.dataValues?.chbTransferred ?? caseFile.dataValues.customerHasBankId)
            console.log("User bot: ", userBot)
            if (!userBot) continue;
            await Promise.all(newBinnaclesFound.map(async(binnacle:any) => {
              const insertedBinnacle = insertedBinnacles.find(
                (binnacleInserted: any) =>
                  binnacleInserted.index === binnacle.index
              );
              try {
              // 1. Generate new Message
                  const message: Omit<
                  MessageType,
                  "id" | "createdAt" | "updatedAt" | "deletedAt"
                > = {
                  customerHasBankId: caseFile?.dataValues?.chbTransferred ?? caseFile.dataValues.customerHasBankId,
                  customerUserId: userBot.dataValues.id,
                  subject: "Nueva bitácora registrada",
                  keyMessage: "new-binnacle-registered-by-bot",
                  body: JSON.stringify(
                    generateJsonStructureToNewBinnacle({
                      data: binnacle,
                      titleDescription: "Nueva bitácora registrada",
                      numberCaseFile: caseFile.dataValues.numberCaseFile,
                      urls: JSON.stringify([`/judicial/${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.urlIdentifier}/expediente/${caseFile.dataValues.numberCaseFile}/bitacora/${insertedBinnacle.id}`]),
                    })
                  ),
                  wasRead: false,
                };

                const newMessage = await messageService.create(message)

                if (!newMessage) return

                const newMessagesUsers = await messagesUsersService.create({
                  customerHasBankId: caseFile?.dataValues?.chbTransferred ?? caseFile.dataValues.customerHasBankId,
                  messageId: newMessage.dataValues.id,
                  customerUserId: userBot.dataValues.id,
                })

                // TODO: Remove
                /* const newMessagesUserOwner = await messagesUsersService.create({
                  customerHasBankId: caseFile.dataValues.customerHasBankId,
                  messageId: newMessage.dataValues.id,
                  customerUserId: 7,
                }) */

                console.log("New message created: [BINNACLE]", newMessage);
              } catch (error) {
                console.log("Error al crear notificación con código ", error)
              }
            }))
          }
          // ! Read binnacles from DB to create new notifications
          if (binnaclesFromDB.length) {
            await Promise.all(binnaclesFromDB.map(async (binnacle:any) => {
              try {
                binnacle = binnacle.dataValues
                let previousNotifications: any[] = binnacle.judicialBinNotifications.map((Notification:any) => Notification.dataValues)
                let notificationsFound: any[] = []

                console.log("Verify if there are new notifications... 🔔");

                  const matchedBinnacle = caseFileBinacles.find(
                    (data: any) => data.index === binnacle.index
                  );

                notificationsFound = matchedBinnacle?.notifications ?? []
                const notificationsCodesPrevious = previousNotifications.map((notification:any) => notification.notificationCode)
                const newNotifications = notificationsFound.filter((notification:any) => !notificationsCodesPrevious.includes(notification.notificationCode))
                // console.log("Prev notification codes 01: ", notificationsCodesPrevious)
                // console.log("Notifications Found", notificationsFound)
                // console.log("New notifications 🔔 01", newNotifications)

                if(previousNotifications.length === notificationsFound.length) return
                else{
                  const notificationsCodesPrevious = previousNotifications.map((notification:any) => notification.notificationCode)
                  const newNotifications = notificationsFound.filter((notification:any) => !notificationsCodesPrevious.includes(notification.notificationCode))
                  // console.log("Prev notification codes: ", notificationsCodesPrevious)
                  // console.log("New notifications 🔔", newNotifications)
                  if(!newNotifications.length || !matchedBinnacle) return
                  await Promise.all(newNotifications.map(async (notification:any) => {
                    try {
                      const shipDate = notification.shipDate && moment(notification.shipDate, "DD/MM/YYYY HH:mm").isValid() ? moment.tz(notification.shipDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                      const resolutionDate = notification.resolutionDate && moment(notification.resolutionDate, "DD/MM/YYYY HH:mm").isValid() ? moment.tz(notification.resolutionDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                      const notificationPrint = notification.notificationPrint && moment(notification.notificationPrint, "DD/MM/YYYY HH:mm").isValid() ? moment.tz(notification.notificationPrint, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                      const sentCentral = notification.sentCentral && moment(notification.sentCentral, "DD/MM/YYYY HH:mm").isValid() ? moment.tz(notification.sentCentral, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                      const centralReceipt = notification.centralReceipt && moment(notification.centralReceipt, "DD/MM/YYYY HH:mm").isValid() ? moment.tz(notification.centralReceipt, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                      const notificationToRecipientOn = notification.notificationToRecipientOn && moment(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm").isValid() ? moment.tz(notification.notificationToRecipientOn, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;
                      const chargeReturnedToCourtOn = notification.chargeReturnedToCourtOn && moment(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm").isValid() ? moment.tz(notification.chargeReturnedToCourtOn, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss") : null;

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
                        idJudicialBinacle: binnacle.id,
                      });
                      console.log(`Notificación creada: ${notification.notificationCode}`);
                    } catch (error) {
                      console.error(
                        `Error al crear notificación con código ${notification.notificationCode}:`,
                        error
                      );
                    }
                  }))
                  {/** ! TEST SEND EMAILS WITH NEW NOTIFICATIONS */}
                  // const transporter = nodemailer.createTransport({
                  //   host: "smtp.ethereal.email",
                  //   port: 587,
                  //   secure: false,
                  //   auth: {
                  //     user: 'jblyf2ftfkgyv32f@ethereal.email',
                  //     pass: '5StqmXTdVgdcHc7afv',
                  //   },
                  // })

                  // const message = {
                  //   from: 'jblyf2ftfkgyv32f@ethereal.email',
                  //   to: 'luis.silva@gmail.com',
                  //   subject: "Notificación de PNL",
                  //   text: "Notificación de PNL",
                  //   html: generateHtmlStructureToNewBinnacle({...matchedBinnacle, notifications:newNotifications}, "Nuevas notificaciones registradas")
                  // }

                  // const info = await transporter.sendMail(message)

                  // const previewUrl = nodemailer.getTestMessageUrl(info);
                  // console.log("Preview URL to new notifications:", previewUrl);

                  {/** ! PROD SEND EMAILS WITH NEW NOTIFICATIONS */}
                  // const transporter = nodemailer.createTransport({
                  //   host: config.AWS_EMAIL_HOST,
                  //   port: 587,
                  //   secure: false,
                  //   auth: {
                  //     user: config.AWS_EMAIL_USER,
                  //     pass: config.AWS_EMAIL_PASSWORD,
                  //   },
                  // })

                  // const message = {
                  //   from: config.AWS_EMAIL,
                  //   to: `${caseFile.dataValues.customerUser.dataValues.email},luisarmandoballadares@gmail.com,intjavaaron@gmail.com,mahidalgo@hidalgovidalabogados.com`,
                  //   subject: "Notificación de PNL",
                  //   text: "Nueva notificación registrada",
                  //   html: generateHtmlStructureToNewBinnacle({
                  //     data: {
                  //       ...matchedBinnacle,
                  //       notifications: newNotifications,
                  //     },
                  //     titleDescription: "Nuevas notificaciones registradas",
                  //     numberCaseFile: caseFile.dataValues.numberCaseFile,
                  //   }),
                  // };

                  // await transporter.sendMail(message)
                  try {
                      // TODO: Send new message to APP [NOTIFICATION]
                      const userBot = await customerUserService.findUserBot(caseFile?.dataValues?.chbTransferred ?? caseFile.dataValues.customerHasBankId)
                      console.log("User bot: ", userBot)
                      if (!userBot) return;
                      const message: Omit<
                        MessageType,
                        "id" | "createdAt" | "updatedAt" | "deletedAt"
                      > = {
                        customerHasBankId: caseFile?.dataValues?.chbTransferred ?? caseFile.dataValues.customerHasBankId,
                        customerUserId: userBot.dataValues.id,
                        subject: "Nuevas notificaciones registradas",
                        keyMessage: "new-notifications-registered-by-bot",
                        body: JSON.stringify(
                          generateJsonStructureToNewBinnacle({
                            data: {
                              ...matchedBinnacle,
                              notifications: newNotifications,
                            },
                            titleDescription:
                              "Nuevas notificaciones registradas",
                            numberCaseFile: caseFile.dataValues.numberCaseFile,
                            urls: JSON.stringify([
                              `/judicial/${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.urlIdentifier}/expediente/${caseFile.dataValues.numberCaseFile}/bitacora/${binnacle.id}`,
                            ]),
                          })
                        ),
                        wasRead: false,
                      };

                      const newMessage = await messageService.create(message)

                      if (!newMessage) return

                      const newMessagesUsers = await messagesUsersService.create({
                        customerHasBankId: caseFile?.dataValues?.chbTransferred ?? caseFile.dataValues.customerHasBankId,
                        messageId: newMessage.dataValues.id,
                        customerUserId: userBot.dataValues.id,
                      })

                      // TODO: Remove
                      /* const newMessagesUserOwner = await messagesUsersService.create({
                        customerHasBankId: caseFile.dataValues.customerHasBankId,
                        messageId: newMessage.dataValues.id,
                        customerUserId: 7,
                      }) */

                      console.log(
                        "New message created [Notification]: ",
                        newMessage
                      );
                  } catch (error) {
                    console.error("Error during creation of judicial notifications:", error);
                  }
                }
              } catch (error) {
                console.error("Error during creation of judicial notifications:", error);
              }
            }) )
          }
          // delete all docs from public/docs

          const docsPath = path.join(__dirname, `../../../../../public/docs`);

          await deleteFolderContents(docsPath);


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

