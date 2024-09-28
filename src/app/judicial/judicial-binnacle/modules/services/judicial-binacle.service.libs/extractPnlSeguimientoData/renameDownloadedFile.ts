import path from "path";
import fs from "fs";

export async function  renameDownloadedFile(oldPath: string, newName: string): Promise<void> {
  const newPath = path.join(path.dirname(oldPath), newName);
  fs.renameSync(oldPath, newPath);
}