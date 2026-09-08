import { extractPdfData } from '../../lib/adobeExtract.js';
import { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';
import { matchListingFieldsWithGPT } from '../../lib/gptMathc.js';
import { createFilter, createPaginationInfo } from '../../lib/pagination.js';
import { saveImageBufferToDisk } from '../../lib/saveImageTemp.js';
import { YachtListing } from './listing.model.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const constructionDefaults = {
  GRP: false,
  Steel: false,
  Aluminum: false,
  Wood: false,
  Composite: false
};

const constructionAliases = {
  GRP: ['grp', 'fiberglass', 'fibreglass', 'glass reinforced plastic'],
  Steel: ['steel'],
  Aluminum: ['aluminum', 'aluminium'],
  Wood: ['wood'],
  Composite: ['composite', 'carbon fiber', 'carbon fibre']
};

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseBooleanLikeValue = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'available', 'present'].includes(normalized)) {
    return true;
  }
  if (
    ['false', 'no', 'n', '0', 'none', 'n/a', 'na', 'unknown', ''].includes(
      normalized
    )
  ) {
    return false;
  }

  return undefined;
};

const findConstructionField = (key) =>
  Object.keys(constructionDefaults).find(
    (field) => field.toLowerCase() === String(key).toLowerCase()
  );

const applyConstructionText = (result, text) => {
  const normalizedText = String(text || '').toLowerCase();

  Object.entries(constructionAliases).forEach(([field, aliases]) => {
    if (aliases.some((alias) => normalizedText.includes(alias))) {
      result[field] = true;
    }
  });
};

const normalizeConstructions = (value) => {
  const result = { ...constructionDefaults };
  const parsedValue = parseJsonField(value, {});

  if (Array.isArray(parsedValue)) {
    parsedValue.forEach((item) => applyConstructionText(result, item));
    return result;
  }

  if (typeof parsedValue === 'string') {
    applyConstructionText(result, parsedValue);
    return result;
  }

  if (!parsedValue || typeof parsedValue !== 'object') return result;

  Object.entries(parsedValue).forEach(([key, fieldValue]) => {
    const field = findConstructionField(key);
    const booleanValue = parseBooleanLikeValue(fieldValue);

    if (field && booleanValue !== undefined) {
      result[field] = booleanValue;
      return;
    }

    if (field && fieldValue !== undefined && fieldValue !== null) {
      result[field] = true;
    }

    applyConstructionText(result, key);
    applyConstructionText(result, fieldValue);
  });

  return result;
};

const normalizeAdditionalDetails = (value) => {
  const parsedValue = parseJsonField(value, []);
  if (!Array.isArray(parsedValue)) return [];

  const seen = new Set();
  return parsedValue
    .map((detail) => ({
      section: String(detail?.section || 'Additional details').trim(),
      label: String(detail?.label || '').trim(),
      value: String(detail?.value ?? '').trim()
    }))
    .filter((detail) => {
      if (!detail.label || !detail.value) return false;
      const key = `${detail.section}|${detail.label}|${detail.value}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 250);
};

const normalizeMatchedListingData = (matchedData) => {
  if (!matchedData || typeof matchedData !== 'object') return matchedData;

  return {
    ...matchedData,
    constructions: normalizeConstructions(matchedData.constructions),
    additionalDetails: normalizeAdditionalDetails(matchedData.additionalDetails)
  };
};

const hasTrueConstruction = (constructions) =>
  constructions &&
  Object.values(constructions).some((value) => value === true);

const getExtractedFieldNames = (data) => {
  if (!data || typeof data !== 'object') return [];

  return Object.entries(data)
    .filter(([key, value]) => {
      if (key === 'constructions') return hasTrueConstruction(value);
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      return true;
    })
    .map(([key]) => key);
};

const getFallbackYachtName = (preparedData, pdfFile, requestId) => {
  const modelAndBuilder = [preparedData.builder, preparedData.model]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (modelAndBuilder) return modelAndBuilder;

  const fileBaseName = path
    .basename(pdfFile?.originalname || '', path.extname(pdfFile?.originalname || ''))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return fileBaseName || `Untitled Yacht ${requestId.split('-')[0]}`;
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getLinesAfterLabel = (text, label, count) => {
  const match = new RegExp(`${label}\\s*:\\s*\\n([\\s\\S]{0,700})`, 'i').exec(text);
  if (!match) return [];

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, count);
};

const getInlineNumber = (text, labels) => {
  for (const label of labels) {
    const match = new RegExp(`${label}\\s*:\\s*([0-9]+)`, 'i').exec(text);
    if (match) return Number(match[1]);
  }
  return undefined;
};

const toDimension = (value) => {
  const match = String(value || '').match(/([0-9]+(?:\.[0-9]+)?)\s*(ft|feet|m|meter|metre)/i);
  if (!match) return undefined;
  return { value: Number(match[1]), unit: /^f/i.test(match[2]) ? 'ft' : 'm' };
};

// Some broker PDFs place table labels in one column and their values in the
// next. This fills the regular listing inputs even if the AI response is
// incomplete, while leaving unrecognised information in pdfExtractedText.
const getFallbackFieldsFromPdfText = (text) => {
  const result = {};
  const boatDetails = getLinesAfterLabel(text, 'Condition', 6);
  if (boatDetails.length === 6) {
    const [builder, model, yearBuilt, length, price] = boatDetails;
    if (builder) result.builder = builder;
    if (model) result.model = model;
    if (/^\d{4}$/.test(yearBuilt)) result.yearBuilt = Number(yearBuilt);
    if (length) result.lengthOverall = toDimension(length);
    if (price) result.Price = price;
    if (price?.includes('€')) result.priceCurrency = '€';
    else if (price?.includes('$')) result.priceCurrency = '$';
  }

  const classDetails = getLinesAfterLabel(text, 'Guest Heads', 6);
  if (classDetails.length === 6) {
    const [yachtType, hullMaterial, beam, location, cabins, bathRooms] = classDetails;
    if (yachtType) result.yachtType = yachtType;
    if (hullMaterial) result.constructions = normalizeConstructions(hullMaterial);
    if (beam) result.beam = toDimension(beam);
    if (location) result.location = location;
    if (/^\d+$/.test(cabins)) result.cabins = Number(cabins);
    if (/^\d+$/.test(bathRooms)) result.bathRooms = Number(bathRooms);
  }

  const fuelAndSpeed = getLinesAfterLabel(text, 'Max Draft', 3);
  if (fuelAndSpeed.length === 3) {
    const [fuelType, maxSpeed, draft] = fuelAndSpeed;
    if (fuelType) result.additionalDetails = [
      { section: 'Performance', label: 'Fuel Type', value: fuelType },
      { section: 'Performance', label: 'Max Speed', value: maxSpeed }
    ];
    if (draft) result.draft = toDimension(draft);
  }

  const guestCapacity = getInlineNumber(text, ['Seating Capacity', 'Max Passengers']);
  if (guestCapacity !== undefined) result.guestCapacity = guestCapacity;

  const engineMatch = /(?:^|\n)(?:\d{4}\s+)?([^\n]+?)\s*\(Engine\s*1\)/i.exec(text);
  if (engineMatch) {
    const engine = engineMatch[1].trim().replace(/^\d{4}\s+/, '');
    const [engineMake, ...engineModel] = engine.split(/\s+/);
    if (engineMake) result.engineMake = engineMake;
    if (engineModel.length) result.engineModel = engineModel.join(' ');
  }

  const descriptionMatch = /(?:^|\n)Description\s*\n([\s\S]*?)(?:\n\s*Information\s*&\s*Features|\n\s*Dimensions\s*\n)/i.exec(text);
  if (descriptionMatch) result.description = descriptionMatch[1].trim();

  return prepareYachtListingData(result);
};

const mergeSourceFields = (target, source) => {
  Object.entries(source).forEach(([key, value]) => {
    if (key === 'additionalDetails') {
      const existing = Array.isArray(target[key]) ? target[key] : [];
      target[key] = normalizeAdditionalDetails([...existing, ...value]);
      return;
    }
    // These values came from an explicit PDF label/table, so they are more
    // reliable than an AI inference from a narrative paragraph.
    target[key] = value;
  });
  return target;
};

const mapWithConcurrency = async (items, concurrency, mapper) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }
  );

  await Promise.all(workers);
  return results;
};
// Helper function to prepare and validate yacht listing data
function prepareYachtListingData(data) {
  const prepared = { ...data };

  if (prepared.Price === undefined && prepared.price !== undefined) {
    prepared.Price = prepared.price;
  }
  delete prepared.price;

  if (
    prepared.Price !== undefined &&
    prepared.Price !== null &&
    prepared.Price !== ''
  ) {
    const numericPrice =
      typeof prepared.Price === 'number'
        ? prepared.Price
        : Number(String(prepared.Price).replace(/[^0-9.-]/g, ''));

    if (Number.isFinite(numericPrice)) {
      prepared.Price = numericPrice;
    } else {
      delete prepared.Price;
    }
  }

  // Ensure dimensions have proper structure if extracted
  const ensureDimension = (dim) => {
    if (!dim) return null;
    if (
      typeof dim === 'object' &&
      dim.value !== null &&
      dim.value !== undefined
    ) {
      const value = Number(dim.value);
      if (!Number.isFinite(value)) return null;

      return {
        value,
        unit: dim.unit || 'm'
      };
    }
    return null;
  };

  if (prepared.lengthOverall)
    prepared.lengthOverall = ensureDimension(prepared.lengthOverall);
  if (prepared.beam) prepared.beam = ensureDimension(prepared.beam);
  if (prepared.draft) prepared.draft = ensureDimension(prepared.draft);

  // Remove null dimensions
  if (!prepared.lengthOverall) delete prepared.lengthOverall;
  if (!prepared.beam) delete prepared.beam;
  if (!prepared.draft) delete prepared.draft;

  // Clean up constructions object
  if (
    prepared.constructions &&
    Object.keys(prepared.constructions).length === 0
  ) {
    delete prepared.constructions;
  }

  return prepared;
}

// Helper to validate and score yacht name confidence
function validateYachtNameConfidence(yachtName, otherFields) {
  if (!yachtName)
    return { confidence: 0, yachtName: null, message: 'No yacht name found' };

  const genericTerms = [
    'model',
    'yacht',
    'boat',
    'vessel',
    'ship',
    'type',
    'series',
    'class',
    'specification'
  ];
  const isGeneric = genericTerms.some((term) =>
    yachtName.toLowerCase().includes(term)
  );

  // Common builder names to exclude
  const commonBuilders = [
    'sunseeker',
    'azimut',
    'beneteau',
    'ferretti',
    'pershing',
    'ritz-carlton',
    'maserati',
    'benetti',
    'trinity'
  ];
  const isBuilder = commonBuilders.some((builder) =>
    yachtName.toLowerCase().includes(builder)
  );

  // Common location names to exclude
  const commonLocations = [
    'miami',
    'monaco',
    'dubai',
    'caribbean',
    'mediterranean',
    'florida',
    'california'
  ];
  const isLocation = commonLocations.some((loc) =>
    yachtName.toLowerCase().includes(loc)
  );

  let confidence = 85; // Start with good confidence for contextually-detected names
  let message = 'Yacht name extracted from context clues';

  if (isGeneric) {
    confidence = 25;
    message = 'Detected term is too generic - likely not the actual yacht name';
  }
  if (isBuilder) {
    confidence = 15;
    message = 'Detected term appears to be builder name, not yacht name';
  }
  if (isLocation) {
    confidence = 20;
    message = 'Detected term appears to be location, not yacht name';
  }
  if (yachtName.length < 2) {
    confidence = 10;
    message = 'Name too short to be valid yacht name';
  }
  if (yachtName.length > 100) {
    confidence = 40;
    message = 'Name seems unusually long - may be partial description';
  }

  // Positive indicators for yacht name legitimacy
  if (yachtName.length >= 3 && yachtName.length <= 40) {
    confidence = Math.min(100, confidence + 10); // Reasonable length
  }
  if (/^[A-Z][a-zA-Z\s-]*$/.test(yachtName)) {
    confidence = Math.min(100, confidence + 5); // Proper capitalization
  }
  if (!isGeneric && !isBuilder && !isLocation) {
    confidence = Math.min(100, confidence + 10); // Passes exclusion checks
  }

  return {
    confidence,
    yachtName,
    message,
    detectedMethod: 'contextual',
    suggestion: otherFields?.model || otherFields?.builder
  };
}

export const extractListingFromPdf = async (req, res) => {
  let pdfPath;
  let requestTempDir;

  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const requestId = `${Date.now()}-${crypto.randomUUID()}`;
    requestTempDir = path.resolve(
      'uploads/temp/listing-extract',
      String(userId),
      requestId
    );

    // 1. Set headers for Streaming (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Check for uploaded PDF
    if (!req.files?.pdf?.[0]) {
      sendEvent('error', { message: 'PDF file required' });
      return res.end();
    }

    const pdfFile = req.files.pdf[0];
    pdfPath = pdfFile.path;
    const maxImages = parsePositiveInteger(
      req.body.maxImages || req.query.maxImages,
      32
    );

    sendEvent('status', { message: 'Extracting PDF text and images...' });

    // 1️⃣ Adobe Extract
    const { extractedText, images, imageStats } = await extractPdfData(
      pdfPath,
      {
        maxImages
      }
    );

    sendEvent('status', { message: 'Matching fields with AI...' });

    const extractionWarnings = [];

    // 2️⃣ GPT Field Matching (with streaming callback)
    let matchedData = normalizeMatchedListingData({ constructions: {} });
    try {
      matchedData = normalizeMatchedListingData(
        await matchListingFieldsWithGPT(extractedText, (partialData) => {
          sendEvent('chunk', {
            partialData: normalizeMatchedListingData(partialData)
          });
        })
      );
    } catch (aiError) {
      const warning = {
        message:
          'AI field matching failed. Continuing with uploaded images and fallback data.',
        reason: aiError.message,
        confidence: 0,
        extractedTextPreview: extractedText.slice(0, 1200)
      };

      extractionWarnings.push(warning.message);
      sendEvent('warning', warning);
    }

    // 3️⃣ Validate and prepare data before uploading images or saving
    const sourceFields = getFallbackFieldsFromPdfText(extractedText);
    const preparedData = mergeSourceFields(
      prepareYachtListingData(matchedData),
      sourceFields
    );
    let fallbackNameUsed = false;
    let extractedFieldNames = getExtractedFieldNames(preparedData);

    if (extractedFieldNames.length === 0) {
      const warning = {
        message:
          'AI could not identify listing fields from the extracted PDF text. Continuing with uploaded images and fallback data.',
        confidence: 0,
        partialData: preparedData,
        extractionQuality: {
          fieldsExtracted: 0,
          extractedTextLength: extractedText.length,
          imageCandidatesFound: imageStats?.extractedImages || images.length,
          imageCandidatesAfterDedupe:
            imageStats?.uniqueImages || images.length,
          imageSelectionLimit: imageStats?.maxImages || maxImages
        },
        extractedTextPreview: extractedText.slice(0, 1200)
      };

      extractionWarnings.push(warning.message);
      sendEvent('warning', warning);
    }

    if (!preparedData.yachtName) {
      preparedData.yachtName = getFallbackYachtName(
        preparedData,
        pdfFile,
        requestId
      );
      fallbackNameUsed = true;
      extractedFieldNames = getExtractedFieldNames(preparedData);

      const warning = {
        message:
          'Yacht name could not be extracted. A fallback name was used so the listing can still be saved.',
        confidence: 0,
        fallbackYachtName: preparedData.yachtName,
        suggestion: preparedData.model || preparedData.builder || null,
        partialData: preparedData,
        extractionQuality: {
          fieldsExtracted: extractedFieldNames.length,
          extractedFields: extractedFieldNames,
          extractedTextLength: extractedText.length,
          imageCandidatesFound: imageStats?.extractedImages || images.length,
          imageCandidatesAfterDedupe:
            imageStats?.uniqueImages || images.length,
          imageSelectionLimit: imageStats?.maxImages || maxImages
        },
        extractedTextPreview: extractedText.slice(0, 1200)
      };

      extractionWarnings.push(warning.message);
      sendEvent('warning', warning);
    }

    // Validate yacht name with confidence scoring
    const nameValidation = validateYachtNameConfidence(
      preparedData.yachtName,
      preparedData
    );

    console.log(
      `Yacht name confidence: ${nameValidation.confidence}%`,
      nameValidation
    );

    // If confidence is low, warn the user but still save
    if (nameValidation.confidence < 60) {
      extractionWarnings.push(nameValidation.message);
      sendEvent('warning', {
        message: nameValidation.message,
        confidence: nameValidation.confidence,
        detectedName: preparedData.yachtName,
        suggestion: nameValidation.suggestion
      });
    }

    sendEvent('status', { message: 'Uploading images...' });

    // 4️⃣ Upload selected images to Cloudinary with bounded concurrency
    const uploadedImages = await mapWithConcurrency(images, 4, async (img) => {
      try {
        const tempPath = saveImageBufferToDisk(
          img.buffer,
          img.name,
          requestTempDir
        );
        const uploaded = await cloudinaryUpload(
          tempPath,
          undefined,
          `yacht-listings/${userId}/${requestId}`
        );
        return uploaded?.secure_url || null;
      } catch (err) {
        console.error('Image upload error:', err);
        return null;
      }
    });

    const imageUrls = uploadedImages.filter(Boolean);

    sendEvent('status', { message: 'Preparing extracted listing for review...' });

    // Do not save to MongoDB here. The client creates the listing only after
    // the user has reviewed the values and pressed Save.
    const listing = {
      ...preparedData,
      images: imageUrls,
      pdfExtractedText: extractedText,
      isActive: true
    };

    // 5️⃣ Final Response
    sendEvent('final', {
      message: 'Success',
      listing,
      extractionQuality: {
        yachtNameConfidence: nameValidation.confidence,
        yachtName: preparedData.yachtName,
        fieldsExtracted: extractedFieldNames.length,
        extractedFields: extractedFieldNames,
        imagesExtracted: imageUrls.length,
        imageCandidatesFound: imageStats?.extractedImages || images.length,
        imageCandidatesAfterDedupe: imageStats?.uniqueImages || images.length,
        imageSelectionLimit: imageStats?.maxImages || maxImages,
        fallbackNameUsed,
        warnings: extractionWarnings,
        warning: extractionWarnings[0] || null
      },
      extractedText
    });

    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message });
      return;
    }

    res.write(
      `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
    );
    res.end();
  } finally {
    try {
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (unlinkError) {
      console.warn(
        `Could not delete uploaded PDF ${pdfPath}:`,
        unlinkError.message
      );
    }

    try {
      if (requestTempDir && fs.existsSync(requestTempDir)) {
        fs.rmSync(requestTempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.warn(
        `Could not delete listing extract temp folder ${requestTempDir}:`,
        cleanupError.message
      );
    }
  }
};

// Middleware to extract user from token (example placeholder)
const getUserFromToken = (req) => req.user?._id; // assume auth middleware sets req.user

// 1️⃣ Create Listing
export const createYachtListing = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // 2️⃣ Parse nested JSON fields
    const constructions = normalizeConstructions(req.body.constructions);
    const additionalDetails = normalizeAdditionalDetails(req.body.additionalDetails);
    const lengthOverall = parseJsonField(req.body.lengthOverall, undefined);
    const beam = parseJsonField(req.body.beam, undefined);
    const draft = parseJsonField(req.body.draft, undefined);

    let imageUrls = [];

    // 1️⃣ Check for uploaded files first
    if (req.files?.images?.length) {
      for (const file of req.files.images) {
        let tempPath;
        if (file.buffer) {
          tempPath = saveImageBufferToDisk(file.buffer, file.originalname);
        } else if (file.path) {
          tempPath = file.path;
        }
        const uploaded = await cloudinaryUpload(
          tempPath,
          undefined,
          'yacht-listings'
        );
        if (uploaded?.secure_url) imageUrls.push(uploaded.secure_url);

        if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
    // 2️⃣ If no files, parse images from body
    else if (req.body.images) {
      if (typeof req.body.images === 'string') {
        try {
          // Remove extra whitespace
          const str = req.body.images.trim();

          // Parse only valid JSON arrays
          if (str.startsWith('[') && str.endsWith(']')) {
            imageUrls = JSON.parse(str);
          } else {
            // Single URL sent as string
            imageUrls = [str];
          }
        } catch (err) {
          console.warn('Failed to parse images array:', err.message);
          imageUrls = [];
        }
      } else if (Array.isArray(req.body.images)) {
        imageUrls = req.body.images;
      }
    }

    // 3️⃣ Create the listing
    const listing = await YachtListing.create({
      ...req.body,
      constructions,
      additionalDetails,
      lengthOverall,
      beam,
      draft,

      images: imageUrls,
      createdBy: userId
    });

    res.status(201).json({ success: true, listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// 2️⃣ Get All Listings (optionally filter by user)
// Get All Listings with Filter & Pagination
export const getAllYachtListings = async (req, res) => {
  try {
    const userId = req.user._id; // assume auth middleware sets req.user
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = 1, limit = 10, search, date } = req.query;

    // 1️⃣ Build filter
    const filter = createFilter(search, date);

    // Include only this user's active listings
    filter.createdBy = userId;
    filter.isActive = true;

    // 2️⃣ Count total documents
    const totalData = await YachtListing.countDocuments(filter);

    // 3️⃣ Fetch paginated data
    const listings = await YachtListing.find(filter)
      .sort({ createdAt: -1 }) // latest first
      .skip((page - 1) * Number.parseInt(limit))
      .limit(Number.parseInt(limit));

    // 4️⃣ Pagination info
    const pagination = createPaginationInfo(
      Number.parseInt(page),
      Number.parseInt(limit),
      totalData
    );

    res.json({ success: true, listings, pagination });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3️⃣ Get Listing by ID
export const getYachtListingById = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await YachtListing.findById(id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json({ success: true, listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4️⃣ Update Listing by ID
export const updateYachtListingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserFromToken(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // 1️⃣ Parse nested JSON fields if they exist
    const constructions =
      req.body.constructions !== undefined
        ? normalizeConstructions(req.body.constructions)
        : undefined;
    const lengthOverall = parseJsonField(req.body.lengthOverall, undefined);
    const beam = parseJsonField(req.body.beam, undefined);
    const draft = parseJsonField(req.body.draft, undefined);
    const additionalDetails =
      req.body.additionalDetails !== undefined
        ? normalizeAdditionalDetails(req.body.additionalDetails)
        : undefined;

    // 2️⃣ Handle images
    let imageUrls = [];

    // 2a. If files uploaded
    if (req.files?.images?.length) {
      for (const file of req.files.images) {
        let tempPath;
        if (file.buffer)
          tempPath = saveImageBufferToDisk(file.buffer, file.originalname);
        else if (file.path) tempPath = file.path;

        const uploaded = await cloudinaryUpload(
          tempPath,
          undefined,
          'yacht-listings'
        );
        if (uploaded?.secure_url) imageUrls.push(uploaded.secure_url);

        if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
    // 2b. If images sent in body (string or array)
    else if (req.body.images) {
      try {
        if (typeof req.body.images === 'string') {
          imageUrls = JSON.parse(req.body.images);
        } else if (Array.isArray(req.body.images)) {
          imageUrls = req.body.images;
        }
      } catch (err) {
        console.warn('Failed to parse images array:', err.message);
        imageUrls = [];
      }
    }
    if (imageUrls.length > 0) {
      const existingListing = await YachtListing.findById(id);
      imageUrls = [...(existingListing.images || []), ...imageUrls];
    }

    // 3️⃣ Build update object
    const updateData = {
      ...req.body,
      constructions,
      lengthOverall,
      beam,
      draft,
      additionalDetails,
      images: imageUrls.length ? imageUrls : undefined // only update if we have images
    };

    // Remove undefined fields to avoid overwriting
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // 4️⃣ Update the listing
    const listing = await YachtListing.findOneAndUpdate(
      { _id: id, createdBy: userId },
      { $set: updateData },
      { new: true }
    );

    if (!listing)
      return res
        .status(404)
        .json({ message: 'Listing not found or unauthorized' });

    res.json({ success: true, listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5️⃣ Delete Listing by ID (soft delete)
export const deleteYachtListingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserFromToken(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const listing = await YachtListing.findOneAndDelete(
      { _id: id, createdBy: userId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!listing)
      return res
        .status(404)
        .json({ message: 'Listing not found or unauthorized' });
    res.json({ success: true, message: 'Listing deleted', listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
