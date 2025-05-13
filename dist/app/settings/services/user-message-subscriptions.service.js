"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const config_1 = __importDefault(require("../../../config/config"));
const nodemailer = __importStar(require("nodemailer"));
const { models } = sequelize_2.default;
class UserMessageSubscriptionsService {
    constructor() { }
    async findAllActiveSubscriptions(customerId) {
        try {
            const chbs = await models.CUSTOMER_HAS_BANK.findAll({
                where: {
                    customer_id_customer: customerId,
                },
            });
            if (!chbs) {
                throw boom_1.default.notFound("Error al obtener bancos");
            }
            console.log(chbs.map((chb) => chb.dataValues.id));
            const subscriptions = await models.USER_MESSAGE_SUBSCRIPTIONS.findAll({
                where: {
                    customer_has_bank_id_customer_has_bank: {
                        [sequelize_1.Op.in]: chbs.map((chb) => chb.dataValues.id),
                    },
                    is_active_subscription: true,
                },
            });
            if (!subscriptions) {
                throw boom_1.default.notFound("Error al obtener suscripciones");
            }
            return subscriptions;
        }
        catch (error) {
            console.log(error);
            throw boom_1.default.badRequest("Error al obtener suscripciones");
        }
        ;
    }
    async assingSubscription(customerUserId, customerHasBankId) {
        try {
            let subscription = await models.USER_MESSAGE_SUBSCRIPTIONS.findOne({
                where: {
                    customerUserId: customerUserId,
                    customerHasBankId: customerHasBankId,
                },
            });
            if (!subscription) {
                subscription = await models.USER_MESSAGE_SUBSCRIPTIONS.create({
                    customerUserId: customerUserId,
                    customerHasBankId: customerHasBankId,
                    isActiveSubscription: true,
                });
                if (!subscription) {
                    throw boom_1.default.badRequest("Error al crear la suscripción");
                }
                return { oldSubscription: null, newSubscription: subscription };
            }
            const oldSubscription = Object.assign({}, subscription.get());
            const updatedSubscription = await subscription.update({
                isActiveSubscription: !subscription.dataValues.isActiveSubscription,
            });
            if (!updatedSubscription) {
                throw boom_1.default.badRequest("Error al actualizar la suscripción");
            }
            return { oldSubscription: oldSubscription, newSubscription: updatedSubscription };
        }
        catch (error) {
            console.error('Error in assignSubscription:', error);
            throw boom_1.default.badRequest("Error al procesar la suscripción");
        }
    }
    async sendMessagesToSubscribers() {
        var _a, e_1, _b, _c, _d, e_2, _e, _f;
        try {
            const customers = await models.CUSTOMER.findAll();
            if (!(customers === null || customers === void 0 ? void 0 : customers.length)) {
                console.log('No customers found');
                return;
            }
            try {
                // console.log("1. Find all customers", customers);
                for (var _g = true, customers_1 = __asyncValues(customers), customers_1_1; customers_1_1 = await customers_1.next(), _a = customers_1_1.done, !_a;) {
                    _c = customers_1_1.value;
                    _g = false;
                    try {
                        const customer = _c;
                        const chbs = await models.CUSTOMER_HAS_BANK.findAll({
                            where: {
                                customer_id_customer: customer.dataValues.id,
                            },
                        });
                        // console.log("1. Find all chbs for customer", chbs);
                        if (!(chbs === null || chbs === void 0 ? void 0 : chbs.length))
                            continue;
                        // Get all active subscriptions for the customer
                        const currentSubscriptions = await models.USER_MESSAGE_SUBSCRIPTIONS.findAll({
                            where: {
                                customer_has_bank_id_customer_has_bank: {
                                    [sequelize_1.Op.in]: chbs.map((chb) => chb.dataValues.id),
                                },
                                is_active_subscription: true,
                            },
                            include: [
                                {
                                    model: models.CUSTOMER_USER,
                                    as: "customerUser",
                                }
                            ]
                        });
                        // Generate reduce of chb subscriptions
                        const customerUserSubscriptions = currentSubscriptions.reduce((acc, subscription) => {
                            const customerUserId = subscription.dataValues.customerUserId;
                            if (!acc[customerUserId]) {
                                acc[customerUserId] = {
                                    name: subscription.dataValues.customerUser.dataValues.name,
                                    email: subscription.dataValues.customerUser.dataValues.email,
                                    chbSubscriptions: [],
                                };
                            }
                            acc[customerUserId].chbSubscriptions.push(subscription.dataValues.customerHasBankId);
                            return acc;
                        }, {});
                        console.log("CUSTOMER", customer.dataValues.companyName);
                        console.log("customerUserSubscriptions", customerUserSubscriptions);
                        try {
                            for (var _h = true, _j = (e_2 = void 0, __asyncValues(Object.keys(customerUserSubscriptions))), _k; _k = await _j.next(), _d = _k.done, !_d;) {
                                _f = _k.value;
                                _h = false;
                                try {
                                    const customerUserId = _f;
                                    const subscriptions = customerUserSubscriptions[customerUserId].chbSubscriptions;
                                    const email = customerUserSubscriptions[customerUserId].email;
                                    const name = customerUserSubscriptions[customerUserId].name;
                                    // Get all messages for the customer 
                                    const currentMessages = await models.MESSAGE.findAll({
                                        where: {
                                            customerHasBankId: {
                                                [sequelize_1.Op.in]: subscriptions,
                                            },
                                            createdAt: {
                                                [sequelize_1.Op.gte]: new Date(new Date().toLocaleString("en-US", {
                                                    timeZone: "America/Lima",
                                                })).setHours(0, 0, 0, 0) - 5,
                                                // [Op.lt]: new Date(
                                                //   new Date().toLocaleString("en-US", {
                                                //     timeZone: "America/Lima",
                                                //   })
                                                // ).setHours(23, 59, 59, 999),
                                            },
                                            [sequelize_1.Op.and]: [
                                                {
                                                    [sequelize_1.Op.or]: [
                                                        { clientId: { [sequelize_1.Op.not]: null } },
                                                        { judicialCaseFileId: { [sequelize_1.Op.not]: null } },
                                                    ],
                                                },
                                            ],
                                        },
                                        include: [
                                            {
                                                model: models.CLIENT,
                                                as: "client",
                                            },
                                            {
                                                model: models.JUDICIAL_CASE_FILE,
                                                as: "judicialCaseFile",
                                            },
                                        ]
                                    });
                                    if (!(currentMessages === null || currentMessages === void 0 ? void 0 : currentMessages.length))
                                        continue;
                                    console.log("2. Find all messages for subscriptions chbs", currentMessages.map((message) => message.dataValues.customerHasBankId));
                                    const infoMessages = currentMessages.reduce((acc, message) => {
                                        var _a;
                                        if ((_a = message.dataValues.judicialCaseFile) === null || _a === void 0 ? void 0 : _a.numberCaseFile) {
                                            const caseFileNumber = message.dataValues.judicialCaseFile.numberCaseFile;
                                            if (!acc[caseFileNumber]) {
                                                acc[caseFileNumber] = [];
                                            }
                                            acc[caseFileNumber].push(message);
                                        }
                                        return acc;
                                    }, {});
                                    const messagesList = Object.entries(infoMessages)
                                        .map(([caseFileNumber, messages]) => {
                                        var _a;
                                        // Extract client name from first message in each case
                                        const clientName = ((_a = messages[0].dataValues.client) === null || _a === void 0 ? void 0 : _a.name) || "Sin información";
                                        const messagesHtml = messages
                                            .map((message) => {
                                            var _a;
                                            const subject = message.dataValues.subject;
                                            let body;
                                            try {
                                                body = JSON.parse(message.dataValues.body);
                                            }
                                            catch (error) {
                                                console.error("Error parsing message body:", error);
                                                body = {
                                                    header: {
                                                        title: "",
                                                        resolutionDate: "",
                                                        entryDate: null,
                                                        resolution: "",
                                                        fojas: "",
                                                        folios: null,
                                                    },
                                                    sections: [],
                                                    notifications: [],
                                                    url: "",
                                                };
                                            }
                                            // Button styling with hover effect through inline CSS
                                            const buttonStyle = `
                  display: inline-block;
                  padding: 8px 15px;
                  background-color: #225679;
                  color: white;
                  text-decoration: none;
                  border-radius: 4px;
                  font-size: 14px;
                  font-weight: 500;
                  margin-top: 10px;
                  border: none;
                  transition: background-color 0.3s ease;
                `;
                                            return `
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #225679;">
                    <p style="margin: 5px 0; font-size: 16px;"><span style="color: #555; font-weight: 600;">Asunto:</span> ${subject}</p>
                      ${message.dataValues.keyMessage
                                                ? `
                          <a href="https://lolobank.com${(_a = JSON.parse(body.url)[0]) !== null && _a !== void 0 ? _a : ""}" 
                            style="${buttonStyle}"
                            onmouseover="this.style.backgroundColor='#004494'"
                            onmouseout="this.style.backgroundColor='#0056b3'">
                            <span style="vertical-align: middle;">Ver más detalles</span>
                            <span style="margin-left: 5px; vertical-align: middle;">➔</span>
                          </a>
                        `
                                                : ""}
                    </div>
                  `;
                                        })
                                            .join("");
                                        return `
              <div style="border: 1px solid #e0e0e0; background-color: white; padding: 20px; margin-bottom: 25px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eaeaea; padding-bottom: 12px; margin-bottom: 15px;">
                  <h3 style="margin: 0; color: #333; font-size: 18px;">Expediente #${caseFileNumber}</h3>
                  <span style="background-color: #e6f3ff; color: #225679; padding: 4px 10px; border-radius: 20px; font-size: 14px; font-weight: 500;">Activo</span>
                </div>
                <p style="margin: 5px 0 15px 0; font-size: 15px;">
                  <span style="color: #555; font-weight: 600;">Cliente:</span> 
                  <span style="color: #333;">${clientName}</span>
                </p>
                <div style="margin-top: 15px;">
                  ${messagesHtml}
                </div>
              </div>
            `;
                                    })
                                        .join("");
                                    const transport = nodemailer.createTransport({
                                        host: config_1.default.AWS_EMAIL_HOST,
                                        port: 465,
                                        secure: true,
                                        auth: {
                                            user: config_1.default.AWS_EMAIL_USER,
                                            pass: config_1.default.AWS_EMAIL_PASSWORD,
                                        },
                                    });
                                    // Current date formatting
                                    const today = new Date();
                                    const formattedDate = today.toLocaleDateString("es-ES", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    });
                                    const emailMessage = {
                                        from: config_1.default.AWS_EMAIL,
                                        to: email,
                                        subject: `Resumen de Actualizaciones Judiciales Lolo Bank Sistema de Gestión Judicial - ${formattedDate}`,
                                        html: `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Resumen Judicial</title>
                </head>
                <body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; color: #333;">
                  <!-- Header -->
                  <div style="background-color: #225679; padding: 25px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Resumen de Actualizaciones Judiciales</h1>
                    <p style="color: #e0e0e0; margin: 10px 0 0 0; font-size: 16px;">${formattedDate}</p>
                  </div>
                  
                  <!-- Content -->
                  <div style="max-width: 650px; margin: 0 auto; padding: 25px 15px;">
                    <!-- Introduction -->
                    <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                      <p style="margin-top: 0; font-size: 16px; line-height: 1.5;">
                        Estimado(a), ${name}
                      </p>
                      <p style="font-size: 16px; line-height: 1.5;">
                        Le presentamos el resumen de las actualizaciones más recientes de sus expedientes. A continuación encontrará la información detallada de cada caso:
                      </p>
                    </div>
                    
                    <!-- Cases List -->
                    ${messagesList.length > 0
                                            ? messagesList
                                            : `
                      <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center;">
                        <p style="font-size: 16px; color: #666;">No hay actualizaciones para mostrar en este momento.</p>
                      </div>
                    `}
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                      <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
                      <p style="margin-bottom: 5px;">Si tiene preguntas, contáctenos a través de nuestros canales oficiales.</p>
                      <p style="margin-top: 15px; color: #999;">&copy; ${today.getFullYear()} Lolo Bank Sistema de Gestión Judicial</p> 
                    </div>
                  </div>
                </body>
                </html>
              `,
                                    };
                                    try {
                                        console.log("📨 Sending mail to", email);
                                        transport.sendMail(emailMessage, (error, info) => {
                                            console.log(error);
                                            console.log(info);
                                        });
                                    }
                                    catch (error) {
                                        console.log("Error sending email", error);
                                    }
                                }
                                finally {
                                    _h = true;
                                }
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (!_h && !_d && (_e = _j.return)) await _e.call(_j);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                    }
                    finally {
                        _g = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_g && !_a && (_b = customers_1.return)) await _b.call(customers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        catch (error) {
            console.error('Error in sendMessagesToSubscribers:', error);
            throw boom_1.default.internal('Error sending messages to subscribers');
        }
    }
}
exports.default = UserMessageSubscriptionsService;
