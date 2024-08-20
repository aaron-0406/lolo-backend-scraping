import cron from "node-cron"
import { JudicialBinacleService } from "../modules/services/judicial-binacle.service";

const service = new JudicialBinacleService();

export const JudicialBinacleJob = () => {
  cron.schedule('* * * * *', () => {
    service.main();
  })

}