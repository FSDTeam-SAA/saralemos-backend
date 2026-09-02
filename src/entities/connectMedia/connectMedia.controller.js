import axios from 'axios';
import User from '../auth/auth.model.js';

const getRedirectUrl = (req, status = 'success', message = '') => {
  const host = req.headers.host || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const baseUrl = isLocal ? 'http://localhost:3000' : (process.env.FRONTEND_URL || 'http://localhost:3000');
  
  const cleanBase = baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('status', status);
  if (message) {
    params.set('message', message);
  }

  return `${cleanBase}/social-accounts?${params.toString()}`;
};

// Redirect user to Facebook login
export const getFacebookLoginUrl = async (req, res) => {
  const userId = req.user._id;
  const redirectUri = encodeURIComponent(`${process.env.BASE_URL}/api/v1/connect/callback`);
  const clientId = process.env.FACEBOOK_APP_ID;
  const scope = encodeURIComponent('public_profile,pages_show_list,pages_read_engagement,pages_manage_posts');

  const fbLoginUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${userId}`;

  res.json({ url: fbLoginUrl });
};

// Handle callback from Facebook
export const facebookCallback = async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    if (!code) {
      return res.redirect(getRedirectUrl(req, 'error', 'No authorization code provided by Facebook.'));
    }
    if (!userId) {
      return res.redirect(getRedirectUrl(req, 'error', 'User ID not provided in state parameter.'));
    }

    // Step 1: Short-lived token
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

    // Step 2: Long-lived token
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

    // Step 3: Get all pages + Instagram accounts
    const pagesRes = await axios.get(
      `https://graph.facebook.com/v20.0/me/accounts`, {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,access_token,instagram_business_account'
      }
    }
    );

    const pagesData = pagesRes.data.data || [];
    console.log(`Fetched ${pagesData.length} pages from Facebook`);

    const processedPages = pagesData.map(page => ({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      instagramBusinessId: page.instagram_business_account?.id || null,
    }));

    // Step 4: Save to DB
    const facebookBusinesses = [
      {
        businessId: "direct",
        businessName: "Connected Pages",
        pages: processedPages,
      }
    ];

    await User.findByIdAndUpdate(userId, { facebookBusinesses });

    // Redirect browser directly to Frontend /social-accounts with status=success
    return res.redirect(getRedirectUrl(req, 'success'));

  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message || "Failed to connect Facebook account";
    console.error("Facebook callback error:", errorMsg);
    return res.redirect(getRedirectUrl(req, 'error', errorMsg));
  }
};

// Disconnect a Facebook page or all accounts
export const disconnectFacebookAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { pageId } = req.body || {};

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (pageId) {
      let facebookBusinesses = user.facebookBusinesses || [];
      facebookBusinesses = facebookBusinesses
        .map(biz => {
          const bizObj = biz.toObject ? biz.toObject() : biz;
          return {
            ...bizObj,
            pages: (bizObj.pages || []).filter(p => p.pageId !== pageId)
          };
        })
        .filter(biz => (biz.pages || []).length > 0);

      user.facebookBusinesses = facebookBusinesses;
    } else {
      user.facebookBusinesses = [];
    }

    await user.save();

    return res.status(200).json({
      message: pageId ? 'Facebook page disconnected successfully' : 'All social media accounts disconnected successfully',
      facebookBusinesses: user.facebookBusinesses
    });
  } catch (error) {
    console.error('Error disconnecting Facebook account:', error);
    return res.status(500).json({ error: error.message || 'Failed to disconnect account' });
  }
};
