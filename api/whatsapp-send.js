// Vercel Serverless Function — runs on Vercel's server, NOT in the browser.
// The browser calls THIS endpoint (same origin, no CORS issue).
// This function then calls graph.facebook.com server-to-server,
// where CORS does not apply, and relays the result back.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { phoneNumberId, accessToken, payload } = req.body || {};

  if (!phoneNumberId || !accessToken || !payload) {
    return res.status(400).json({
      error: { message: 'phoneNumberId, accessToken and payload are all required' }
    });
  }

  try {
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await metaResponse.json();
    // Pass Meta's exact status code and body straight through —
    // the frontend's existing error-handling code already knows how to read it.
    return res.status(metaResponse.status).json(data);
  } catch (err) {
    return res.status(502).json({
      error: { message: `Could not reach Meta Graph API: ${err.message || err}` }
    });
  }
}
