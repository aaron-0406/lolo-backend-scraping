import sequelize from "../../../../../../../libs/sequelize";
const { models } = sequelize;
import moment from "moment-timezone";
import { processAndUploadFiles } from "./processAndUploadFiles";

export async function saveBinnacleAndFiles(caseFile: any, binnacle: any, binnacleTypes: any, proceduralStages: any) {
  const resolutionDate = moment(binnacle.resolutionDate, "DD/MM/YYYY HH:mm").isValid()
    ? moment.tz(binnacle.resolutionDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
    : null;

  const entryDate = moment(binnacle.entryDate, "DD/MM/YYYY HH:mm").isValid()
    ? moment.tz(binnacle.entryDate, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
    : null;

  const provedioDate = moment(binnacle.proveido, "DD/MM/YYYY HH:mm").isValid()
    ? moment.tz(binnacle.proveido, "DD/MM/YYYY HH:mm", "America/Lima").format("YYYY-MM-DD HH:mm:ss")
    : null;

  const binnacleType = binnacle.resolutionDate
    ? binnacleTypes.find((type: any) => type.dataValues.typeBinnacle === "RESOLUCION")
    : binnacleTypes.find((type: any) => type.dataValues.typeBinnacle === "ESCRITO");

  const proceduralStage = proceduralStages[0].dataValues.id;

  // Crea el registro del binnacle en la base de datos
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
    fojas: Number(binnacle.fojas),
    folios: Number(binnacle.folios),
    provedioDate: provedioDate,
    userDescription: binnacle.userDescription,
    createdBy: "BOT",
    totalTariff: 0,
    tariffHistory: "[]",
  });

  // Procesar archivos asociados al binnacle
  if (judicialBinnacleData) {
    await processAndUploadFiles(judicialBinnacleData, binnacle.index);
  }
}
