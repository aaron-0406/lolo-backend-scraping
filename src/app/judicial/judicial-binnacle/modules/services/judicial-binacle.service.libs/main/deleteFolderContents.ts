import fs from "fs";

export const deleteFolderContents = async (folderPath: string) => {
  if (fs.existsSync(folderPath)) {
    console.log("Eliminando todo el contenido de la carpeta:", folderPath);

    await fs.promises.rm(folderPath, { recursive: true, force: true });

    console.log("Carpeta eliminada con éxito");
  } else {
    console.log("La carpeta no existe:", folderPath);
  }
};
