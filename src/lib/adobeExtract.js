import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExtractPDFParams,
  ExtractElementType,
  ExtractRenditionsElementType,
  ExtractPDFJob,
  ExtractPDFResult
} from '@adobe/pdfservices-node-sdk';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

const DEFAULT_MAX_IMAGES = 32;
const MIN_IMAGE_BYTES = 20 * 1024;
const MIN_IMAGE_WIDTH = 280;
const MIN_IMAGE_HEIGHT = 180;
const MIN_IMAGE_PIXELS = 60_000;

const getEntryKey = (entryName) => path.basename(entryName).toLowerCase();

const getElementFilePaths = (element) => {
  const possiblePaths = [
    element?.filePaths,
    element?.FilePaths,
    element?.filePath,
    element?.FilePath
  ].filter(Boolean);

  return possiblePaths.flatMap((value) =>
    Array.isArray(value) ? value : [value]
  );
};

const getBoundsArea = (bounds) => {
  if (!Array.isArray(bounds) || bounds.length < 4) return 0;

  const [left, bottom, right, top] = bounds.map(Number);
  if ([left, bottom, right, top].some(Number.isNaN)) return 0;

  return Math.abs((right - left) * (top - bottom));
};

const getElementPage = (element) => {
  const page = Number.parseInt(element?.Page, 10);
  return Number.isInteger(page) ? page : null;
};

const getPngDimensions = (buffer) => {
  if (
    buffer.length < 24 ||
    buffer.toString('ascii', 1, 4) !== 'PNG' ||
    buffer.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

const getJpegDimensions = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;

    const marker = buffer[offset + 1];
    const blockLength = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isStartOfFrame) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5)
      };
    }

    offset += 2 + blockLength;
  }

  return null;
};

const getImageDimensions = (buffer, name) => {
  if (/\.png$/i.test(name)) return getPngDimensions(buffer);
  if (/\.jpe?g$/i.test(name)) return getJpegDimensions(buffer);
  return null;
};

const getImageMetadataByName = (structured) => {
  const metadataByName = new Map();

  structured?.elements?.forEach((element) => {
    const filePaths = getElementFilePaths(element);
    if (!filePaths.length) return;

    filePaths.forEach((filePath) => {
      const key = getEntryKey(filePath);
      metadataByName.set(key, {
        page: getElementPage(element),
        area: getBoundsArea(element.Bounds),
        path: element.Path || ''
      });
    });
  });

  return metadataByName;
};

const selectListingImages = (
  images,
  {
    maxImages = DEFAULT_MAX_IMAGES,
    minImageBytes = MIN_IMAGE_BYTES,
    minImageWidth = MIN_IMAGE_WIDTH,
    minImageHeight = MIN_IMAGE_HEIGHT,
    minImagePixels = MIN_IMAGE_PIXELS
  } = {}
) => {
  const seenHashes = new Set();
  const uniqueImages = [];

  images.forEach((image, index) => {
    if (image.buffer.length < minImageBytes) return;

    const hash = crypto.createHash('sha256').update(image.buffer).digest('hex');
    if (seenHashes.has(hash)) return;

    const dimensions = getImageDimensions(image.buffer, image.name);
    const width = dimensions?.width || 0;
    const height = dimensions?.height || 0;
    const pixels = width * height;
    const hasUsefulDimensions =
      width >= minImageWidth &&
      height >= minImageHeight &&
      pixels >= minImagePixels;
    const hasUsefulBounds = image.area >= minImagePixels;

    if (!hasUsefulDimensions && !hasUsefulBounds) return;

    seenHashes.add(hash);
    uniqueImages.push({
      ...image,
      hash,
      width,
      height,
      pixels,
      documentOrder: index,
      score: pixels + image.area + image.buffer.length
    });
  });

  const selected = uniqueImages
    .sort((a, b) => b.score - a.score)
    .slice(0, maxImages)
    .sort(
      (a, b) =>
        (a.page ?? Number.MAX_SAFE_INTEGER) -
          (b.page ?? Number.MAX_SAFE_INTEGER) ||
        a.documentOrder - b.documentOrder
    );

  return {
    images: selected,
    stats: {
      extractedImages: images.length,
      uniqueImages: uniqueImages.length,
      selectedImages: selected.length,
      maxImages,
      minImageBytes,
      minImageWidth,
      minImageHeight,
      minImagePixels
    }
  };
};

export const extractPdfData = async (pdfPath, options = {}) => {
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
      elementsToExtract: [ExtractElementType.TEXT, ExtractElementType.TABLES],
      elementsToExtractRenditions: [
        // This is the corrected property name
        ExtractRenditionsElementType.FIGURES
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
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // 5. Parse the ZIP for Text and Images
    const zip = new AdmZip(zipPath);
    const images = [];
    let cleanText = '';
    let structured = {};

    zip.getEntries().forEach((entry) => {
      const name = entry.entryName;

      // Extract Structured Text from JSON first so we can map image renditions to pages.
      if (name.endsWith('structuredData.json')) {
        structured = JSON.parse(entry.getData().toString('utf8'));
        cleanText = structured.elements
          .filter((el) => el.Text)
          .map((el) => el.Text.trim())
          .join('\n');
      }
    });

    const imageMetadataByName = getImageMetadataByName(structured);

    zip.getEntries().forEach((entry) => {
      const name = entry.entryName;

      // Extract Figure Renditions (The actual images)
      if (name.startsWith('figures/') && /\.(png|jpg|jpeg)$/i.test(name)) {
        const metadata = imageMetadataByName.get(getEntryKey(name)) || {};
        images.push({
          name: path.basename(name),
          buffer: entry.getData(),
          page: metadata.page,
          area: metadata.area || 0
        });
      }
    });

    const selected = selectListingImages(images, options);

    // 6. Cleanup the temp zip
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    return {
      extractedText: cleanText,
      images: selected.images,
      imageStats: selected.stats,
      structured: structured
    };
  } catch (err) {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    console.error('Adobe Extraction Error:', err);
    throw err;
  } finally {
    readStream?.destroy();
  }
};
