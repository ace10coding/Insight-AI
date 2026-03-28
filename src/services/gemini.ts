import { GoogleGenAI } from "@google/genai";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
}

export async function analyzeVideo(videoUrl: string, competitorUrl?: string, realData?: any, competitorData?: any) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  
  let context = "";
  if (realData) {
    context += `\nREAL DATA FOR TARGET VIDEO:\n${JSON.stringify(realData, null, 2)}\n`;
  }
  if (competitorData) {
    context += `\nREAL DATA FOR COMPETITOR VIDEO:\n${JSON.stringify(competitorData, null, 2)}\n`;
  }

  const prompt = competitorUrl 
    ? `Perform a deep, data-driven comparison between these two YouTube videos. 
       Analyze the content, metadata, and audience engagement drivers for both.
       
       Video 1 (Target): ${videoUrl}
       Video 2 (Competitor/Comparison): ${competitorUrl}
       ${context}
       
       CRITICAL: Use the provided REAL DATA for views, likes, comments, and tags. Do not provide generic advice. Analyze the SPECIFIC differences in:
       1. Tags & SEO: Compare the actual tags used by both. Identify specific high-volume tags the competitor is using that the target video is missing.
       2. Content Strategy: Analyze the pacing, storytelling, and visual style. Why did the competitor's video outperform the target? (e.g., better retention hooks, higher production value, more trending topic alignment).
       3. Outlier Analysis: Is the competitor an outlier? What unique "viral" elements (like specific thumbnail triggers or title phrasing) are they using?
       4. Engagement: How do they handle CTAs and community interaction?
       
       Think step-by-step and provide a rigorous analysis.
       
       Provide the analysis in JSON format with:
       - seoScore: number (0-100)
       - viralityPotential: number (0-100)
       - comparisonPoints: array of objects { aspect: string, myVideo: string, competitor: string, winner: 'me' | 'competitor', insight: string }
       - outlierReason: string (detailed explanation of the performance gap)
       - suggestedTags: string[] (high-performing tags to adopt, specifically identified from the competitor)
       - titleOptimizations: string[]
       - hookSuggestions: string[] (specific hooks based on the competitor's success)
       - contentGaps: string[] (what's missing in the target video)`
    : `Analyze this YouTube video in depth: ${videoUrl}. 
       ${context}
       
       Provide a comprehensive growth strategy in JSON format with:
       - seoScore: number (0-100)
       - viralityPotential: number (0-100)
       - outlierReason: string (why this video format works or doesn't)
       - suggestedTags: string[]
       - titleOptimizations: string[]
       - thumbnailStrategy: string
       - hookSuggestions: string[]
       - contentGaps: string[]`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_NOT_FOUND");
    }
    return null;
  }
}

export async function analyzeChannel(channelUrl: string, realData?: any) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  
  let context = "";
  if (realData) {
    context = `\nREAL DATA FOR CHANNEL AND RECENT VIDEOS:\n${JSON.stringify(realData, null, 2)}\n`;
  }

  const prompt = `Perform a deep analysis of this YouTube channel: "${channelUrl}". 
    ${context}
    
    CRITICAL: Use the provided REAL DATA for subscribers, views, and video performance. Identify "outliers" (videos performing 10x better than average).
    
    Return a JSON object with:
    - channelName: string
    - subscriberCount: string
    - totalViews: string
    - averageEngagement: string
    - videos: array of 10 objects { 
        id: string, 
        title: string, 
        views: number, 
        likes: number, 
        comments: number, 
        publishedAt: string, 
        thumbnail: string,
        isOutlier: boolean,
        engagementRate: number 
      }
    - growthTrend: array of 7 objects { date: string, views: number, subscribers: number }`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Gemini Channel Analysis Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_NOT_FOUND");
    }
    return null;
  }
}

export async function generateStudioContent(tool: string, prompt: string) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    
    return response.text;
  } catch (error: any) {
    console.error("Gemini Studio Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_NOT_FOUND");
    }
    return null;
  }
}
