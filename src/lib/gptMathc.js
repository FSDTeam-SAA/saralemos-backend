import fetch from "node-fetch";

function cleanJsonString(str) {
  // Remove ```json and ``` fences, trim extra whitespace
  return str.replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
}

function chunkText(text, size = 12000, overlap = 1000) {
  if (text.length <= size) return [text];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
    if (i >= text.length) break;
  }
  return chunks;
}

function mergeExtraction(existing, newData) {
  const merged = { ...existing };
  for (const key in newData) {
    if (newData[key] !== null && newData[key] !== undefined && newData[key] !== "") {
      if (typeof newData[key] === 'object' && !Array.isArray(newData[key]) && merged[key] && typeof merged[key] === 'object') {
        merged[key] = mergeExtraction(merged[key], newData[key]);
      } else {
        merged[key] = newData[key];
      }
    }
  }
  return merged;
}

// Process chunk with GPT
async function processChunkWithGPT(chunk, index, totalChunks) {
  const prompt = `
Extract yacht listing information and return ONLY valid JSON
matching this schema:

{
  yachtName,
  builder,
  yachtType,
  model,
  location,
  guestCapacity,
  price,
  bathRooms,
  bedRooms,
  cabins,
  crew,
  guests,
  constructions:{GRP,STEEL,Aluminum,Wood,Composite},
  yearBuilt,
  lengthOverall: { value, unit },
  beam: { value, unit },
  draft: { value, unit },
  grossTons,
  engineMake,
  engineModel,
  description
}

IMPORTANT INSTRUCTIONS:
1. ALWAYS search aggressively for yachtName - it may appear as:
   - "Vessel Name:", "Yacht Name:", "Model Name:", boat/ship name in headers
   - First mentioned proper noun followed by "yacht" or "vessel"
   - If truly not found, return null

2. For dimensions (lengthOverall, beam, draft):
   - Extract numeric value and unit (m, ft, meters, feet)
   - Format: { value: NUMBER, unit: "m" or "ft" }
   - If no unit specified, assume "m" (meters)
   - If not found, return null (NOT { value: null, unit: null })

3. For other fields: if not found in the text, return null
4. Return ONLY the JSON object, no markdown or explanations

TEXT CHUNK:
"""${chunk}"""
`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`OpenAI API error on chunk ${index + 1}/${totalChunks}:`, errText);
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    
    if (content) {
      try {
        const cleaned = cleanJsonString(content);
        return JSON.parse(cleaned);
      } catch (err) {
        console.error(`Failed to parse GPT output for chunk ${index + 1}/${totalChunks}:`, err.message);
        return null;
      }
    }
    return null;
  } catch (err) {
    console.error(`Error processing chunk ${index + 1}/${totalChunks}:`, err.message);
    return null;
  }
}

// Limit concurrent requests to avoid rate limiting (max 3 parallel)
async function processChunksInParallel(chunks, onChunk) {
  const batchSize = 3;
  const results = new Array(chunks.length);
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
    const batchPromises = batch.map((chunk, idx) => 
      processChunkWithGPT(chunk, i + idx, chunks.length)
    );
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((result, idx) => {
      results[i + idx] = result;
    });
    
    // Merge and callback after each batch
    let merged = { constructions: {} };
    results.filter(r => r).forEach(r => {
      merged = mergeExtraction(merged, r);
    });
    if (onChunk) onChunk(merged);
  }
  
  return results;
}

export const matchListingFieldsWithGPT = async (text, onChunk) => {
  if (!text || text.trim().length === 0) {
    throw new Error("No extractable text provided to GPT");
  }

  const chunks = chunkText(text);
  console.log(`Processing ${chunks.length} text chunks in parallel...`);
  
  const results = await processChunksInParallel(chunks, onChunk);
  
  let finalData = { constructions: {} };
  results.filter(r => r).forEach(r => {
    finalData = mergeExtraction(finalData, r);
  });

  return finalData;
};