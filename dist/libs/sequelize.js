"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const config_1 = __importDefault(require("../config/config"));
const models_1 = require("../db/models");
const USER = encodeURIComponent(config_1.default.dbUser);
const PASSWORD = encodeURIComponent(config_1.default.dbPassword);
const URI = `mysql://${USER}:${PASSWORD}@${config_1.default.dbHost}:${config_1.default.dbPort}/${config_1.default.dbName}`;
const sequelize = new sequelize_1.Sequelize(URI, {
    dialect: "mysql",
    logging: (msg) => console.log(msg)
});
(0, models_1.setupModels)(sequelize);
exports.default = sequelize;
