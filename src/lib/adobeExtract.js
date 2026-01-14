import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExtractPDFParams,
  ExtractElementType,
  ExtractRenditionsElementType,
  ExtractPDFJob,
  ExtractPDFResult
} from "@adobe/pdfservices-node-sdk";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export const extractPdfData = async (pdfPath) => {
  let readStream;
  const zipPath = `${pdfPath}-${Date.now()}.zip`;

  try {
    const credentials = new ServicePrincipalCredentials({
      clientId: process.env.PDF_SERVICES_CLIENT_ID,
      clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET
    });

    const pdfServices = new PDFServices({ credentials });

    // 1. Upload the PDF
    readStream = fs.createReadStream(pdfPath);
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.PDF
    });

    // 2. Setup Params - Using the EXACT property from the SDK sample
    const params = new ExtractPDFParams({
      elementsToExtract: [
        ExtractElementType.TEXT, 
        ExtractElementType.TABLES
      ],
      elementsToExtractRenditions: [ // This is the corrected property name
        ExtractRenditionsElementType.FIGURES, 
        ExtractRenditionsElementType.TABLES
      ]
    });

    // 3. Execute the Job
    const job = new ExtractPDFJob({ inputAsset, params });
    const pollingURL = await pdfServices.submit({ job });
    const result = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExtractPDFResult
    });

    // 4. Download the ZIP content
    const resultAsset = result.result.resource;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });

    // Ensure the zip is fully written before reading it
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(zipPath);
      streamAsset.readStream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // 5. Parse the ZIP for Text and Images
    const zip = new AdmZip(zipPath);
    const images = [];
    let cleanText = "";
    let structured = {};

    zip.getEntries().forEach((entry) => {
      const name = entry.entryName;

      // Extract Figure Renditions (The actual images)
      if (name.startsWith("figures/") && /\.(png|jpg|jpeg)$/i.test(name)) {
        images.push({
          name: path.basename(name),
          buffer: entry.getData()
        });
      }

      // Extract Structured Text from JSON
      if (name.endsWith("structuredData.json")) {
        structured = JSON.parse(entry.getData().toString("utf8"));
        cleanText = structured.elements
          .filter(el => el.Text)
          .map(el => el.Text.trim())
          .join("\n");
      }
    });

    // 6. Cleanup the temp zip
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    return {
      extractedText: cleanText,
      images: images,
      structured: structured
    };

  } catch (err) {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    console.error("Adobe Extraction Error:", err);
    throw err;
  } finally {
    readStream?.destroy();
  }
};