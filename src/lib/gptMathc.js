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

export const matchListingFieldsWithGPT = async (text, onChunk) => {
  if (!text || text.trim().length === 0) {
    throw new Error("No extractable text provided to GPT");
  }

  const chunks = chunkText(text);
  let finalData = {
    constructions: {}
  };

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
    const chunk = chunks[i];
    
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

IMPORTANT:
- If a field is not found in the text, return null for that field.
- Return ONLY the JSON object.

TEXT CHUNK:
"""${chunk}"""
`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1, // Lower temperature for more consistent extraction
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`OpenAI API error on chunk ${i}:`, errText);
      continue; // Skip failed chunk
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    
    if (content) {
      try {
        const cleaned = cleanJsonString(content);
        const extracted = JSON.parse(cleaned);
        finalData = mergeExtraction(finalData, extracted);
        
        // Call the callback with current merged data if provided
        if (onChunk) {
          onChunk(finalData);
        }
      } catch (err) {
        console.error(`Failed to parse GPT output for chunk ${i}:`, err.message);
      }
    }
  }

  return finalData;
};