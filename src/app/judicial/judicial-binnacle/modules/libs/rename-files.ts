import fs from "fs"

export const renameFile = async(oldPath: string, newPath: string): Promise<void> => {
  fs.renameSync(oldPath, newPath);
}

