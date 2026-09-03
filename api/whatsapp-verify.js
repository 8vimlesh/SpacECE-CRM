// Vercel Serverless Function — verifies Meta credentials server-to-server.
// Used by the Settings page's "Save & Verify" button.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { phoneNumberId, accessToken } = req.body || {};

  if (!phoneNumberId || !accessToken) {
    return res.status(400).json({
      error: { message: 'phoneNumberId and accessToken are both required' }
    });
  }

  try {
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${encodeURIComponent(accessToken)}`,
      { method: 'GET' }
    );

    const data = await metaResponse.json();
    return res.status(metaResponse.status).json(data);
  } catch (err) {
    return res.status(502).json({
      error: { message: `Could not reach Meta Graph API: ${err.message || err}` }
    });
  }
}
