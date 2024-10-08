import express from 'express';
import dotenv from 'dotenv';
import { JudicialBinacleService } from './app/judicial/judicial-binnacle/modules/services/judicial-binacle.service';
import path from 'path';
import cron from 'node-cron';
import * as nodemailer from 'nodemailer';

const service = new JudicialBinacleService();

dotenv.config();

const app = express();

app.use(express.json());

app.get("/ping", (_req, res) => {
  res.send("Hello World! 2");
});

// nodemailer.createTestAccount().then((account) => {
//   console.log("Test account created:", account);
// });

app.use(express.static(path.join(__dirname, "/public")));
app.use(express.static(path.join(__dirname, "/public/build")));

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT || 3000}`);

  (async() => await service.main())();

  // cron.schedule('0 6 * * *', async () => {
  //   await service.resetAllCaseFiles();
  //   console.log('Cron job iniciado: 6 AM');
  //   await processCaseFiles();

  //   async function processCaseFiles() {
  //     const { notScanedCaseFiles, errorsCounter } = await service.main();

  //     if (notScanedCaseFiles  || errorsCounter > 4) {
  //       console.log("Case files with no scan, retrying in 30 minutes.");

  //       setTimeout(async () => {
  //         await processCaseFiles();
  //       }, 30 * 60 * 1000);
  //     } else {
  //       console.log("All case files scanned.");
  //     }
  //   }
  // });

  console.log("server is running on port", process.env.PORT || 3000);
});



