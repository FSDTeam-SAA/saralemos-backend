import axios from 'axios';
import User from '../auth/auth.model.js';


// Redirect user to Facebook login
export const getFacebookLoginUrl = async (req, res) => {
  const userId = req.user._id
  const redirectUri = encodeURIComponent(`${process.env.BASE_URL}/api/v1/connect/callback`);
  const clientId = process.env.FACEBOOK_APP_ID;
  const scope = encodeURIComponent('public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish');

  const fbLoginUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${userId}`;

  res.json({ url: fbLoginUrl }); // Frontend can redirect user to this URL
};

// Handle callback from Facebook


export const facebookCallback = async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    if (!code) return res.status(400).json({ error: "No code provided by Facebook" });
    if (!userId) return res.status(400).json({ error: "User ID not provided" });

    // ------------------- Step 1: Short-lived token -------------------
    const shortLivedRes = await axios.get(
      `https://graph.facebook.com/v20.0/oauth/access_token`, {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        redirect_uri: `${process.env.BASE_URL}/api/v1/connect/callback`,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        code,
      },
    }
    );
    const shortLivedToken = shortLivedRes.data.access_token;

    // ------------------- Step 2: Long-lived token -------------------
    const longLivedRes = await axios.get(
      `https://graph.facebook.com/v20.0/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    }
    );
    const longLivedToken = longLivedRes.data.access_token;

    // ------------------- Step 3: Get all pages + Instagram accounts -------------------
    // Using /me/accounts is the most reliable way to get all pages the user can manage
    const pagesRes = await axios.get(
      `https://graph.facebook.com/v20.0/me/accounts`, {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,access_token,instagram_business_account'
      }
    }
    );

    const pagesData = pagesRes.data.data || [];

    const processedPages = pagesData.map(page => ({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      instagramBusinessId: page.instagram_business_account?.id || null,
    }));

    // ------------------- Step 4: Save to DB -------------------
    // We'll store them under a single "Direct Connection" business for UI consistency
    const facebookBusinesses = [
      {
        businessId: "direct",
        businessName: "Connected Pages",
        pages: processedPages,
      }
    ];

    await User.findByIdAndUpdate(userId, { facebookBusinesses });

    res.json({
      message: "Facebook & Instagram pages connected successfully",
      facebookBusinesses,
    });

  } catch (error) {
    console.error("Facebook callback error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
};
