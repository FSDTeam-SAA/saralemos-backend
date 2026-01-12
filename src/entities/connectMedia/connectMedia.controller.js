import axios from 'axios';
import User from '../auth/auth.model.js';


// Redirect user to Facebook login
export const getFacebookLoginUrl = async (req, res) => {
  const userId = req.user._id
  const redirectUri = encodeURIComponent(`${process.env.BASE_URL}/api/v1/connect/callback`);
  const clientId = process.env.FACEBOOK_APP_ID;
  const scope = encodeURIComponent('pages_show_list,business_management,ads_management,instagram_basic,ads_read,pages_read_engagement,pages_manage_ads,leads_retrieval,pages_manage_metadata');
  
  const fbLoginUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${userId}`;

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
      `https://graph.facebook.com/v17.0/oauth/access_token`, {
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
      `https://graph.facebook.com/v17.0/oauth/access_token`, {
        params: {
          grant_type: "fb_exchange_token",
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: shortLivedToken,
        },
      }
    );
    const longLivedToken = longLivedRes.data.access_token;

    // ------------------- Step 3: Get all businesses (portfolios) -------------------
    const businessRes = await axios.get(
      `https://graph.facebook.com/v17.0/me/businesses?access_token=${longLivedToken}`
    );
    const businesses = businessRes.data.data || [];
    console.log("Businesses:", businesses);

    // ------------------- Step 4: If no businesses, fallback to personal pages -------------------
    if (!businesses.length) {
      console.warn("No businesses found, falling back to personal pages");

      const pagesRes = await axios.get(
        `https://graph.facebook.com/v17.0/me/accounts?access_token=${longLivedToken}`
      );
      const pages = pagesRes.data.data || [];

      const fallbackPages = await Promise.all(
        pages.map(async (page) => {
          let instagramBusinessId = null;
          try {
            const igRes = await axios.get(
              `https://graph.facebook.com/v17.0/${page.id}?fields=instagram_business_account&access_token=${longLivedToken}`
            );
            instagramBusinessId = igRes.data.instagram_business_account?.id || null;
          } catch {
            console.warn(`No Instagram for ${page.name}`);
          }

          return {
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            instagramBusinessId,
          };
        })
      );

      await User.findByIdAndUpdate(userId, {
        facebookBusinesses: [
          {
            businessId: "personal",
            businessName: "Personal Account",
            pages: fallbackPages,
            adAccounts: [],
          },
        ],
      });

      return res.json({
        message: "Facebook personal pages connected (no business portfolios)",
        facebookBusinesses: fallbackPages,
      });
    }

    // ------------------- Step 5: Get pages + ad accounts for each business -------------------
    const facebookBusinesses = await Promise.all(
      businesses.map(async (business) => {
        const businessId = business.id;
        const businessName = business.name;

        // Get pages for this business
        let pages = [];
        try {
          const pagesRes = await axios.get(
            `https://graph.facebook.com/v17.0/${businessId}/owned_pages?access_token=${longLivedToken}`
          );
          pages = pagesRes.data.data || [];

          // Add IG IDs for each page
        pages = await Promise.all(
  pages.map(async (page) => {
    let instagramBusinessId = null;
    let pageAccessToken = null;

    try {
      // ✅ Fetch page access token
      const tokenRes = await axios.get(
        `https://graph.facebook.com/v17.0/${page.id}?fields=access_token,instagram_business_account&access_token=${longLivedToken}`
      );

      pageAccessToken = tokenRes.data.access_token || null;
      instagramBusinessId = tokenRes.data.instagram_business_account?.id || null;

    } catch (err) {
      console.warn(`Failed to fetch token for page ${page.id}:`, err.response?.data || err.message);
    }

    return {
      pageId: page.id,
      pageName: page.name,
      pageAccessToken,
      instagramBusinessId,
    };
  })
);
        } catch {
          console.warn(`No pages found for business ${businessName}`);
        }

        // Get ad accounts for this business
        let adAccounts = [];
        try {
          const adAccountsRes = await axios.get(
            `https://graph.facebook.com/v17.0/${businessId}/owned_ad_accounts?access_token=${longLivedToken}`
          );
          adAccounts = adAccountsRes.data.data || [];
        } catch {
          console.warn(`No ad accounts for business ${businessName}`);
        }

        return {
          businessId,
          businessName,
          pages,
          adAccounts,
        };
      })
    );

    // ------------------- Step 6: Save to DB -------------------
    await User.findByIdAndUpdate(userId, { facebookBusinesses });

    res.json({
      message: "Facebook & Instagram businesses connected successfully",
      facebookBusinesses,
    });

  } catch (error) {
    console.error("Facebook callback error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
};
