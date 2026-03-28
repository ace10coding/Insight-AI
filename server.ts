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

// ── Selzy helpers ─────────────────────────────────────────────────────────────
const SELZY_BASE = 'https://api.selzy.com/en/api';
const SELZY_LIST_ID = '1'; // "My first list" from getLists

async function selzySubscribe(email: string): Promise<{ personId?: number; error?: string }> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      api_key: SELZY_API_KEY,
      list_ids: SELZY_LIST_ID,
      'fields[email]': email,
    });
    const res = await axios.post(`${SELZY_BASE}/subscribe?${params.toString()}`);
    const data = res.data as any;
    if (data.error) return { error: data.error };
    return { personId: data.result?.person_id };
  } catch (err: any) {
    return { error: err.response?.data?.error || err.message };
  }
}

async function selzySendEmail(to: string, subject: string, htmlBody: string): Promise<{ id?: string; error?: string }> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      api_key: SELZY_API_KEY,
      email: to,
      subject,
      body: htmlBody,
    });
    const res = await axios.post(`${SELZY_BASE}/sendEmail?${params.toString()}`);
    const data = res.data as any;
    if (data.error || data.code === 'invalid_arg') return { error: data.error };
    return { id: data.result?.email_id };
  } catch (err: any) {
    return { error: err.response?.data?.error || err.message };
  }
}

const WELCOME_HTML = (email: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:40px 40px 30px;text-align:center;background:linear-gradient(135deg,#111 0%,#1a1a1a 100%);">
          <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:24px;">
            <span style="background:#f97316;border-radius:8px;padding:8px;font-size:20px;">⚡</span>
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Insight AI</span>
          </div>
          <h1 style="color:#fff;font-size:28px;font-weight:800;margin:0 0 12px;line-height:1.2;">
            You're in! 🎉
          </h1>
          <p style="color:#9ca3af;font-size:16px;margin:0 0 28px;line-height:1.6;">
            Thanks for joining the Insight AI newsletter. You'll be the first to know about new features, growth tactics, and YouTube creator insights.
          </p>
          <a href="https://insightai.io" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">
            Explore Insight AI →
          </a>
        </td></tr>
        <tr><td style="padding:32px 40px;border-top:1px solid #222;">
          <p style="color:#6b7280;font-size:13px;margin:0;text-align:center;">
            You subscribed with ${email}. 
            If this was a mistake, simply ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Newsletter subscription ───────────────────────────────────────────────────
app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  // 1. Add to Selzy list
  const subResult = await selzySubscribe(email);
  if (subResult.error) {
    console.error('Selzy subscribe error:', subResult.error);
  } else {
    console.log(`Selzy: added contact person_id=${subResult.personId}`);
  }

  // 2. Send welcome email via Selzy
  const mailResult = await selzySendEmail(
    email,
    'Welcome to Insight AI! 🎉',
    WELCOME_HTML(email),
  );
  if (mailResult.error) {
    console.error('Selzy sendEmail error:', mailResult.error);
  } else {
    console.log(`Selzy: welcome email sent id=${mailResult.id}`);
  }

  // 3. Also try Mailchimp if configured
  const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
  const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
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
