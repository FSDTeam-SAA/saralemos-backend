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
        // Smart merging: for yachtName, prefer the longer/more specific name
        if (key === 'yachtName' && merged[key]) {
          // Keep the more specific name (longer one, or the one that's not a generic term)
          const isGeneric = (name) => {
            const genericTerms = ['model', 'yacht', 'boat', 'vessel', 'ship'];
            return genericTerms.some(term => name?.toLowerCase() === term);
          };
          
          if (isGeneric(merged[key])) {
            merged[key] = newData[key];
          } else if (!isGeneric(newData[key])) {
            // Both are specific - prefer longer or first one
            merged[key] = merged[key].length >= newData[key]?.length ? merged[key] : newData[key];
          }
          // else: keep existing (it's specific, new one is generic)
        } else {
          // For other fields, only update if current is null
          if (!merged[key]) {
            merged[key] = newData[key];
          }
        }
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

**YACHT NAME EXTRACTION (WITHOUT EXPLICIT LABELS):**

The yacht name is typically found through context clues:

1. **Title/Header Pattern**: Look for prominent proper noun at document top
   - Usually capitalized, distinctive name
   - Often appears before technical specs
   - Example: Document says "SOLARIS - Technical Specification" → yachtName = "SOLARIS"

2. **Signature/Official Name Pattern**: 
   - Standalone proper name in special formatting (bold, caps, large font implied)
   - Appears early in document
   - Not repeated technical specifications

3. **Known Builder Exclusion**:
   - Known builders: Sunseeker, Azimut, Beneteau, Ferretti, Pershing, Ritz-Carlton, Maserati, Trinity, Benetti
   - If you see "Sunseeker 95" → model="95", builder="Sunseeker", NOT yachtName
   - But if you see "SOLARIS" and builder is separate → yachtName="SOLARIS"

4. **Context Clues**:
   - Proper noun followed by specs = yacht name
   - "The [NAME]" or "[NAME] yacht" structure → NAME is yachtName
   - First distinctive proper noun that ISN'T a known builder/location = likely yachtName

5. **Multi-Word Names**:
   - Yacht names can be 1-5 words: "Solaris", "Lady M", "Blue Diamond"
   - Extract complete name, don't truncate

**EXTRACTION LOGIC:**
- DON'T assume labels exist
- Look at document structure and hierarchy
- Extract the primary identifying name (not builder, not location, not model)
- If document title has distinctive name → that's yachtName
- If unclear, return null (better to ask than guess wrong)

**ALSO EXTRACT:**
- builder: Company name (Sunseeker, Azimut, etc.)
- model: Model number/code (if separate from name)
- yachtType: Type (Motor Yacht, Sailing Yacht, Catamaran, etc.)
- For all dimensions: numeric value + unit (m/ft), or null if missing

**RETURN FORMAT:**
- ONLY valid JSON
- No markdown, no explanations
- Null for any field not confidently found

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