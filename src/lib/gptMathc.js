import fetch from "node-fetch";

function cleanJsonString(str) {
  // Remove ```json and ``` fences, trim extra whitespace
  return str.replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
}

export const matchListingFieldsWithGPT = async (text) => {
  if (!text || text.trim().length === 0) {
    throw new Error("No extractable text provided to GPT");
  }

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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${errText}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`OpenAI error: ${data.error.message}`);
  }

  const choice = data?.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error("Invalid GPT response structure");
  }

  const cleaned = cleanJsonString(choice.message.content);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("GPT raw output:", choice.message.content);
    throw new Error("Failed to parse GPT JSON output");
  }
};

// export const matchListingFieldsWithGPT = async (text) => {
//   const prompt = `
// Extract yacht listing information and return ONLY JSON
// matching this schema:

// {
//   yachtName,
//   builder,
//   yachtType,
//   model,
//   location,
//   guestCapacity,
//   Price,
//   bathRooms,
//   bedRooms,
//   cabins,
//   crew,
//   guests,
//   constructions:{GRP,sTEEL,Aluminum,Wood,Composite}
//   yearBuilt,
//   lengthOverall: { value, unit },
//   beam: { value, unit },
//   draft: { value, unit },
//   grossTons,
//   engineMake,
//   engineModel,
//   description
// }

// TEXT:
// """${text}"""
// `;

//   const res = await fetch("https://api.openai.com/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//       "Content-Type": "application/json"
//     },
    
//     body: JSON.stringify({
//       model: "gpt-4o-mini",
//       temperature: 0,
//       messages: [{ role: "user", content: prompt }]
//     })
//   });

//   const data = await res.json();
//   const content = data.choices[0].message.content;

//   // ✅ Clean code fences before parsing
//   const cleaned = cleanJsonString(content);

//   return JSON.parse(cleaned);
// };