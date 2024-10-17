import { Op, where } from "sequelize"
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
import { deleteFileBucket, uploadFile } from "../../../../../libs/aws_bucket";
import { getMimeType } from "../libs/get-nine-types";
import { Notification } from "../types/external-types";
import { deleteFolderContents } from "./judicial-binacle.service.libs/main/deleteFolderContents";
import { v4 } from "uuid";
import config from "../../../../../config/config";
import * as nodemailer from 'nodemailer';
import { generateHtmlStructureToNewBinnacle } from "../assets/html-templates/generateHtmlStructureToNewBinnacle";
import boom from "@hapi/boom";

const { models } = sequelize;

export class JudicialBinaclePersonalScanService {

  constructor() {}

  async findCaseFileByNumber (caseFileId: number) {
    const caseFile = models.JUDICIAL_CASE_FILE.findOne({
      where:{
        id_judicial_case_file: caseFileId,
        [Op.and]: [
          { is_scan_valid: true }, // caseFile.dataValues.isScanValid
          { was_scanned: false }, // caseFile.dataValues.wasScanned
          { process_status:"Activo" }, // caseFile.dataValues.processStatus
        ]
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
    })
    if (!caseFile) throw boom.notFound("expediente no encontrado");
    else return caseFile;
  }

  async findAllBinnaclesTypes (customerHasBankId: number) {
    const binnacleTypes = await models.JUDICIAL_BIN_TYPE_BINNACLE.findAll({
      where: {
        customer_has_bank_id_customer_has_bank: customerHasBankId,
      },
    });

    if (!binnacleTypes || !binnacleTypes.length) throw boom.notFound("Binnacles types not found");
    return binnacleTypes
  }

  async findAllproceduralStages(customerHasBankId:number){
    const proceduralStages = await models.JUDICIAL_BIN_PROCEDURAL_STAGE.findAll({
      where: {
        customer_has_bank_id_customer_has_bank:customerHasBankId,
      },
    });

    if(!proceduralStages || !proceduralStages.length) throw boom.notFound("Procedural stages not found");
    else return proceduralStages
  }

  async findBinnacleByID(id: string) {
    const judicialBinnacle = await models.JUDICIAL_BINNACLE.findOne({
      include: [
        {
          model: models.JUDICIAL_BIN_TYPE_BINNACLE,
          as: "binnacleType",
        },
        {
          model: models.JUDICIAL_BIN_PROCEDURAL_STAGE,
          as: "judicialBinProceduralStage",
        },
        {
          model: models.JUDICIAL_BIN_FILE,
          as: "judicialBinFiles",
        },
      ],
      where: {
        id,
      },
    });

    if (!judicialBinnacle) {
      throw boom.notFound("Bitacora Judicial no encontrada");
    }

    return judicialBinnacle;
  }


  async main(caseFileId: number, binnacleId:number) {
    let errorsCounter:number = 0;
    try {
      const downloadPath = path.join(__dirname, "../../../../../public/docs");
      if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

      const { browser } = await setupBrowser(downloadPath);

      const caseFile = await this.findCaseFileByNumber(caseFileId)
      if (!caseFile) throw boom.notFound("Case file not found");

      //? BLOCK 1

        try {
          if (!caseFile.dataValues.isScanValid || caseFile.dataValues.wasScanned || !caseFile.dataValues.processStatus || caseFile.dataValues.processStatus === "Concluido" ) return;

          let isValidCaseFile:boolean;
          let binnaclesFromDB: any[] = [];
          let prevBinnaclesIndexs: any[]= []
          let scrapingBinnaclesIndex: any[] = [];
          let newBinnaclesFound: any[] = [];

          console.log("Getting binnacle types");
          const binnacleTypes = await this.findAllBinnaclesTypes(caseFile.dataValues.customerHasBankId)
          if (!binnacleTypes) throw boom.notFound("Binnacles types not found");
          console.log("Getting procedural stages");
          const proceduralStages = await this.findAllproceduralStages(caseFile.dataValues.customerHasBankId)
          if (!proceduralStages) throw boom.notFound("Procedural stages not found");

          const page = await browser.newPage();

          // Check dialog
          page.on('dialog', async (dialog) => {
            console.log('Dialog detected:', dialog.message());
            await dialog.accept();
          });

          const client = await page.target().createCDPSession();

          await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,
          });

          isValidCaseFile = await validateAndNavigateCaseFile(page, caseFile);

          if (!isValidCaseFile) {
            await caseFile.update({
              isScanValid: false,
            });
            if (!page.isClosed()) {
              await page.close();
            }
            throw boom.notFound("Case file is not valid");
          }

          await page.waitForSelector("#command > button");
          await page.click("#command > button");


          const caseFileInfo = await getCaseFileInfo(page); // scrapp
          const caseFileBinacles = await extractPnlSeguimientoData(page);

          prevBinnaclesIndexs = caseFile.dataValues.judicialBinnacle
            .filter((binnacle: any) => binnacle.dataValues.index !== null)
            .map((binnacle: any) => binnacle.dataValues.index);
          binnaclesFromDB = caseFile.dataValues.judicialBinnacle
            .filter((binnacle: any) => binnacle.dataValues.index !== null)
            .map((binnacle: any) => binnacle);

          scrapingBinnaclesIndex = caseFileBinacles.map((binnacle:any) => binnacle.index);

          console.log("CASE 1: there are new binnacles added");
          // ! Case 1: there are new binnacles added
          if (prevBinnaclesIndexs.length < scrapingBinnaclesIndex.length) {
            const countBinnaclesAdded = scrapingBinnaclesIndex.length - prevBinnaclesIndexs.length;

            // Update prev binnacles indexs

              const prevBinnacles = caseFile.dataValues.judicialBinnacle
              .filter((binnacle: any) => binnacle.dataValues.index !== null)
              .map((binnacle: any) => binnacle);

            await Promise.all(prevBinnacles.map(async (prevBinnacle: any) => {
              await prevBinnacle.update({
                index: prevBinnacle.dataValues.index + countBinnaclesAdded
              });
            }));

            // Actualizar los índices previos en memoria

            prevBinnaclesIndexs = prevBinnaclesIndexs.map((index: number) => index + countBinnaclesAdded);

            // Obtener las bitácoras nuevas desde la base de datos filtrando por índice

            binnaclesFromDB = await models.JUDICIAL_BINNACLE.findAll({
              where: {
                judicial_file_case_id_judicial_file_case: caseFileId,
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
          }
            // Find the binnacle by index

            newBinnaclesFound = caseFileBinacles.filter(
              (binnacle: any) => !prevBinnaclesIndexs.includes(binnacle.index)
            )

            // create new binnacles
            console.log("New binnacles found 📁", newBinnaclesFound)

            if(newBinnaclesFound.length){
              await Promise.all(newBinnaclesFound.map(async (binnacle:any) => {

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
                });


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
            }

            // TODO: Find binnacle and id and index

            // console.log("binnacles from db", binnaclesFromDB)
            console.log("binnalce id", binnacleId)

            const binnacleToUpadteFromDB = binnaclesFromDB.find((binnacle: any) => binnacle.dataValues.id === binnacleId)

            // console.log("Binnacle form db", binnacleToUpadteFromDB)

            const binncleToUpdateFromScraping = caseFileBinacles.find((binnacle: any)=> binnacle.index === binnacleToUpadteFromDB.dataValues.index)
            if(!binncleToUpdateFromScraping) throw boom.notFound("Binnacle to update form scraping not found")

              // TODO: delete all notifications
              // 1. Delete binnacle notifications
              const notificationsToDestroy = await models.JUDICIAL_BIN_NOTIFICATION.destroy({
                where:{
                  judicial_binacle_id_judicial_binacle : binnacleId
                }
              })

              // 2. find binnacle files fron bd

              const binnaclesFiles = await models.JUDICIAL_BIN_FILE.findAll({
                where:{
                  judicial_binnacle_id_judicial_binnacle: binnacleId,
                  deleted_at: null
                }
              })


              // TODO: find binnacles files from bd and bucket where binnacle index is a number and delete
              // 3. Delete on bucket and db files
              await Promise.all(binnaclesFiles.map(async(binnacleFile:any)=>{
                try{
                  await deleteFileBucket(
                    `${config.AWS_CHB_PATH}${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.id}/${binnacleFile.dataValues.customerHasBankId}/${caseFile.dataValues.client.dataValues.code}/case-file/${caseFile.dataValues.id}/binnacle/${binnacleFile.dataValues.nameOriginAws}`
                  )
                  await models.JUDICIAL_BIN_FILE.destroy({
                    where:{
                      judicial_binnacle_id_judicial_binnacle: binnacleId,
                      customer_has_bank_id_customer_has_bank: binnacleFile.dataValues.customerHasBankId,
                      name_origin_aws: binnacleFile.dataValues.nameOriginAws
                    }
                  })
                }catch(e){
                  console.log(e)
                }
              }))

              // TODO: update binnacle information
              // 4. upadte binnacle
              console.log("Updating binnacle information... 📝");

              const resolutionDate = moment(
                binncleToUpdateFromScraping.resolutionDate,
                "DD/MM/YYYY HH:mm"
              ).isValid() && binncleToUpdateFromScraping.resolutionDate
                ? moment
                    .tz(binncleToUpdateFromScraping.resolutionDate, "DD/MM/YYYY HH:mm","America/Lima")
                    .format("YYYY-MM-DD HH:mm:ss")
                : null;

              const entryDate = moment(
                binncleToUpdateFromScraping.entryDate,
                "DD/MM/YYYY HH:mm"
              ).isValid() && binncleToUpdateFromScraping.entryDate
                ? moment
                    .tz(binncleToUpdateFromScraping.entryDate, "DD/MM/YYYY HH:mm", "America/Lima")
                    .format("YYYY-MM-DD HH:mm:ss")
                : null;

              const provedioDate = moment(
                binncleToUpdateFromScraping.proveido,
                "DD/MM/YYYY HH:mm"
              ).isValid() && binncleToUpdateFromScraping.proveido
                ? moment
                    .tz(binncleToUpdateFromScraping.proveido, "DD/MM/YYYY HH:mm", "America/Lima")
                    .format("YYYY-MM-DD HH:mm:ss")
                : null;

                const binnacleType = binncleToUpdateFromScraping.resolutionDate
                ? binnacleTypes.find(
                    (binnacleType: any) =>
                      binnacleType.dataValues.typeBinnacle === "RESOLUCION"
                  )
                : binnacleTypes.find(
                    (binnacleType: any) =>
                      binnacleType.dataValues.typeBinnacle === "ESCRITO"
                  );
              const proceduralStage = proceduralStages[0].dataValues.id
              const folios = typeof binncleToUpdateFromScraping.folios === "string" ? Number(binncleToUpdateFromScraping.folios) : null;
              const fojas = typeof binncleToUpdateFromScraping.fojas === "string" ? Number(binncleToUpdateFromScraping.fojas) : null;

              const juducialBinnacleUpadated = await binnacleToUpadteFromDB.update({
                judicialBinProceduralStageId: proceduralStage,
                lastPerformed: binncleToUpdateFromScraping.sumilla ?? '',
                binnacleTypeId: binnacleType?.dataValues.id,
                date: new Date(),
                judicialFileCaseId: caseFile.dataValues.id,
                customerHasBankId: caseFile.dataValues.customerHasBankId,

                index: binncleToUpdateFromScraping.index,
                resolutionDate: resolutionDate,
                entryDate: entryDate,
                notificationType: binncleToUpdateFromScraping.notificationType,
                acto: binncleToUpdateFromScraping.acto,
                fojas: fojas,
                folios: folios,
                provedioDate: provedioDate,
                userDescription: binncleToUpdateFromScraping.userDescription,
                createdBy: "BOT",

                totalTariff: 0,
                tariffHistory: "[]",
              },
            )

            // TODO: create new binnecles files and files on bucket
            if (juducialBinnacleUpadated) {
              try {
                const extensions = [".pdf", ".docx"];
                const originalFilePath = path.join(
                  __dirname,
                  `../../../../../public/docs/binnacle-bot-document-${binncleToUpdateFromScraping.index}`
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
                      judicialBinnacleId: juducialBinnacleUpadated.dataValues.id,
                      originalName: `${newBinnacleName}${fileExtension}`,
                      nameOriginAws: "",
                      customerHasBankId: juducialBinnacleUpadated.dataValues.customerHasBankId,
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
                      `${config.AWS_CHB_PATH}${caseFile.dataValues.customerHasBank.dataValues.customer.dataValues.id}/${juducialBinnacleUpadated.dataValues.customerHasBankId}/${caseFile.dataValues.client.dataValues.code}/case-file/${caseFile.dataValues.id}/binnacle`
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
            // TODO: add new notifications by scraping

            if(!binncleToUpdateFromScraping.notifications.length) return

            await Promise.all(binncleToUpdateFromScraping.notifications.map(async (notification:Notification) => {
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
                  idJudicialBinacle: binnacleId,
                });
              // console.log("Creado notificacion: ",  judicialBinNotification);
            }))

            const docsPath = path.join(__dirname, `../../../../../public/docs`);

            await deleteFolderContents(docsPath);

        } catch (error) {
          throw boom.notFound("Error to proccess case file");
        }

      await browser.close();
      const binnacle = await this.findBinnacleByID(String(binnacleId))
      return binnacle;
      
    } catch (error) {
      console.error(error);
    }
  }
}

