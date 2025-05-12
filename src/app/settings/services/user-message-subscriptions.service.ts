import { Model, Op } from "sequelize";
import sequelize from "../../../libs/sequelize";
import boom from '@hapi/boom';
import config from "../../../config/config";
import * as nodemailer from 'nodemailer';
import { Body } from "../types/message.type";

const { models } = sequelize;


class UserMessageSubscriptionsService {
  constructor() {}

  async findAllActiveSubscriptions(customerId: string) {
    try {
      const chbs = await models.CUSTOMER_HAS_BANK.findAll({
        where: {
          customer_id_customer: customerId,
        },
      });

      if(!chbs) {
        throw boom.notFound("Error al obtener bancos");
      }

      console.log(chbs.map((chb) => chb.dataValues.id))

      const subscriptions = await models.USER_MESSAGE_SUBSCRIPTIONS.findAll({
        where: {
          customer_has_bank_id_customer_has_bank: {
            [Op.in]: chbs.map((chb) => chb.dataValues.id),
          },
          is_active_subscription: true,
        },
      });

      if(!subscriptions) {
        throw boom.notFound("Error al obtener suscripciones");
      }

      return subscriptions
    } catch (error) {
      console.log(error)
      throw boom.badRequest("Error al obtener suscripciones");
    };
  }

  async assingSubscription(customerUserId: string, customerHasBankId: number) {
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
          throw boom.badRequest("Error al crear la suscripción");
        }


        return { oldSubscription: null, newSubscription: subscription };
      }

      const oldSubscription = { ...subscription.get() };

      const updatedSubscription = await subscription.update({
        isActiveSubscription: !subscription.dataValues.isActiveSubscription,
      });

      if (!updatedSubscription) {
        throw boom.badRequest("Error al actualizar la suscripción");
      }

      return { oldSubscription: oldSubscription, newSubscription: updatedSubscription };

    } catch (error) {
      console.error('Error in assignSubscription:', error);
      throw boom.badRequest("Error al procesar la suscripción");
    }
  }

  async sendMessagesToSubscribers() {
    try {
      const customers = await models.CUSTOMER.findAll();
      if (!customers?.length) {
        console.log('No customers found');
        return;
      }

      console.log("1. Find all customers", customers);

      for await (const customer of customers) {
        const chbs = await models.CUSTOMER_HAS_BANK.findAll({
          where: {
            customer_id_customer: customer.dataValues.id,
          },
        });

        console.log("1. Find all chbs for customer", chbs);
        if (!chbs?.length) continue;

        for await (const chb of chbs) {
          const [messages, subscriptions] = await Promise.all([
            models.MESSAGE.findAll({
              where: {
                customerHasBankId: chb.dataValues.id,
                createdAt: {
                  [Op.gte]: new Date(
                    new Date().toLocaleString("en-US", {
                      timeZone: "America/Lima",
                    })
                  ).setHours(0, 0, 0, 0),
                  [Op.lt]: new Date(
                    new Date().toLocaleString("en-US", {
                      timeZone: "America/Lima",
                    })
                  ).setHours(23, 59, 59, 999),
                },
              [Op.and]: [
                {
                  [Op.or]: [
                    { clientId: { [Op.not]: null } },
                    { judicialCaseFileId: { [Op.not]: null } }
                  ]
                }
              ]
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
              ],
            }),
            models.USER_MESSAGE_SUBSCRIPTIONS.findAll({
              where: {
                customer_has_bank_id_customer_has_bank: chb.dataValues.id,
                is_active_subscription: true,
              },
              include: [
                {
                  model: models.CUSTOMER_USER,
                  as: "customerUser",
                }
              ]
            }),
          ]);

          //  🚀 Server is running on port 4000
          // server is running on port 4000
          // Test account created: {
          //   user: 'ggccv23rti54ljrg@ethereal.email',
          //   pass: 'Qw1CqwFHcPsJ9eDJ3G',
          //   smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
          //   imap: { host: 'imap.ethereal.email', port: 993, secure: true },
          //   pop3: { host: 'pop3.ethereal.email', port: 995, secure: true },
          //   web: 'https://ethereal.email',
          //   mxEnabled: false
          // }

          if (!messages?.length || !subscriptions?.length) continue;

          console.log("2. Find all messages and subscriptions", messages, subscriptions);


          // Process messages and subscriptions
          for await (const subscription of subscriptions) {

            const infoMessages = messages.reduce<Record<string, any[]>>((acc, message) => {
              if (message.dataValues.judicialCaseFile?.numberCaseFile) {
                const caseFileNumber = message.dataValues.judicialCaseFile.numberCaseFile;
                if (!acc[caseFileNumber]) {
                  acc[caseFileNumber] = [];
                }
                acc[caseFileNumber].push(message);
              }
              return acc;
            }, {});

            console.log("3. Find all messages for subscription", infoMessages);

            const messagesList = Object.entries(infoMessages)
              .map(([caseFileNumber, messages]) => {
                const messagesHtml = messages.map(message => {
                  const clientName = message.dataValues.client?.name || "N/A";
                  const subject = message.dataValues.subject;
                  let body: Body;
                  try {
                    body = JSON.parse(message.dataValues.body) as Body;
                  } catch (error) {
                    console.error('Error parsing message body:', error);
                    body = {
                      header: {
                        title: '',
                        resolutionDate: '',
                        entryDate: null,
                        resolution: '',
                        fojas: '',
                        folios: null
                      },
                      sections: [],
                      notifications: [],
                      url: ''
                    };
                  }

                  console.log(body)


                  return `
                    <div style="margin-bottom: 10px;">
                      <p style="margin: 5px 0;"><strong>Asunto:</strong> ${subject}</p>
                      ${
                        message.dataValues.keyMessage
                          ? `
                        <a href="http://localhost:3000/${JSON.parse(body.url) ?? "[]"}"
                           style="display: inline-block;
                                  margin-top: 5px;
                                  padding: 4px 8px;
                                  background: #007bff;
                                  color: white;
                                  text-decoration: none;
                                  border-radius: 3px;
                                  font-size: 12px;">
                          Ver más detalles
                        </a>
                      `
                          : ""
                      }
                    </div>
                  `;
                }).join('');

                return `
                  <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
                    <h3 style="margin: 0 0 10px 0;">Expediente #${caseFileNumber}</h3>
                    <p style="margin: 5px 0;"><strong>Cliente:</strong> ${messages[0].dataValues.client?.name || "N/A"}</p>
                    <div style="margin-top: 10px;">
                      ${messagesHtml}
                    </div>
                  </div>
                `;
              })
              .join("");

            // Production email config
            // const transporter = nodemailer.createTransport({
            //   host: config.AWS_EMAIL_HOST,
            //   port: 587,
            //   secure: false,
            //   auth: {
            //     user: config.AWS_EMAIL_USER,
            //     pass: config.AWS_EMAIL_PASSWORD,
            //   },
            // });

            // Test email config
            const transporter = nodemailer.createTransport({
              host: "smtp.ethereal.email",
              port: 587,
              secure: false,
              auth: {
                user: 'ggccv23rti54ljrg@ethereal.email',
                pass: 'Qw1CqwFHcPsJ9eDJ3G',
              },
            });

            const emailMessage = {
              from: 'ggccv23rti54ljrg@ethereal.email',
              to: subscription.dataValues.customerUser.dataValues.email,
              subject: "Resumen de Mensajes del Día",
              html: `
                <div style="font-family: Arial, sans-serif;">
                  <h2>Resumen de Mensajes</h2>
                  ${messagesList}
                </div>
              `,
            };

            const info = await transporter.sendMail(emailMessage);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log("Preview URL:", previewUrl);
          }
        }
      }

    } catch (error) {
      console.error('Error in sendMessagesToSubscribers:', error);
      throw boom.internal('Error sending messages to subscribers');
    }
  }
}

export default UserMessageSubscriptionsService;