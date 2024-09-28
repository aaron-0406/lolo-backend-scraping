import fs from "fs";
import path from "path";

export async function waitForDownload(downloadPath: string, startTime: number, timeout: number = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const files = fs.readdirSync(downloadPath);
      const newFiles = files.filter((file) => {
        const filePath = path.join(downloadPath, file);
        const stats = fs.statSync(filePath);
        return stats.mtimeMs > startTime && (file.endsWith(".pdf") || file.endsWith(".doc")) && !file.endsWith(".crdownload");
      });

      if (newFiles.length > 0) {
        clearInterval(interval);
        resolve(path.join(downloadPath, newFiles[0]));
      }
    }, 1000);

    const timeoutId = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("La descarga ha excedido el tiempo límite."));
    }, timeout);
  });
}
