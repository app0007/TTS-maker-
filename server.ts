import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase limits to handle video uploads easily
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// In-Memory store for YouTube OAuth tokens
// For standard security and statelessness under AI Studio preview,
// we keep tokens in a secure server-side session-like in-memory object.
interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiryTime: number; // timestamp
}

let userCreds: OAuthCredentials | null = null;
let cachedChannelInfo: any = null;

// Initialize Gemini SDK safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini API initialized successfully.');
  } catch (err) {
    console.error('Error initializing Gemini API:', err);
  }
} else {
  console.warn('Warning: GEMINI_API_KEY is not defined in the environment. AI features will require custom user input.');
}

// -------------------------------------------------------------
// YouTube OAuth Helper functions
// -------------------------------------------------------------
function getRedirectUri(): string {
  // Use dynamically injected APP_URL from runtime fallback to request Host
  const base = process.env.APP_URL || `http://localhost:${PORT}`;
  return `${base.replace(/\/$/, '')}/api/auth/callback`;
}

// Check and refresh token if expired
async function getValidAccessToken(): Promise<string | null> {
  if (!userCreds) return null;
  const isExpired = Date.now() >= (userCreds.expiryTime - 60000); // 1 minute padding
  if (!isExpired) {
    return userCreds.accessToken;
  }

  // Refresh token
  console.log('Access token expired. Attempting refresh... ');
  if (!userCreds.refreshToken) {
    console.error('No refresh token available to refresh access token.');
    return null;
  }

  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: userCreds.refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Failed to refresh google token:', errText);
      return null;
    }

    const data = await res.json();
    userCreds.accessToken = data.access_token;
    if (data.refresh_token) {
      userCreds.refreshToken = data.refresh_token;
    }
    userCreds.expiryTime = Date.now() + (data.expires_in * 1000);
    console.log('Access token successfully refreshed.');
    return userCreds.accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiEnabled: !!ai,
    hasOAuthSecrets: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

// 1. Generate SEO Metadata using Gemini
app.post('/api/metadata/generate', async (req, res) => {
  const { scriptText, tone, channelNiche } = req.body;

  if (!scriptText) {
    return res.status(400).json({ error: 'scriptText is required' });
  }

  if (!ai) {
    return res.status(500).json({ error: 'Gemini API not configured. Please supply GEMINI_API_KEY.' });
  }

  try {
    const prompt = `You are a professional YouTube SEO Strategist and Video Producer.
Generate video metadata (Title, Description, Tags) based on the following script topic, visual intent, and niche content.

SCRIPT TEXT:
"""
${scriptText}
"""

ADDITIONAL DETAILS:
Niche: ${channelNiche || 'General/Technical'}
Tone Strategy: ${tone || 'Engaging & Tech-focused'}

REQUIREMENTS:
1. Title: Dynamic, highly clickable, containing a strong hook (max 80 chars, no clickbait scams, just professional SEO-optimized style).
2. Description: An elegant 3-paragraph summary of the script written for humans, containing key timeline-style structures, relevant hashtags, and call-to-actions.
3. Tags: An array of 8-15 high-volume search phrases.

Ensure the returned format complies exactly with the provided JSON schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'The optimized YouTube video title.'
            },
            description: {
              type: Type.STRING,
              description: 'The narrative optimization structure for the video description.'
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of SEO keyword relevance tags.'
            }
          },
          required: ['title', 'description', 'tags']
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || '{}');
    res.json(parsedData);
  } catch (error: any) {
    console.error('Metadata generation error:', error);
    res.status(500).json({ error: error.message || 'Error executing AI metadata generation.' });
  }
});

// 2. Generate Built-in Speech with Gemini TTS
app.post('/api/voice/gemini-tts', async (req, res) => {
  const { text, voiceName } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text prompt description is required' });
  }

  if (!ai) {
    return res.status(500).json({ error: 'Gemini API client not initialized.' });
  }

  try {
    const selectedVoice = voiceName || 'Kore'; // Option sets: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    console.log(`Generating Gemini TTS using voice: ${selectedVoice}...`);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'Failed to extract generated audio bytes from Gemini TTS response.' });
    }

    res.json({ base64Audio, voice: selectedVoice });
  } catch (error: any) {
    console.error('Gemini TTS synthesis failure:', error);
    res.status(500).json({ error: error.message || 'Audio generation error.' });
  }
});

// 3. Optional ElevenLabs Endpoint (Proxy)
app.post('/api/voice/elevenlabs', async (req, res) => {
  const { text, voiceId, apiKey } = req.body;
  
  const keyToUse = apiKey || process.env.ELEVENLABS_API_KEY;
  if (!keyToUse) {
    return res.status(400).json({ error: 'ElevenLabs API key is required. Please set it in your environment or enter it on the profile dashboard.' });
  }

  if (!text) {
    return res.status(400).json({ error: 'Text prompt description is required' });
  }

  try {
    const targetVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default voice id (Rachel)
    console.log(`Generating ElevenLabs TTS using voice: ${targetVoiceId}...`);

    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': keyToUse
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!elRes.ok) {
      const errText = await elRes.text();
      throw new Error(`ElevenLabs API error: ${elRes.status} - ${errText}`);
    }

    // Convert response buffer to base64
    const buffer = await elRes.arrayBuffer();
    const base64Audio = Buffer.from(buffer).toString('base64');
    
    res.json({ base64Audio });
  } catch (error: any) {
    console.error('ElevenLabs TTS synthesis failure:', error);
    res.status(500).json({ error: error.message || 'ElevenLabs audio generation error.' });
  }
});

// -------------------------------------------------------------
// YouTube OAuth 2.0 Management Routes
// -------------------------------------------------------------

// Fetch authorization URL
app.get('/api/auth/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({
      error: 'Google OAuth Client ID is missing inside the environment variables. Please populate GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    });
  }

  const redirectUri = getRedirectUri();
  console.log(`OAuth URL requested. Setting redirect callback to: ${redirectUri}`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// Callback handler that closes popup and communicates success via postMessage
app.get(['/api/auth/callback', '/api/auth/callback/'], async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <html>
        <body style="background:#13151a; color:#f8fafc; font-family:sans-serif; text-align:center; padding:50px;">
          <h2>Authentication Failed</h2>
          <p style="color:#ef4444;">${error}</p>
          <button onclick="window.close()" style="background:#ef4444; border:none; padding:10px 20px; color:white; border-radius:6px; cursor:pointer;">Close Window</button>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send('No authorization code provided.');
  }

  try {
    const redirectUri = getRedirectUri();
    console.log(`Exchanging OAuth Code with callback redirect_uri: ${redirectUri}`);

    const params = new URLSearchParams({
      code: code.toString(),
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Failed to exchange token: ${tokenRes.status} ${errText}`);
    }

    const data = await tokenRes.json();
    
    userCreds = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '', // Refresh token is only sent on first consent
      expiryTime: Date.now() + (data.expires_in * 1000)
    };

    // Prefetch channel info
    try {
      const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: {
          'Authorization': `Bearer ${userCreds.accessToken}`
        }
      });
      if (channelRes.ok) {
        const channelData = await channelRes.json();
        if (channelData.items && channelData.items.length > 0) {
          const item = channelData.items[0];
          cachedChannelInfo = {
            id: item.id,
            title: item.snippet.title,
            customUrl: item.snippet.customUrl,
            thumbnail: item.snippet.thumbnails?.default?.url
          };
        }
      }
    } catch (chErr) {
      console.error('Error fetching channel details inside callback:', chErr);
    }

    res.send(`
      <html>
        <body style="background:#0b0c10; font-family:sans-serif; text-align:center; padding:80px; color:#c5c6c7;">
          <h2 style="color:#66fcf1; font-weight: 500;">Connection Successful!</h2>
          <p>YouTube Channel Linked successfully: <strong>${cachedChannelInfo?.title || 'Account'}</strong></p>
          <p>This validation popup will close automatically.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              setTimeout(() => {
                window.close();
              }, 1200);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('OAuth token exchange error:', err);
    res.status(500).send(`
      <html>
        <body style="background:#13151a; color:#f8fafc; font-family:sans-serif; text-align:center; padding:50px;">
          <h2>Callback Processing Error</h2>
          <p style="color:#f87171;">${err.message || 'Unknown credential swap error'}</p>
          <button onclick="window.close()" style="background:#f87171; border:none; padding:10px 20px; color:white; border-radius:6px; cursor:pointer;">Close Window</button>
        </body>
      </html>
    `);
  }
});

// Retrieve status + authenticated channel
app.get('/api/youtube/status', async (req, res) => {
  const token = await getValidAccessToken();
  if (!token) {
    return res.json({ authenticated: false });
  }

  // If we already cached snippets and have token, return them
  if (cachedChannelInfo) {
    return res.json({ authenticated: true, channel: cachedChannelInfo });
  }

  // Otherwise, fetch channel details on the fly
  try {
    const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!channelRes.ok) {
      return res.json({ authenticated: false, error: 'Token might be stale or lacks scopes.' });
    }

    const d = await channelRes.json();
    if (d.items && d.items.length > 0) {
      const item = d.items[0];
      cachedChannelInfo = {
        id: item.id,
        title: item.snippet.title,
        customUrl: item.snippet.customUrl,
        thumbnail: item.snippet.thumbnails?.default?.url
      };
      return res.json({ authenticated: true, channel: cachedChannelInfo });
    }

    res.json({ authenticated: true });
  } catch (error: any) {
    res.json({ authenticated: false, error: error.message });
  }
});

// Clear auth session (Log out)
app.post('/api/youtube/logout', (req, res) => {
  userCreds = null;
  cachedChannelInfo = null;
  res.json({ success: true });
});

// 4. Video upload handler
app.post('/api/youtube/upload', async (req, res) => {
  const token = await getValidAccessToken();
  if (!token) {
    return res.status(401).json({ error: 'OAuth Session is not authenticated. Please log in first.' });
  }

  const { videoBase64, privacyStatus, title, description, tags } = req.body;

  if (!videoBase64) {
    return res.status(400).json({ error: 'videoBase64 data representation is fully required.' });
  }

  try {
    console.log('Publishing video to YouTube...');
    const buffer = Buffer.from(videoBase64, 'base64');

    // Create Metadata
    const snippet = {
      title: title || 'GhostWriter Output Video',
      description: description || 'Generated and Auto-posted directly by GhostWriter YT Automation Pipeline.',
      tags: tags || []
    };

    const statusObj = {
      privacyStatus: privacyStatus || 'unlisted'
    };

    // YouTube Video upload endpoint via binary multipart body
    const boundary = '---------GhostWriterYTBoundary';
    
    // Construct multipart metadata body
    const metadataPart = JSON.stringify({ snippet, status: statusObj });
    const requestBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: video/mp4\r\nContent-Transfer-Encoding: binary\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--`)
    ]);

    const uploadRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': requestBody.length.toString()
      },
      body: requestBody
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`YouTube API returned upload error: status ${uploadRes.status} - ${errText}`);
    }

    const responseData = await uploadRes.json();
    console.log('Video published successfully onto channel.');
    res.json({
      success: true,
      videoId: responseData.id,
      videoUrl: `https://www.youtube.com/watch?v=${responseData.id}`,
      snippet: responseData.snippet,
      status: responseData.status
    });
  } catch (error: any) {
    console.error('Error uploading video to YouTube:', error);
    res.status(500).json({ error: error.message || 'Internal failure during YouTube publish stream.' });
  }
});


// -------------------------------------------------------------
// Serve Application Frontend Static Files / Vite Middleware
// -------------------------------------------------------------
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Vite middleware running in development mode.');
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static assets.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GhostWriter YT dev container listening on http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error('Critical failure initiating Server:', err);
});
