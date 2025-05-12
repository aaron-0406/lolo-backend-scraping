import express from 'express';
import dotenv from 'dotenv';
import { JudicialBinacleService } from './app/judicial/judicial-binnacle/modules/services/judicial-binacle.service';
import path from 'path';
import cors, { CorsOptions } from "cors";
import morgan from "morgan";
import ipHandler from "./middlewares/ip.handler";
import errorHandlerr from "./middlewares/error.handler";


import cron from 'node-cron';
import * as nodemailer from 'nodemailer';
import routerApi from './routes';
import { judicialCaseFileService } from './app/judicial/judicial-case-file/modules/services/judicial-case-files.service';
import customeUserService from './app/dash/services/customer-user.service';
import UserMessageSubscriptionsService from './app/settings/services/user-message-subscriptions.service';
const service = new JudicialBinacleService();
const serviceCustomer = new customeUserService()
const userMessageSubscriptionsService = new UserMessageSubscriptionsService()
const { boomErrorHandler, logErrors, ormErrorHandler, errorHandler } = errorHandlerr;
dotenv.config();
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      id?: number;
      name?: string;
      lastName?: string;
      phone?: string;
      dni?: string;
      email?: string;
      privilege?: string;
      state?: boolean;
      createdAt?: Date;
      customerId?: number;
      roleId?: number;
      permissions?: Array<String>;
      qr?: string;
    }

    interface Request {
      clientIp?: string;
    }
  }
}

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));

//CORS
const whitelist = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://192.168.1.24:3000",
  "http://192.168.0.10:3000",
  "https://lolobank.com",
  "http://lolobank.com",
];


// nodemailer.createTestAccount().then((account) => {
//   console.log("Test account created:", account);
// });

app.use(express.static(path.join(__dirname, "/public")));
app.use(express.static(path.join(__dirname, "/public/build")));
app.use(ipHandler);
// app.use((req: Request, res: Response, next: NextFunction) => {
//   res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
//   res.setHeader("Pragma", "no-cache");
//   res.setHeader("Expires", "0");
//   next();
// });

app.use(logErrors);
app.use(boomErrorHandler);
app.use(ormErrorHandler);
app.use(errorHandler);


app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT || 3000}`);

const options: CorsOptions = {
  origin: (origin,   callback) => {
    if (whitelist.includes(origin ?? "") || !origin) {
      callback(null, true);
    } else {
      callback(new Error("no permitido"));
    }
  },
};

app.use(cors(options));

routerApi(app);

app.get("/ping", (_req, res) => {
  res.send("Hello World! 2");
});



  // (async () => {
  //   console.log("Using manual boot scan 🚀")
  //   await service.resetAllCaseFiles()
  //   await service.main()
  //   // await service.resetCaseFilesByCustomerHasBankId();

  // }
  // )();

  // (async() => await caseFilesService.currencyExchange())();


  // Crear una cuenta de prueba

  cron.schedule('* * * * *', async () => { // ejecutar cada minuto
    await runSendeding();
    console.log('cron job iniciado: 11:30 am');
    // await runCompleteProcess();
    console.log('✅ todos los case files procesados y cron finalizado.');
  }, {
    timezone: 'america/lima'
  });


  const runSendeding = async () => {
    console.log("Sending messages to subscribers");
    await userMessageSubscriptionsService.sendMessagesToSubscribers();
  }


  // cron.schedule('* * * * *', async () => { // ejecutar cada minuto
  //     await service.resetAllCaseFiles();
  //     console.log('cron job iniciado: 11:30 am');

  //     await runCompleteProcess();

  //     console.log('✅ todos los case files procesados y cron finalizado.');

  //   }, {
  //     timezone: 'america/lima'
  //   });

  async function runCompleteProcess() {
    async function processCaseFiles(): Promise<void> {
      const { notScanedCaseFiles, errorsCounter } = await service.main();

      if (notScanedCaseFiles > 0 && errorsCounter > 4) {
        console.log("Case files with no scan, retrying in 30 minutes...");

        // Espera 30 minutos y vuelve a intentar
        await new Promise(resolve =>
          setTimeout(resolve, 30 * 60 * 1000)
        );

        return processCaseFiles();
      } else {
        console.log("All case files scanned.");
      }
    }

    return processCaseFiles();
  }

  console.log("server is running on port", process.env.PORT || 3000);
});



