import fetch from "node-fetch";

function cleanJsonString(str) {
  // Remove ```json and ``` fences, trim extra whitespace
  return str.replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
}

export const matchListingFieldsWithGPT = async (text) => {
  const prompt = `
Extract yacht listing information and return ONLY JSON
matching this schema:

{
  yachtName,
  builder,
  yachtType,
  model,
  location,
  guestCapacity,
  Price,
  bathRooms,
  bedRooms,
  cabins,
  crew,
  guests,
  constructions:{GRP,sTEEL,Aluminum,Wood,Composite}
  yearBuilt,
  lengthOverall: { value, unit },
  beam: { value, unit },
  draft: { value, unit },
  grossTons,
  engineMake,
  engineModel,
  description
}

TEXT:
"""${text}"""
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await res.json();
  const content = data.choices[0].message.content;

  // ✅ Clean code fences before parsing
  const cleaned = cleanJsonString(content);

  return JSON.parse(cleaned);
};