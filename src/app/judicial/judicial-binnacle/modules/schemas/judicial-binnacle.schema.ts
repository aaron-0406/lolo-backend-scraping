import Joi from "joi"
const caseFileId = Joi.number().required();
const binnacleId = Joi.number().required();

const updateAllBinnacleInformationByScrapingSchema = Joi.object({
  caseFileId,
  binnacleId,
});

export default {
  updateAllBinnacleInformationByScrapingSchema
}