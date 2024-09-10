import express from 'express';
import dotenv from 'dotenv';
import { JudicialBinacleService } from './app/judicial/judicial-binnacle/modules/services/judicial-binacle.service';
import path from 'path';
import cron from 'node-cron';


const service = new JudicialBinacleService();

dotenv.config();

const app = express();

app.use(express.json());

app.get("/ping", (_req, res) => {
  res.send("Hello World! 2");
});

app.use(express.static(path.join(__dirname, "/public")));
app.use(express.static(path.join(__dirname, "/public/build")));

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT || 3000}`);

  let thereAreCaseFilesWithNoScan = true;

  (async() => await service.main())();

  cron.schedule('0 6 * * *', async () => {
    console.log('Cron job iniciado: 6 AM');
    await processCaseFiles();

    async function processCaseFiles() {
      const notScanedCaseFiles = await service.main();

      if (notScanedCaseFiles) {
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



