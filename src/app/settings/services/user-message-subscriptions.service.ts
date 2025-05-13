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

      // console.log("1. Find all customers", customers);

      for await (const customer of customers) {
        const chbs = await models.CUSTOMER_HAS_BANK.findAll({
          where: {
            customer_id_customer: customer.dataValues.id,
          },
        });

        // console.log("1. Find all chbs for customer", chbs);
        if (!chbs?.length) continue;

        // Get all active subscriptions for the customer

        const currentSubscriptions = await models.USER_MESSAGE_SUBSCRIPTIONS.findAll({
          where: {
            customer_has_bank_id_customer_has_bank: {
              [Op.in]: chbs.map((chb) => chb.dataValues.id),
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

        const customerUserSubscriptions = currentSubscriptions.reduce<Record<string, any>>(
          (acc, subscription) => {
            const customerUserId = subscription.dataValues.customerUserId;
            if (!acc[customerUserId]) {
              acc[customerUserId] = {
                name: subscription.dataValues.customerUser.dataValues.name,
                email: subscription.dataValues.customerUser.dataValues.email,
                chbSubscriptions: [],
              };
            }
            acc[customerUserId].chbSubscriptions.push(
              subscription.dataValues.customerHasBankId
            );
            return acc;
          },
          {}
        );

        console.log("CUSTOMER", customer.dataValues.companyName);
        console.log ("customerUserSubscriptions", customerUserSubscriptions)

        for await (const customerUserId of Object.keys(customerUserSubscriptions)) {
          const subscriptions = customerUserSubscriptions[customerUserId].chbSubscriptions;
          const email = customerUserSubscriptions[customerUserId].email;
          const name = customerUserSubscriptions[customerUserId].name; 

          // Get all messages for the customer 
          const currentMessages = await models.MESSAGE.findAll({
            where: {
              customerHasBankId: {
                [Op.in]: subscriptions,
              },
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
                    { judicialCaseFileId: { [Op.not]: null } },
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

          if (!currentMessages?.length) continue;

          console.log("2. Find all messages for subscriptions chbs", currentMessages.map((message) => message.dataValues.customerHasBankId));

          const infoMessages = currentMessages.reduce<Record<string, any[]>>(
            (acc, message) => {
              if (message.dataValues.judicialCaseFile?.numberCaseFile) {
                const caseFileNumber =
                  message.dataValues.judicialCaseFile.numberCaseFile;
                if (!acc[caseFileNumber]) {
                  acc[caseFileNumber] = [];
                }
                acc[caseFileNumber].push(message);
              }
              return acc;
            },
            {}
          );


          const messagesList = Object.entries(infoMessages)
          .map(([caseFileNumber, messages]) => {
            // Extract client name from first message in each case
            const clientName =
              messages[0].dataValues.client?.name || "Sin información";

            const messagesHtml = messages
              .map((message) => {
                const subject = message.dataValues.subject;
                let body: Body;
                try {
                  body = JSON.parse(message.dataValues.body) as Body;
                } catch (error) {
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
                      ${
                        message.dataValues.keyMessage
                          ? `
                          <a href="http://localhost:3000${JSON.parse(body.url)[0] ?? ""}" 
                            style="${buttonStyle}"
                            onmouseover="this.style.backgroundColor='#004494'"
                            onmouseout="this.style.backgroundColor='#0056b3'">
                            <span style="vertical-align: middle;">Ver más detalles</span>
                            <span style="margin-left: 5px; vertical-align: middle;">➔</span>
                          </a>
                        `
                          : ""
                      }
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

          const transporter = nodemailer.createTransport({
              host: config.AWS_EMAIL_HOST,
              port: 587,
              secure: false,
              auth: {
                user: config.AWS_EMAIL_USER,
                pass: config.AWS_EMAIL_PASSWORD,
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
              from: config.AWS_EMAIL,
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
                    ${
                      messagesList.length > 0
                        ? messagesList
                        : `
                      <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center;">
                        <p style="font-size: 16px; color: #666;">No hay actualizaciones para mostrar en este momento.</p>
                      </div>
                    `
                    }
                    
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

            await transporter.sendMail(emailMessage);
            // const previewUrl = nodemailer.getTestMessageUrl(info);
            // console.log("Preview URL:", previewUrl);
        }
        

        // for await (const chb of chbs) {
        //   const [messages, subscriptions] = await Promise.all([
        //     models.MESSAGE.findAll({
        //       where: {
        //         customerHasBankId: chb.dataValues.id,
        //         createdAt: {
        //           [Op.gte]: new Date(
        //             new Date().toLocaleString("en-US", {
        //               timeZone: "America/Lima",
        //             })
        //           ).setHours(0, 0, 0, 0),
        //           [Op.lt]: new Date(
        //             new Date().toLocaleString("en-US", {
        //               timeZone: "America/Lima",
        //             })
        //           ).setHours(23, 59, 59, 999),
        //         },
        //         [Op.and]: [
        //           {
        //             [Op.or]: [
        //               { clientId: { [Op.not]: null } },
        //               { judicialCaseFileId: { [Op.not]: null } },
        //             ],
        //           },
        //         ],
        //       },
        //       include: [
        //         {
        //           model: models.CLIENT,
        //           as: "client",
        //         },
        //         {
        //           model: models.JUDICIAL_CASE_FILE,
        //           as: "judicialCaseFile",
        //         },
        //       ],
        //     }),
        //     models.USER_MESSAGE_SUBSCRIPTIONS.findAll({
        //       where: {
        //         customer_has_bank_id_customer_has_bank: chb.dataValues.id,
        //         is_active_subscription: true,
        //       },
        //       include: [
        //         {
        //           model: models.CUSTOMER_USER,
        //           as: "customerUser",
        //         },
        //       ],
        //     }),
        //   ]);

        //   //  🚀 Server is running on port 4000
        //   // server is running on port 4000
        //   // Test account created: {
        //   //   user: 'ggccv23rti54ljrg@ethereal.email',
        //   //   pass: 'Qw1CqwFHcPsJ9eDJ3G',
        //   //   smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
        //   //   imap: { host: 'imap.ethereal.email', port: 993, secure: true },
        //   //   pop3: { host: 'pop3.ethereal.email', port: 995, secure: true },
        //   //   web: 'https://ethereal.email',
        //   //   mxEnabled: false
        //   // }

        //   if (!messages?.length || !subscriptions?.length) continue;

        //   console.log(
        //     "2. Find all messages and subscriptions",
        //     // messages,
        //     // subscriptions
        //   );

        //   // Process messages and subscriptions
        //   for await (const subscription of subscriptions) {
        //     const infoMessages = messages.reduce<Record<string, any[]>>(
        //       (acc, message) => {
        //         if (message.dataValues.judicialCaseFile?.numberCaseFile) {
        //           const caseFileNumber =
        //             message.dataValues.judicialCaseFile.numberCaseFile;
        //           if (!acc[caseFileNumber]) {
        //             acc[caseFileNumber] = [];
        //           }
        //           acc[caseFileNumber].push(message);
        //         }
        //         return acc;
        //       },
        //       {}
        //     );

        //     console.log("3. Find all messages for subscription", infoMessages);

        //     const messagesList = Object.entries(infoMessages)
        //       .map(([caseFileNumber, messages]) => {
        //         // Extract client name from first message in each case
        //         const clientName =
        //           messages[0].dataValues.client?.name || "Sin información";

        //         const messagesHtml = messages
        //           .map((message) => {
        //             const subject = message.dataValues.subject;
        //             let body: Body;
        //             try {
        //               body = JSON.parse(message.dataValues.body) as Body;
        //             } catch (error) {
        //               console.error("Error parsing message body:", error);
        //               body = {
        //                 header: {
        //                   title: "",
        //                   resolutionDate: "",
        //                   entryDate: null,
        //                   resolution: "",
        //                   fojas: "",
        //                   folios: null,
        //                 },
        //                 sections: [],
        //                 notifications: [],
        //                 url: "",
        //               };
        //             }

        //             // Button styling with hover effect through inline CSS
        //             const buttonStyle = `
        //               display: inline-block;
        //               padding: 8px 15px;
        //               background-color: #225679;
        //               color: white;
        //               text-decoration: none;
        //               border-radius: 4px;
        //               font-size: 14px;
        //               font-weight: 500;
        //               margin-top: 10px;
        //               border: none;
        //               transition: background-color 0.3s ease;
        //             `;

        //             return `
        //               <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #225679;">
        //                 <p style="margin: 5px 0; font-size: 16px;"><span style="color: #555; font-weight: 600;">Asunto:</span> ${subject}</p>
        //                   ${
        //                     message.dataValues.keyMessage
        //                       ? `
        //                       <a href="http://localhost:3000${JSON.parse(body.url)[0] ?? ""}" 
        //                         style="${buttonStyle}"
        //                         onmouseover="this.style.backgroundColor='#004494'"
        //                         onmouseout="this.style.backgroundColor='#0056b3'">
        //                         <span style="vertical-align: middle;">Ver más detalles</span>
        //                         <span style="margin-left: 5px; vertical-align: middle;">➔</span>
        //                       </a>
        //                     `
        //                       : ""
        //                   }
        //                 </div>
        //               `;
        //           })
        //           .join("");

        //         return `
        //           <div style="border: 1px solid #e0e0e0; background-color: white; padding: 20px; margin-bottom: 25px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
        //             <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eaeaea; padding-bottom: 12px; margin-bottom: 15px;">
        //               <h3 style="margin: 0; color: #333; font-size: 18px;">Expediente #${caseFileNumber}</h3>
        //               <span style="background-color: #e6f3ff; color: #225679; padding: 4px 10px; border-radius: 20px; font-size: 14px; font-weight: 500;">Activo</span>
        //             </div>
        //             <p style="margin: 5px 0 15px 0; font-size: 15px;">
        //               <span style="color: #555; font-weight: 600;">Cliente:</span> 
        //               <span style="color: #333;">${clientName}</span>
        //             </p>
        //             <div style="margin-top: 15px;">
        //               ${messagesHtml}
        //             </div>
        //           </div>
        //         `;
        //       })
        //       .join("");

        //     // Email configuration (nodemailer setup remains the same)
        //     const transporter = nodemailer.createTransport({
        //       host: "smtp.ethereal.email",
        //       port: 587,
        //       secure: false,
        //       auth: {
        //         user: "ggccv23rti54ljrg@ethereal.email",
        //         pass: "Qw1CqwFHcPsJ9eDJ3G",
        //       },
        //     });

        //     // Current date formatting
        //     const today = new Date();
        //     const formattedDate = today.toLocaleDateString("es-ES", {
        //       day: "numeric",
        //       month: "long",
        //       year: "numeric",
        //     });

        //     const emailMessage = {
        //       from: "ggccv23rti54ljrg@ethereal.email",
        //       to: subscription.dataValues.customerUser.dataValues.email,
        //       subject: `Resumen de Actualizaciones Judiciales - ${formattedDate}`,
        //       html: `
        //         <!DOCTYPE html>
        //         <html lang="es">
        //         <head>
        //           <meta charset="UTF-8">
        //           <meta name="viewport" content="width=device-width, initial-scale=1.0">
        //           <title>Resumen Judicial</title>
        //         </head>
        //         <body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; color: #333;">
        //           <!-- Header -->
        //           <div style="background-color: #225679; padding: 25px; text-align: center;">
        //             <h1 style="color: white; margin: 0; font-size: 24px;">Resumen de Actualizaciones Judiciales</h1>
        //             <p style="color: #e0e0e0; margin: 10px 0 0 0; font-size: 16px;">${formattedDate}</p>
        //           </div>
                  
        //           <!-- Content -->
        //           <div style="max-width: 650px; margin: 0 auto; padding: 25px 15px;">
        //             <!-- Introduction -->
        //             <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
        //               <p style="margin-top: 0; font-size: 16px; line-height: 1.5;">
        //                 Estimado cliente,
        //               </p>
        //               <p style="font-size: 16px; line-height: 1.5;">
        //                 Le presentamos el resumen de las actualizaciones más recientes de sus expedientes. A continuación encontrará la información detallada de cada caso:
        //               </p>
        //             </div>
                    
        //             <!-- Cases List -->
        //             ${
        //               messagesList.length > 0
        //                 ? messagesList
        //                 : `
        //               <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center;">
        //                 <p style="font-size: 16px; color: #666;">No hay actualizaciones para mostrar en este momento.</p>
        //               </div>
        //             `
        //             }
                    
        //             <!-- Footer -->
        //             <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
        //               <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
        //               <p style="margin-bottom: 5px;">Si tiene preguntas, contáctenos a través de nuestros canales oficiales.</p>
        //               <div style="margin-top: 15px;">
        //                 <a href="#" style="color: #225679; margin: 0 10px; text-decoration: none;">Términos de Servicio</a>
        //                 <a href="#" style="color: #225679; margin: 0 10px; text-decoration: none;">Política de Privacidad</a>
        //               </div>
        //               <p style="margin-top: 15px; color: #999;">&copy; ${today.getFullYear()} Lolo Bank Sistema de Gestión Judicial</p> 
        //             </div>
        //           </div>
        //         </body>
        //         </html>
        //       `,
        //     };

        //     const info = await transporter.sendMail(emailMessage);
        //     const previewUrl = nodemailer.getTestMessageUrl(info);
        //     console.log("Preview URL:", previewUrl);
        //   }
        // }
      }

    } catch (error) {
      console.error('Error in sendMessagesToSubscribers:', error);
      throw boom.internal('Error sending messages to subscribers');
    }
  }
}

export default UserMessageSubscriptionsService;