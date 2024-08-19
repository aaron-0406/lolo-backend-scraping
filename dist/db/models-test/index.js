"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupModels = void 0;
// dash models
const dash_bank_model_1 = __importDefault(require("../../app-test/dash/dash-bank/db/models/dash-bank.model"));
const dash_city_model_1 = __importDefault(require("../../app-test/dash/dash-city/db/models/dash-city.model"));
const dash_customer_model_1 = __importDefault(require("../../app-test/dash/dash-customer/db/models/dash-customer.model"));
const dash_customer_has_bank_model_1 = __importDefault(require("../../app-test/dash/dash-customer-has-bank/db/models/dash-customer-has-bank.model"));
const dash_customer_user_model_1 = __importDefault(require("../../app-test/dash/dash-customer-user/db/models/dash-customer-user.model"));
const dash_funcionario_model_1 = __importDefault(require("../../app-test/dash/dash-funcionario/db/models/dash-funcionario.model"));
const dash_negotiation_model_1 = __importDefault(require("../../app-test/dash/dash-negotiation/db/models/dash-negotiation.model"));
const dash_rol_model_1 = __importDefault(require("../../app-test/dash/dash-rol/db/models/dash-rol.model"));
//extrajudicial models
const extrajudicial_client_model_1 = __importDefault(require("../../app-test/extrajudicial/extrajudicial-client/db/models/extrajudicial-client.model"));
//judicial models
const judicial_bin_procedural_stage_model_1 = __importDefault(require("../../app-test/judicial/judicial-bin-procedural-stage/db/models/judicial-bin-procedural-stage.model"));
const judicial_bin_type_binnacle_model_1 = __importDefault(require("../../app-test/judicial/judicial-bin-type-binnacle/db/models/judicial-bin-type-binnacle.model"));
const judicial_binnacle_model_1 = __importDefault(require("../../app-test/judicial/judicial-binnacle/db/models/judicial-binnacle.model"));
const judicial_case_file_model_1 = __importDefault(require("../../app-test/judicial/judicial-case-file/db/models/judicial-case-file.model"));
const judicial_court_model_1 = __importDefault(require("../../app-test/judicial/judicial-court/db/models/judicial-court.model"));
const judicial_procedural_way_model_1 = __importDefault(require("../../app-test/judicial/judicial-procedural-way/db/models/judicial-procedural-way.model"));
const judicial_process_reason_model_1 = __importDefault(require("../../app-test/judicial/judicial-process-reason/db/models/judicial-process-reason.model"));
const judicial_sede_model_1 = __importDefault(require("../../app-test/judicial/judicial-sede/db/models/judicial-sede.model"));
const judicial_subject_model_1 = __importDefault(require("../../app-test/judicial/judicial-subject/db/models/judicial-subject.model"));
// dash models
const { Bank, BankSchema } = dash_bank_model_1.default;
const { City, CitySchema } = dash_city_model_1.default;
const { Customer, CustomerSchema } = dash_customer_model_1.default;
const { CustomerHasBank, CustomerHasBankSchema } = dash_customer_has_bank_model_1.default;
const { CustomerUser, CustomerUserSchema } = dash_customer_user_model_1.default;
const { Funcionario, FuncionarioSchema } = dash_funcionario_model_1.default;
const { Negotiation, NegotiationSchema } = dash_negotiation_model_1.default;
const { Role, RoleSchema } = dash_rol_model_1.default;
// extrajudicial models
const { Client, ClientSchema } = extrajudicial_client_model_1.default;
// judicial models
const { JudicialBinProceduralStage, JudicialBinProceduralStageSchema } = judicial_bin_procedural_stage_model_1.default;
const { JudicialBinTypeBinnacle, JudicialBinTypeBinnacleSchema } = judicial_bin_type_binnacle_model_1.default;
const { JudicialBinnacle, JudicialBinnacleSchema } = judicial_binnacle_model_1.default;
const { JudicialCaseFile, JudicialCaseFileSchema } = judicial_case_file_model_1.default;
const { JudicialCourt, JudicialCourtSchema } = judicial_court_model_1.default;
const { JudicialProceduralWay, JudicialProceduralWaySchema } = judicial_procedural_way_model_1.default;
const { JudicialProcessReason, JudicialProcessReasonSchema } = judicial_process_reason_model_1.default;
const { JudicialSede, JudicialSedeSchema } = judicial_sede_model_1.default;
const { JudicialSubject, JudicialSubjectSchema } = judicial_subject_model_1.default;
const setupModels = (sequelize) => {
    Bank.init(BankSchema, Bank.config(sequelize));
    City.init(CitySchema, City.config(sequelize));
    Customer.init(CustomerSchema, Customer.config(sequelize));
    CustomerHasBank.init(CustomerHasBankSchema, CustomerHasBank.config(sequelize));
    CustomerUser.init(CustomerUserSchema, CustomerUser.config(sequelize));
    Funcionario.init(FuncionarioSchema, Funcionario.config(sequelize));
    Negotiation.init(NegotiationSchema, Negotiation.config(sequelize));
    Role.init(RoleSchema, Role.config(sequelize));
    Client.init(ClientSchema, Client.config(sequelize));
    JudicialBinProceduralStage.init(JudicialBinProceduralStageSchema, JudicialBinProceduralStage.config(sequelize));
    JudicialBinTypeBinnacle.init(JudicialBinTypeBinnacleSchema, JudicialBinTypeBinnacle.config(sequelize));
    JudicialBinnacle.init(JudicialBinnacleSchema, JudicialBinnacle.config(sequelize));
    JudicialCaseFile.init(JudicialCaseFileSchema, JudicialCaseFile.config(sequelize));
    JudicialCourt.init(JudicialCourtSchema, JudicialCourt.config(sequelize));
    JudicialProceduralWay.init(JudicialProceduralWaySchema, JudicialProceduralWay.config(sequelize));
    JudicialProcessReason.init(JudicialProcessReasonSchema, JudicialProcessReason.config(sequelize));
    JudicialSede.init(JudicialSedeSchema, JudicialSede.config(sequelize));
    JudicialSubject.init(JudicialSubjectSchema, JudicialSubject.config(sequelize));
    Bank.associate(sequelize.models);
    City.associate(sequelize.models);
    Customer.associate(sequelize.models);
    CustomerHasBank.associate(sequelize.models);
    CustomerUser.associate(sequelize.models);
    Funcionario.associate(sequelize.models);
    Negotiation.associate(sequelize.models);
    Role.associate(sequelize.models);
    Client.associate(sequelize.models);
    JudicialBinProceduralStage.associate(sequelize.models);
    JudicialBinTypeBinnacle.associate(sequelize.models);
    JudicialBinnacle.associate(sequelize.models);
    JudicialCaseFile.associate(sequelize.models);
    JudicialCourt.associate(sequelize.models);
    JudicialProceduralWay.associate(sequelize.models);
    JudicialProcessReason.associate(sequelize.models);
    JudicialSede.associate(sequelize.models);
    JudicialSubject.associate(sequelize.models);
};
exports.setupModels = setupModels;
