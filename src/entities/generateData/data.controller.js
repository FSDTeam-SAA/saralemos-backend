import OpenAI from 'openai';

import Ad from './data.model.js';
import { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const generateAd = async (req, res) => {
  try {
    const { tone, postType, platforms, contactInfo, keywords, cta } = req.body;

    // 1️⃣ Validate required fields
    if (!tone) return res.status(400).json({ error: 'tone is required' });
    if (!postType)
      return res.status(400).json({ error: 'postType is required' });
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        error: 'platforms array is required (e.g., ["facebook", "instagram"])'
      });
    }

    // 2️⃣ Build prompt for GPT
    const keywordsText =
      keywords && keywords.length > 0 ? keywords.join(', ') : 'N/A';
    const ctaText = cta || 'Contact us';
    const contactText = contactInfo || 'No contact info provided';

    const prompt = String.raw`
You are an expert social media content creator for premium yacht marketing.

Create engaging Facebook/Instagram post content based on:
- Tone: ${tone}
- Post Type: ${postType}
- Contact Info: ${contactText}
- Keywords: ${keywordsText}
- Call to Action: ${ctaText}
- Platforms: ${platforms.join(', ')}

Return ONLY this exact JSON structure for complete social media posts:

{
  "facebook": {
    "message": "Complete engaging Facebook post message with emojis, line breaks, call-to-action, and relevant hashtags. Include contact info if provided.",
    "imagePrompt": "Detailed description for generating a premium yacht image"
  },
  "instagram": {
    "message": "Complete engaging Instagram caption with emojis, line breaks, call-to-action, and 5-10 relevant hashtags. Include contact info if provided.",
    "imagePrompt": "Detailed description for generating a premium yacht Instagram image"
  }
}

Rules:
- "message" should be a COMPLETE ready-to-post caption (150-300 words)
- Include emojis throughout the message for engagement
- Use \n for line breaks to format the post nicely
- Include the call-to-action naturally in the message
- Add contact info if provided (phone, email, website)
- Facebook: Add 3-5 relevant hashtags at the end
- Instagram: Add 5-10 relevant hashtags at the end
- imagePrompt MUST describe a PREMIUM LUXURY YACHT scene (e.g., "luxury yacht sailing at sunset", "premium yacht deck with champagne", "sleek motor yacht in turquoise waters")
- Focus on luxury, elegance, and premium yacht lifestyle
- Make it sound natural, engaging, and ready to publish
- DO NOT return anything outside the JSON
- DO NOT add explanations or comments
- Output ONLY valid JSON
`;

    // 3️⃣ Call GPT API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const generatedText = response.choices[0].message.content;

    // 4️⃣ Parse JSON
    let adData;
    try {
      adData = JSON.parse(generatedText);
    } catch (err) {
      console.error('JSON parse error:', err);
      return res.status(500).json({
        error: 'GPT did not return valid JSON',
        raw: generatedText
      });
    }

    // 5️⃣ Generate images for each platform
    const imageResults = {};

    for (const platform of platforms) {
      if (!adData[platform]?.imagePrompt) continue;

      try {
        // Enhance prompt to always focus on premium yachts
        const enhancedPrompt = `Premium luxury yacht marketing: ${adData[platform].imagePrompt}. Ultra high quality, professional photography, luxurious atmosphere.`;

        console.log(`Generating image for ${platform}...`);

        // Generate image with DALL-E
        const imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        });

        const imageUrl = imageResponse.data[0].url;
        console.log(`DALL-E image URL for ${platform}:`, imageUrl);

        // Download image from OpenAI
        const imageBuffer = await fetch(imageUrl).then((res) =>
          res.arrayBuffer()
        );
        const buffer = Buffer.from(imageBuffer);
        console.log(`Downloaded image buffer size: ${buffer.length} bytes`);

        // Save to temp file
        const fs = await import('fs');
        const path = await import('path');
        const tempPath = path.default.resolve(
          'uploads/images',
          `${Date.now()}-${platform}-yacht.png`
        );

        // Ensure directory exists
        const dir = path.default.dirname(tempPath);
        if (!fs.default.existsSync(dir)) {
          fs.default.mkdirSync(dir, { recursive: true });
        }

        fs.default.writeFileSync(tempPath, buffer);
        console.log(`Saved temp file: ${tempPath}`);

        // Upload to Cloudinary
        const cloudinaryResult = await cloudinaryUpload(
          tempPath,
          undefined,
          'yacht-ads'
        );

        console.log(
          `Cloudinary upload success for ${platform}:`,
          cloudinaryResult.secure_url
        );
        imageResults[platform] = cloudinaryResult.secure_url;
      } catch (imgError) {
        console.error(
          `❌ Image generation failed for ${platform}:`,
          imgError.message
        );
        console.error('Full error:', imgError);
        imageResults[platform] = null;
      }
    }

    // 6️⃣ Return platform-specific ad content with images
    res.json({
      success: true,
      data: {
        facebook: {
          ...adData.facebook,
          imageUrl: imageResults.facebook || null
        },
        instagram: {
          ...adData.instagram,
          imageUrl: imageResults.instagram || null
        },
        meta: { tone, postType, cta: ctaText }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Create ad and save in DB with Cloudinary upload
export const createAd = async (req, res) => {
  try {
    const userId = req.user._id;
    // Parse JSON fields from form-data
    const campaign = JSON.parse(req.body.campaign);
    const adSet = JSON.parse(req.body.adSet);
    const adCreative = JSON.parse(req.body.adCreative);

    // Upload files if provided
    // Upload files if provided
    let uploadedUrls = [];
    if (req.files && req.files.ads && req.files.ads.length > 0) {
      for (let file of req.files.ads) {
        const uploaded = await cloudinaryUpload(
          file.path,
          file.filename,
          'ads'
        );
        if (uploaded !== 'file upload failed') {
          uploadedUrls.push(uploaded.secure_url);
        }
      }
    }

    // Merge uploaded URLs into adCreative.mediaUrls
    if (!adCreative.mediaUrls) adCreative.mediaUrls = [];
    adCreative.mediaUrls.push(...uploadedUrls);

    const newAd = await Ad.create({
      campaign,
      adSet,
      adCreative,
      userId: req.user._id
    });

    res.json({
      message: 'Ad created successfully',
      ad: newAd
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllAds = async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 }); // newest first
    res.json({
      message: 'Ads fetched successfully',
      ads
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ---------------- Get ad by ID ----------------
export const getAdById = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json({
      message: 'Ad fetched successfully',
      ad
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
