"use strict";
// import { Sequelize } from "sequelize";
// // dash models
// import dashBankModel from "../../app/dash/dash-bank/db/models/dash-bank.model"
// import dashCityModel from "../../modules/dash/dash-city/db/models-0/dash-city.model"
// import dashCustomerModel from "../../modules/dash/dash-customer/db/models-0/dash-customer.model"
// import dashCustomerHasBankModel from "../../modules/dash/dash-customer-has-bank/db/models-0/dash-customer-has-bank.model"
// import dashCustomerUserModel from "../../modules/dash/dash-customer-user/db/models-0/dash-customer-user.model"
// import dashFuncionarioModel from "../../modules/dash/dash-funcionario/db/models-0/dash-funcionario.model"
// import dashNegotiationModel from "../../modules/dash/dash-negotiation/db/models-0/dash-negotiation.model"
// import dashRole from "../../modules/dash/dash-rol/db/models-0/dash-rol.model"
// //extrajudicial models
// import extrajudicialClientModel from "../../modules/extrajudicial/extrajudicial-client/db/models/extrajudicial-client.model"
// //judicial models
// import judicialBinProceduralStageModel from "../../modules/judicial/judicial-bin-procedural-stage/db/models/judicial-bin-procedural-stage.model"
// import judicialBinTypeBinnacleModel from "../../modules/judicial/judicial-bin-type-binnacle/db/models/judicial-bin-type-binnacle.model"
// import judicialBinnacleModel from "../../modules/judicial/judicial-binnacle/db/models/judicial-binnacle.model"
// import judicialCaseFileModel from "../../modules/judicial/judicial-case-file/db/models/judicial-case-file.model"
// import judicialCourtModel from "../../modules/judicial/judicial-court/db/models/judicial-court.model"
// import judicialProceduralWayModel from "../../modules/judicial/judicial-procedural-way/db/models/judicial-procedural-way.model"
// import judicialProcessReasonModel from "../../modules/judicial/judicial-process-reason/db/models/judicial-process-reason.model"
// import judicialSedeModel from "../../modules/judicial/judicial-sede/db/models/judicial-sede.model"
// import judicialSubjectModel from "../../modules/judicial/judicial-subject/db/models/judicial-subject.model"
// // dash models
// const { Bank, BankSchema } = dashBankModel;
// const { City, CitySchema } = dashCityModel;
// const { Customer, CustomerSchema } = dashCustomerModel;
// const { CustomerHasBank, CustomerHasBankSchema } = dashCustomerHasBankModel;
// const { CustomerUser, CustomerUserSchema } = dashCustomerUserModel;
// const { Funcionario, FuncionarioSchema } = dashFuncionarioModel;
// const { Negotiation, NegotiationSchema } = dashNegotiationModel;
// const { Role, RoleSchema } = dashRole;
// // extrajudicial models
// const { Client, ClientSchema } = extrajudicialClientModel;
// // judicial models
// const { JudicialBinProceduralStage, JudicialBinProceduralStageSchema } = judicialBinProceduralStageModel;
// const { JudicialBinTypeBinnacle, JudicialBinTypeBinnacleSchema } = judicialBinTypeBinnacleModel;
// const { JudicialBinnacle, JudicialBinnacleSchema } = judicialBinnacleModel;
// const { JudicialCaseFile, JudicialCaseFileSchema } = judicialCaseFileModel;
// const { JudicialCourt, JudicialCourtSchema } = judicialCourtModel;
// const { JudicialProceduralWay, JudicialProceduralWaySchema } = judicialProceduralWayModel;
// const { JudicialProcessReason, JudicialProcessReasonSchema } = judicialProcessReasonModel;
// const { JudicialSede, JudicialSedeSchema } = judicialSedeModel;
// const { JudicialSubject, JudicialSubjectSchema } = judicialSubjectModel;
// export const setupModels = (sequelize: Sequelize) => {
//   Bank.init(BankSchema, Bank.config(sequelize));
//   City.init(CitySchema, City.config(sequelize));
//   Customer.init(CustomerSchema, Customer.config(sequelize));
//   CustomerHasBank.init(CustomerHasBankSchema, CustomerHasBank.config(sequelize));
//   CustomerUser.init(CustomerUserSchema, CustomerUser.config(sequelize));
//   Funcionario.init(FuncionarioSchema, Funcionario.config(sequelize));
//   Negotiation.init(NegotiationSchema, Negotiation.config(sequelize));
//   Role.init(RoleSchema, Role.config(sequelize));
//   Client.init(ClientSchema, Client.config(sequelize));
//   JudicialBinProceduralStage.init(JudicialBinProceduralStageSchema, JudicialBinProceduralStage.config(sequelize));
//   JudicialBinTypeBinnacle.init(JudicialBinTypeBinnacleSchema, JudicialBinTypeBinnacle.config(sequelize));
//   JudicialBinnacle.init(JudicialBinnacleSchema, JudicialBinnacle.config(sequelize));
//   JudicialCaseFile.init(JudicialCaseFileSchema, JudicialCaseFile.config(sequelize));
//   JudicialCourt.init(JudicialCourtSchema, JudicialCourt.config(sequelize));
//   JudicialProceduralWay.init(JudicialProceduralWaySchema, JudicialProceduralWay.config(sequelize));
//   JudicialProcessReason.init(JudicialProcessReasonSchema, JudicialProcessReason.config(sequelize));
//   JudicialSede.init(JudicialSedeSchema, JudicialSede.config(sequelize));
//   JudicialSubject.init(JudicialSubjectSchema, JudicialSubject.config(sequelize));
//   Bank.associate(sequelize.models);
//   City.associate(sequelize.models);
//   Customer.associate(sequelize.models);
//   CustomerHasBank.associate(sequelize.models);
//   CustomerUser.associate(sequelize.models);
//   Funcionario.associate(sequelize.models);
//   Negotiation.associate(sequelize.models);
//   Role.associate(sequelize.models);
//   Client.associate(sequelize.models);
//   JudicialBinProceduralStage.associate(sequelize.models);
//   JudicialBinTypeBinnacle.associate(sequelize.models);
//   JudicialBinnacle.associate(sequelize.models);
//   JudicialCaseFile.associate(sequelize.models);
//   JudicialCourt.associate(sequelize.models);
//   JudicialProceduralWay.associate(sequelize.models);
//   JudicialProcessReason.associate(sequelize.models);
//   JudicialSede.associate(sequelize.models);
//   JudicialSubject.associate(sequelize.models);
// }
