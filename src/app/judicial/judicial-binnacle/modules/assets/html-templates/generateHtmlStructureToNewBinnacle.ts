import { PnlSeguimientoData } from "../../types/external-types";

export const  generateHtmlStructureToNewBinnacle = (data:PnlSeguimientoData, titleDescription:string) => {
  let html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            background: white;
            font-family: system-ui;
            margin: 0;
          }

          .page-header {
            display: flex;
            align-items: center;
            padding: 20px;
            background-color: #f1f1f1;
          }

          .page-header__logo {
            width: 70px;
            height: auto;
            margin-right: 20px;
          }

          .page-header__title {
            font-size: 24px;
            color: #333;
          }

          .binnacle {
            width: 80%;
            margin: 40px auto;
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }

          .binnacle__header {
            background-color: #333;
            color: #fff;
            padding: 15px;
            text-align: center;
          }

          .binnacle__header-title {
            font-size: 24px;
            margin: 0;
          }

          .binnacle__header-rs {
            font-size: 18px;
            margin-top: 5px;
            margin-bottom: 5px;
          }
          .binnacle__header-ff {
            font-size: 18px;
            margin-top: 5px;
            margin-bottom: 20px;
          }

          .binnacle__section {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
          }

          .binnacle__section-title {
            font-size: 18px;
            margin-bottom: 10px;
            color: #333;
          }

          .binnacle__section-content {
            font-size: 16px;
            margin-bottom: 10px;
            color: #555;
          }

          .binnacle__section-content--highlight {
            font-weight: bold;
            color: #000;
          }

          .binnacle__section-meta {
            color: #666;
          }
        </style>
      </head>
      <body>
        <header class="page-header">
          <img
            class="page-header__logo"
            src="https://lolobank.com/static/media/logo.9e20fd599f165b852995.png"
            alt="Logo Lolo Bank"
          />
          <h1 class="page-header__title">Lolo Bank [${titleDescription}]</h1>
        </header>
        <main>
          <div class="binnacle">
            <div class="binnacle__header">
              <h1 class="binnacle__header-title">${
                data.resolutionDate
                  ? `Fecha de Resolución: ${data.resolutionDate}`
                  : `Fecha de Ingreso: ${data.entryDate}`
              }</h1>
              <p class="binnacle__header-rs">Resolución: ${
                data.resolution
              }</p>
              <p class="binnacle__header-ff">${
                data.resolutionDate
                  ? `Fojas: ${data.fojas}`
                  : `Folios: ${data.folios}`
              }</p>
            </div>

            <div class="binnacle__section">
              <h2 class="binnacle__section-title">Tipo de Notificación:</h2>
              <p class="binnacle__section-content">${data.notificationType}</p>
            </div>

            <div class="binnacle__section">
              <h2 class="binnacle__section-title">Sumilla:</h2>
              <p class="binnacle__section-content">${data.sumilla}</p>
            </div>

            <div class="binnacle__section">
              <h2 class="binnacle__section-title">Descripción de Usuario:</h2>
              <p class="binnacle__section-content">${data.userDescription}</p>
            </div>
  `;

  data.notifications.forEach((notification:any) => {
    html += `
            <div class="binnacle__section">
              <h2 class="binnacle__section-title">NOTIFICACIÓN ${notification.notificationCode}</h2>
              <p class="binnacle__section-content binnacle__section-content--highlight">
                Destinatario: ${notification.addressee}
              </p>
              <p class="binnacle__section-meta">Fecha de envío: ${notification.shipDate}</p>
              <p class="binnacle__section-meta">Forma de entrega: ${notification.deliveryMethod}</p>
            </div>
    `;
  });

  html += `
          </div>
        </main>
      </body>
    </html>
  `;

  return html;
}

