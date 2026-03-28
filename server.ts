import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 5000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

app.use(express.json());

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
      // For /c/ URLs, we often need to search because it's a custom URL name
      const customName = url.split('/c/')[1].split('/')[0].split('?')[0];
      const searchResponse = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: {
          part: 'snippet',
          q: customName,
          type: 'channel',
          maxResults: 1,
          key: YOUTUBE_API_KEY
        }
      });
      const searchData = searchResponse.data as any;
      if (searchData.items && searchData.items.length > 0) {
        params.id = searchData.items[0].id.channelId;
      } else {
        return res.status(404).json({ error: "Channel not found" });
      }
    } else {
      // Try to search for the channel if it's a generic URL or just a name
      const searchResponse = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: {
          part: 'snippet',
          q: url,
          type: 'channel',
          maxResults: 1,
          key: YOUTUBE_API_KEY
        }
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
    
    // Also fetch recent videos for "outlier" analysis
    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
    const videosResponse = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
      params: {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        key: YOUTUBE_API_KEY
      }
    });

    const videosData = videosResponse.data as any;
    // Fetch statistics for these videos to find outliers
    const videoIds = videosData.items.map((item: any) => item.contentDetails.videoId).join(',');
    const statsResponse = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'statistics,snippet',
        id: videoIds,
        key: YOUTUBE_API_KEY
      }
    });

    const statsData = statsResponse.data as any;
    res.json({
      channel,
      recentVideos: statsData.items
    });
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
