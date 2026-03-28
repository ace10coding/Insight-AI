import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const app = express();
const PORT = 5000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SELZY_API_KEY = process.env.SELZY_API_KEY || '6t48ekffiyhpkuuuhq1bdxnxemqmb3e597d5hzzo';

const stripe = new Stripe(process.env.STRIPE_KEY || '', { apiVersion: '2026-03-25.dahlia' });

// ── Stripe webhook (must be BEFORE express.json) ──────────────────────────────
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    try {
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
      } else {
        event = JSON.parse(req.body.toString()) as Stripe.Event;
      }
    } catch (err: any) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Payment completed for session:', session.id, 'customer:', session.customer_email);
    }

    res.json({ received: true });
  }
);

// ── JSON middleware (all routes below get parsed JSON) ────────────────────────
app.use(express.json());

// ── Stripe: Create checkout session ──────────────────────────────────────────
app.post('/api/create-checkout-session', async (req, res) => {
  const { planName, billingPeriod, priceMonthly, priceAnnual } = req.body;
  if (!planName || !billingPeriod) {
    return res.status(400).json({ error: 'planName and billingPeriod required' });
  }

  if (!process.env.STRIPE_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const isAnnual = billingPeriod === 'annual';
  const amount = isAnnual ? priceAnnual : priceMonthly;
  const interval = isAnnual ? 'year' : 'month';
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0]
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
    : `http://localhost:${PORT}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount * 100,
            recurring: { interval },
            product_data: {
              name: `Insight AI ${planName} Plan (${isAnnual ? 'Annual' : 'Monthly'})`,
              description: isAnnual
                ? `Billed annually — save vs monthly`
                : `Billed monthly`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${domain}/?payment=success&plan=${encodeURIComponent(planName)}&period=${billingPeriod}`,
      cancel_url: `${domain}/?payment=cancelled`,
    });
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Selzy: Add subscriber ─────────────────────────────────────────────────────
app.post('/api/selzy-subscribe', async (req, res) => {
  const { email, listId } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const response = await axios.post(
      'https://api.selzy.com/en/api/addContacts.json',
      {
        apiKey: SELZY_API_KEY,
        listIds: listId ? [listId] : [],
        contacts: [{ email }],
        overwriteExisting: true,
      }
    );
    const data = response.data as any;
    if (data.error) throw new Error(data.error);
    res.json({ success: true });
  } catch (error: any) {
    const detail = error.response?.data?.error || error.message;
    console.error('Selzy error:', detail);
    res.status(500).json({ error: detail });
  }
});

// ── Newsletter subscription (Mailchimp + Selzy) ───────────────────────────────
app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
  const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;

  // Try Selzy first
  try {
    await axios.post('https://api.selzy.com/en/api/addContacts.json', {
      apiKey: SELZY_API_KEY,
      listIds: [],
      contacts: [{ email }],
      overwriteExisting: true,
    });
  } catch (err: any) {
    console.error('Selzy subscribe error:', err.message);
  }

  // Also try Mailchimp if configured
  if (MAILCHIMP_API_KEY && MAILCHIMP_LIST_ID) {
    const dc = MAILCHIMP_API_KEY.split('-').pop();
    try {
      await axios.post(
        `https://${dc}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`,
        { email_address: email, status: "subscribed" },
        { auth: { username: "anystring", password: MAILCHIMP_API_KEY } }
      );
    } catch (error: any) {
      if (error.response?.data?.title !== "Member Exists") {
        console.error("Mailchimp error:", error.response?.data?.detail || error.message);
      }
    }
  }

  res.json({ success: true });
});

// Helper to extract video ID
function extractVideoId(url: string) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// API Routes
app.get("/api/youtube/video", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: "URL required" });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: "YouTube API Key not configured in environment" });
  }

  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    const data = response.data as any;
    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }
    res.json(data.items[0]);
  } catch (error: any) {
    console.error("YouTube API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch video data from YouTube API" });
  }
});

app.get("/api/youtube/channel", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: "URL required" });

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: "YouTube API Key not configured in environment" });
  }

  try {
    let params: any = {
      part: 'snippet,statistics,brandingSettings,contentDetails',
      key: YOUTUBE_API_KEY
    };

    if (url.includes('/channel/')) {
      params.id = url.split('/channel/')[1].split('/')[0].split('?')[0];
    } else if (url.includes('@')) {
      params.forHandle = url.split('@')[1].split('/')[0].split('?')[0];
      if (!params.forHandle.startsWith('@')) params.forHandle = '@' + params.forHandle;
    } else if (url.includes('/user/')) {
      params.forUsername = url.split('/user/')[1].split('/')[0].split('?')[0];
    } else if (url.includes('/c/')) {
      const customName = url.split('/c/')[1].split('/')[0].split('?')[0];
      const searchResponse = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: { part: 'snippet', q: customName, type: 'channel', maxResults: 1, key: YOUTUBE_API_KEY }
      });
      const searchData = searchResponse.data as any;
      if (searchData.items && searchData.items.length > 0) {
        params.id = searchData.items[0].id.channelId;
      } else {
        return res.status(404).json({ error: "Channel not found" });
      }
    } else {
      const searchResponse = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: { part: 'snippet', q: url, type: 'channel', maxResults: 1, key: YOUTUBE_API_KEY }
      });
      const searchData = searchResponse.data as any;
      if (searchData.items && searchData.items.length > 0) {
        params.id = searchData.items[0].id.channelId;
      } else {
        return res.status(404).json({ error: "Channel not found" });
      }
    }

    const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, { params });
    const data = response.data as any;

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: "Channel not found" });
    }
    
    const channel = data.items[0];
    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
    const videosResponse = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
      params: { part: 'snippet,contentDetails', playlistId: uploadsPlaylistId, maxResults: 50, key: YOUTUBE_API_KEY }
    });

    const videosData = videosResponse.data as any;
    const videoIds = videosData.items.map((item: any) => item.contentDetails.videoId).join(',');
    const statsResponse = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: { part: 'statistics,snippet', id: videoIds, key: YOUTUBE_API_KEY }
    });

    const statsData = statsResponse.data as any;
    res.json({ channel, recentVideos: statsData.items });
  } catch (error: any) {
    console.error("YouTube API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch channel data from YouTube API" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
