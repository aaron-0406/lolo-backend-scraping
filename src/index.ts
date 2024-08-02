import express from 'express';
import dotenv from 'dotenv';
import { JudicialBinacleService } from './app/judicial/judicial-binacle/modules/services/judicial-binacle.service';

const service = new JudicialBinacleService();

dotenv.config();

const app = express();

app.use(express.json());

app.get("/ping", (_req, res) => {
  res.send("Hello World! 2");
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT || 3000}`);
  //Jobs
  // import("./jobs/cron-jobs").then((cronJobs) => cronJobs.inizializeCronJobs());
  service.main();

});



