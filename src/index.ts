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

const service = new JudicialBinacleService();
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

  // (async() => await service.main())();

  cron.schedule('0 6 * * *', async () => {
    await service.resetAllCaseFiles();
    console.log('Cron job iniciado: 10 AM');
    await processCaseFiles();

    async function processCaseFiles() {
      const { notScanedCaseFiles, errorsCounter } = await service.main();

      if (notScanedCaseFiles  || errorsCounter > 4) {
        console.log("Case files with no scan, retrying in 30 minutes.");

        setTimeout(async () => {
          await processCaseFiles();
        }, 30 * 60 * 1000);
      } else {
        console.log("All case files scanned.");
      }
    }
  });

  console.log("server is running on port", process.env.PORT || 3000);
});



