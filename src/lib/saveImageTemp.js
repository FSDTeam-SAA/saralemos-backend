import fs from "fs";
import path from "path";

export const saveImageBufferToDisk = (
  buffer,
  filename = 'image',
  uploadDir = 'uploads/images'
) => {
  const targetDir = path.resolve(uploadDir);
  fs.mkdirSync(targetDir, { recursive: true });

  const safeFilename = path.basename(String(filename));
  const imagePath = path.resolve(targetDir, `${Date.now()}-${safeFilename}`);

  fs.writeFileSync(imagePath, buffer);
  return imagePath;
};
