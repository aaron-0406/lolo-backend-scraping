"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routerApi = void 0;
const express_1 = __importDefault(require("express"));
const judicial_binnacle_routes_1 = __importDefault(require("./judicial/judicial-binnacle.routes"));
const router = express_1.default.Router();
const routerApi = (app) => {
    app.use('/api/scraping/v1', router);
    router.use("/judicial/binnacle", judicial_binnacle_routes_1.default);
};
exports.routerApi = routerApi;
exports.default = exports.routerApi;
