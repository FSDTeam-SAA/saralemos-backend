import fs from "fs";
import path from "path";

export const saveImageBufferToDisk = (buffer, filename) => {
  const imagePath = path.resolve(
    "uploads/images",
    `${Date.now()}-${filename}`
  );

  fs.writeFileSync(imagePath, buffer);
  return imagePath;
};
