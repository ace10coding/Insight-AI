import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Search, 
  TrendingUp, 
  BarChart3, 
  Zap, 
  Target, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Youtube,
  LineChart,
  PieChart,
  Settings,
  Bell,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Copy,
  Plus,
  X,
  Mail,
  Lock,
  Image,
  Key,
  Lightbulb,
  FileText,
  Scissors,
  RefreshCw,
  Wand2,
  Video,
  Clapperboard,
  Type,
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { cn } from './lib/utils';
import { analyzeVideo, analyzeChannel, generateStudioContent } from './services/gemini';

// Firebase Imports
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  collection, 
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Connection Test ---
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Firestore Error: Failed to get document because the client is offline. Please check your Firebase configuration.");
    }
  }
}
testConnection();

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-white/40 mb-6">We encountered an unexpected error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Mock Data ---
const MOCK_CHART_DATA = [
  { name: 'Day 1', views: 400, competitor: 2400 },
  { name: 'Day 2', views: 3000, competitor: 1398 },
  { name: 'Day 3', views: 2000, competitor: 9800 },
  { name: 'Day 4', views: 2780, competitor: 3908 },
  { name: 'Day 5', views: 1890, competitor: 4800 },
  { name: 'Day 6', views: 2390, competitor: 3800 },
  { name: 'Day 7', views: 3490, competitor: 4300 },
];

// --- Components ---

const Navbar = ({ onDashboardClick, isDashboard, onNavClick, onLoginClick, onSignUpClick, user, onLogout }: { onDashboardClick: () => void, isDashboard: boolean, onNavClick: (target: string) => void, onLoginClick: () => void, onSignUpClick: () => void, user: FirebaseUser | null, onLogout: () => void }) => (
  <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <Zap className="text-white w-5 h-5 fill-current" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Insight AI</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
        <button onClick={() => onNavClick('features')} className="hover:text-white transition-colors">Features</button>
        <button onClick={() => onNavClick('pricing')} className="hover:text-white transition-colors">Pricing</button>
        <button onClick={() => onNavClick('outliers')} className="hover:text-white transition-colors">Outliers</button>
        <button onClick={() => onNavClick('resources')} className="hover:text-white transition-colors">Resources</button>
      </div>

      <div className="flex items-center gap-4">
        {!user ? (
          <>
            <button onClick={onLoginClick} className="text-sm font-medium text-white/80 hover:text-white">Log in</button>
            <button 
              onClick={onSignUpClick}
              className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-white/90 transition-all"
            >
              Start Free Trial
            </button>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Bell className="w-5 h-5 text-white/60 cursor-pointer hover:text-white" />
            <button onClick={onLogout} className="text-white/60 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
              <User className="w-4 h-4 text-orange-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  </nav>
);

const Hero = ({ onStart }: { onStart: () => void }) => (
  <div className="relative pt-32 pb-20 px-4 overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-orange-500/10 blur-[120px] rounded-full" />
    </div>
    
    <div className="max-w-4xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-orange-400 mb-6">
          <Sparkles className="w-3 h-3" />
          <span>The #1 Alternative to VidIQ & Outlierkit</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
          Stop Guessing. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Start Dominating.</span>
        </h1>
        <p className="text-lg text-white/60 mb-10 max-w-2xl mx-auto">
          Insight AI uses advanced AI to reverse-engineer viral videos. Identify outliers, leverage high-performing tags, and optimize your content for 10x growth.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onStart}
            className="w-full sm:w-auto bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(249,115,22,0.3)]"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="w-full sm:w-auto bg-white/5 text-white border border-white/10 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">
            View Live Demo
          </button>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center justify-center gap-2 font-bold text-xl"><Youtube /> YouTube</div>
          <div className="flex items-center justify-center gap-2 font-bold text-xl"><TrendingUp /> Growth</div>
          <div className="flex items-center justify-center gap-2 font-bold text-xl"><BarChart3 /> Analytics</div>
          <div className="flex items-center justify-center gap-2 font-bold text-xl"><Zap /> Speed</div>
        </div>
      </motion.div>
    </div>
  </div>
);

const Pricing = ({ onSelect }: { onSelect: (plan: any) => void }) => (
  <section id="pricing" className="py-24 px-4 bg-white/2">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Better Features. Better Price.</h2>
        <p className="text-white/60">Why pay $99/mo for Outlierkit when you can get more for less?</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {[
          { name: 'Starter', price: '0', features: ['3 Analysis/day', 'Basic Tag Generator', 'SEO Score', 'Chrome Extension'] },
          { name: 'Pro', price: '17', popular: true, features: ['Unlimited Analysis', 'Competitor Outliers', 'AI Title Optimizer', 'Thumbnail A/B Strategy', 'Priority Support'] },
          { name: 'Agency', price: '47', features: ['Multi-channel Support', 'Team Collaboration', 'API Access', 'Custom Reports', 'Dedicated Manager'] }
        ].map((plan) => (
          <div 
            key={plan.name}
            className={cn(
              "p-8 rounded-3xl border transition-all duration-300",
              plan.popular ? "bg-orange-500/10 border-orange-500/50 scale-105" : "bg-white/5 border-white/10"
            )}
          >
            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">${plan.price}</span>
              <span className="text-white/40">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-orange-500" />
                  {f}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => onSelect(plan)}
              className={cn(
                "w-full py-3 rounded-xl font-bold transition-all",
                plan.popular ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              Choose {plan.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Onboarding = ({ onComplete }: { onComplete: (niche: string) => void }) => {
  const [niche, setNiche] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <h2 className="text-4xl font-bold mb-4">What will you make videos about?</h2>
        <p className="text-white/40 mb-8">This helps us personalize your insights.</p>
        
        <div className="relative mb-8">
          <input 
            type="text" 
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. Travel Tips"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl focus:outline-none focus:border-orange-500/50 transition-all text-center"
          />
          <p className="text-xs text-white/20 mt-4 italic">You can change this later</p>
        </div>

        <button 
          onClick={() => onComplete(niche)}
          disabled={!niche}
          className="w-full bg-orange-500 py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20"
        >
          Continue
        </button>
      </motion.div>
    </div>
  );
};

const Checkout = ({ plan, onComplete }: { plan: any, onComplete: () => void }) => {
  return (
    <div className="min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl font-bold mb-8 text-white">Complete your subscription</h2>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Card Number</label>
              <input type="text" placeholder="•••• •••• •••• ••••" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-orange-500/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Expiry</label>
                <input type="text" placeholder="MM/YY" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">CVC</label>
                <input type="text" placeholder="•••" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-orange-500/50" />
              </div>
            </div>
            <button 
              onClick={onComplete}
              className="w-full bg-orange-500 py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
            >
              Pay ${plan.price} & Start Growing
            </button>
            <p className="text-center text-xs text-white/20">Secure payment powered by Stripe</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-8 h-fit"
        >
          <h3 className="text-xl font-bold mb-6">Order Summary</h3>
          <div className="flex justify-between mb-4">
            <span className="text-white/60">{plan.name} Plan</span>
            <span className="font-bold">${plan.price}/mo</span>
          </div>
          <div className="border-t border-white/10 pt-4 mb-8">
            <div className="flex justify-between font-bold text-xl">
              <span>Total</span>
              <span>${plan.price}</span>
            </div>
          </div>
          <ul className="space-y-3">
            {plan.features.map((f: string) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/40">
                <CheckCircle2 className="w-4 h-4 text-orange-500" />
                {f}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

const Dashboard = ({ user }: { user: FirebaseUser }) => {
  const [mode, setMode] = useState<'video' | 'channel' | 'studio'>('video');
  const [videoUrl, setVideoUrl] = useState('');
  const [compUrl, setCompUrl] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [channelResult, setChannelResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const comparisonData = React.useMemo(() => {
    if (!analysisResult?.realData) return [];
    const target = analysisResult.realData.statistics;
    const comp = analysisResult.competitorData?.statistics;
    
    return [
      { name: 'Views', target: Number(target.viewCount), competitor: comp ? Number(comp.viewCount) : 0 },
      { name: 'Likes', target: Number(target.likeCount), competitor: comp ? Number(comp.likeCount) : 0 },
      { name: 'Comments', target: Number(target.commentCount), competitor: comp ? Number(comp.commentCount) : 0 },
    ];
  }, [analysisResult]);

  const calculateEarnings = (views: any) => {
    if (!views) return '$0';
    const v = Number(views);
    // SocialBlade-like estimation: $0.25 - $4.00 CPM
    const min = (v / 1000) * 0.25;
    const max = (v / 1000) * 4.00;
    
    const format = (num: number) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return Math.floor(num).toString();
    };

    return `$${format(min)} - $${format(max)}`;
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  // Creator Studio State
  const [studioTool, setStudioTool] = useState<'thumbnail' | 'keywords' | 'ideas' | 'script' | 'clips' | 'paraphrase'>('thumbnail');
  const [studioInput, setStudioInput] = useState('');
  const [studioResult, setStudioResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Channel Dashboard State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'views', direction: 'desc' });
  const [filterText, setFilterText] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'outliers' | 'crushing'>('all');

  const saveAnalysisToHistory = async (type: 'video' | 'channel', url: string, result: any) => {
    try {
      await addDoc(collection(db, 'analysis_history'), {
        uid: user.uid,
        type,
        url,
        result,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'analysis_history');
    }
  };

  const handleStudioAction = async () => {
    if (!studioInput) return;
    setIsGenerating(true);
    setStudioResult(null);
    
    try {
      let prompt = "";
      
      switch(studioTool) {
        case 'thumbnail':
          prompt = `As an expert YouTube Thumbnail Designer, generate 3 highly detailed, high-CTR thumbnail concepts for a video about: "${studioInput}". 
          For each concept, provide:
          1. Visual Composition: Describe the main subject, background, and focal point.
          2. Color Palette: Suggest high-contrast colors that pop.
          3. Text Overlay: Suggest catchy, short text (max 3 words) with font style.
          4. Psychological Trigger: Explain why this will make people click (curiosity, fear, desire, etc.).`;
          break;
        case 'keywords':
          prompt = `As a YouTube SEO Expert, research 20 high-performing keywords for a video about: "${studioInput}". 
          Provide:
          1. Primary Keyword: The main target.
          2. Secondary Keywords: 5 related terms.
          3. Long-tail Keywords: 5 specific phrases.
          4. LSI Keywords: 9 contextually related terms.
          Include estimated search volume (High/Medium/Low) and competition level for each.`;
          break;
        case 'ideas':
          prompt = `As a Viral Content Strategist, brainstorm 10 unique, high-potential video ideas related to: "${studioInput}". 
          For each idea:
          1. Catchy Title: Optimized for CTR.
          2. The Hook: A 5-second opening that guarantees retention.
          3. Unique Angle: Why this is different from existing content.
          4. Virality Factor: What makes this shareable?`;
          break;
        case 'script':
          prompt = `As a Professional YouTube Scriptwriter, write a detailed script outline for a 10-minute video about: "${studioInput}". 
          Include:
          1. The Hook (0:00-0:30): High-tension opening.
          2. The Intro: Setting expectations.
          3. Main Content Blocks: 4-5 detailed sections with key talking points.
          4. Engagement Triggers: Where to ask for likes/subs.
          5. The Outro: Strong CTA and "Watch Next" bridge.`;
          break;
        case 'clips':
          prompt = `As a Short-Form Content Expert, identify 5 viral "Shorts/TikTok" moments from a long video about: "${studioInput}". 
          For each clip:
          1. Start/End Concept: What happens in the clip.
          2. Viral Caption: On-screen text.
          3. Trending Audio Style: Type of music/SFX to use.
          4. Loop Strategy: How to make it loop seamlessly.`;
          break;
        case 'paraphrase':
          prompt = `As a Creative Copywriter, paraphrase and humanize the following text to make it sound more professional, engaging, and "YouTube-native": "${studioInput}". 
          Provide 3 variations:
          1. Professional & Authoritative.
          2. Casual & Friendly.
          3. High-Energy & Exciting.`;
          break;
      }

      const result = await generateStudioContent(studioTool, prompt);
      
      if (result) {
        setStudioResult(result);
        await saveAnalysisToHistory('video', `studio:${studioTool}`, { input: studioInput, output: result });
      } else {
        setStudioResult("No results generated.");
      }
    } catch (error: any) {
      console.error("Studio Error:", error);
      setStudioResult("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!videoUrl) return;
    setIsAnalyzing(true);
    try {
      // Fetch real YouTube data from backend
      const videoResponse = await fetch(`/api/youtube/video?url=${encodeURIComponent(videoUrl)}`);
      const videoData = await videoResponse.json();
      
      if (videoData.error) throw new Error(videoData.error);

      let compData = null;
      if (compUrl) {
        const compResponse = await fetch(`/api/youtube/video?url=${encodeURIComponent(compUrl)}`);
        compData = await compResponse.json();
        if (compData.error) console.warn("Competitor data fetch error:", compData.error);
      }

      const result = await analyzeVideo(videoUrl, compUrl || undefined, videoData, compData);
      
      if (result) {
        // Merge real data into result for UI display
        const mergedResult = {
          ...result,
          realData: videoData,
          competitorData: compData
        };
        
        setAnalysisResult(mergedResult);
        await saveAnalysisToHistory('video', videoUrl, mergedResult);
      }
    } catch (error: any) {
      console.error("Analysis Error:", error);
      // Silent fail or internal error state instead of alert/prompt
      setAnalysisResult({ error: "Analysis failed. Please check the URL and try again." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeChannel = async () => {
    if (!channelUrl) return;
    setIsAnalyzing(true);
    try {
      const channelResponse = await fetch(`/api/youtube/channel?url=${encodeURIComponent(channelUrl)}`);
      const channelData = await channelResponse.json();
      
      if (channelData.error) throw new Error(channelData.error);

      const result = await analyzeChannel(channelUrl, channelData);
      
      if (result) {
        // Merge real data
        const mergedResult = {
          ...result,
          realData: channelData
        };
        
        setChannelResult(mergedResult);
        await saveAnalysisToHistory('channel', channelUrl, mergedResult);
      }
    } catch (error: any) {
      console.error("Channel Analysis Error:", error);
      // Silent fail or internal error state instead of alert/prompt
      setChannelResult({ error: "Channel analysis failed. Please check the URL and try again." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredAndSortedVideos = React.useMemo(() => {
    if (!channelResult?.videos) return [];
    let items = [...channelResult.videos];
    
    if (filterText) {
      items = items.filter(v => v.title.toLowerCase().includes(filterText.toLowerCase()));
    }

    if (channelFilter === 'outliers') {
      items = items.filter(v => v.isOutlier);
    } else if (channelFilter === 'crushing') {
      // Mock "crushing it" - high engagement + recent (simulated by id)
      items = items.filter(v => v.engagementRate > 7 && v.id % 2 === 0);
    }

    items.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [channelResult, sortConfig, filterText, channelFilter]);

  const handleExport = () => {
    if (!channelResult) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(channelResult, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${channelResult.channelName}_report.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      {/* Mode Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/5 p-1 rounded-2xl border border-white/10 flex flex-wrap justify-center gap-1 md:gap-0">
          <button 
            onClick={() => { setMode('video'); setAnalysisResult(null); setChannelResult(null); }}
            className={cn(
              "px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all",
              mode === 'video' ? "bg-orange-500 text-white shadow-lg" : "text-white/40 hover:text-white/60"
            )}
          >
            Video Analysis
          </button>
          <button 
            onClick={() => { setMode('channel'); setMode('channel'); setAnalysisResult(null); setChannelResult(null); }}
            className={cn(
              "px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all",
              mode === 'channel' ? "bg-orange-500 text-white shadow-lg" : "text-white/40 hover:text-white/60"
            )}
          >
            Channel Analysis
          </button>
          <button 
            onClick={() => { setMode('studio'); setAnalysisResult(null); setChannelResult(null); }}
            className={cn(
              "px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all",
              mode === 'studio' ? "bg-orange-500 text-white shadow-lg" : "text-white/40 hover:text-white/60"
            )}
          >
            Creator Studio
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {mode === 'video' && <Search className="w-5 h-5 text-orange-500" />}
                {mode === 'channel' && <BarChart3 className="w-5 h-5 text-orange-500" />}
                {mode === 'studio' && <Wand2 className="w-5 h-5 text-orange-500" />}
                {mode === 'video' ? 'Analyze Video' : mode === 'channel' ? 'Analyze Channel' : 'Creator Studio'}
              </div>
            </h2>
            
            <div className="space-y-4">
              {mode === 'video' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">Your Video Link</label>
                    <div className="relative">
                      <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="text" 
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">Competitor Link (Optional)</label>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="text" 
                        placeholder="Compare with another video..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all"
                        value={compUrl}
                        onChange={(e) => setCompUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAnalyzeVideo}
                    disabled={isAnalyzing || !videoUrl}
                    className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
                    {isAnalyzing ? 'Analyzing...' : 'Get Insights'}
                  </button>
                </>
              ) : mode === 'channel' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">Channel URL</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="text" 
                        placeholder="https://youtube.com/@channel"
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all"
                        value={channelUrl}
                        onChange={(e) => setChannelUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAnalyzeChannel}
                    disabled={isAnalyzing || !channelUrl}
                    className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Channel'}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'thumbnail', label: 'Thumbnail', icon: Image },
                      { id: 'keywords', label: 'Keywords', icon: Key },
                      { id: 'ideas', label: 'Ideas', icon: Lightbulb },
                      { id: 'script', label: 'Script', icon: FileText },
                      { id: 'clips', label: 'Clips', icon: Scissors },
                      { id: 'paraphrase', label: 'Paraphrase', icon: RefreshCw },
                    ].map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => setStudioTool(tool.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-wider",
                          studioTool === tool.id 
                            ? "bg-orange-500/20 border-orange-500 text-orange-500" 
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                        )}
                      >
                        <tool.icon className="w-5 h-5" />
                        {tool.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">
                      {studioTool === 'paraphrase' ? 'Text to Paraphrase' : 'Video Topic / Description'}
                    </label>
                    <textarea 
                      rows={4}
                      placeholder={studioTool === 'paraphrase' ? "Paste your text here..." : "What is your video about?"}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all resize-none"
                      value={studioInput}
                      onChange={(e) => setStudioInput(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleStudioAction}
                    disabled={isGenerating || !studioInput}
                    className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isGenerating ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {(analysisResult || channelResult) && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-6">
              <div className="flex items-center gap-2 text-orange-500 mb-4">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold">AI Recommendation</h3>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                {mode === 'video' ? analysisResult?.outlierReason : `Based on ${channelResult?.channelName}'s data, the channel is currently seeing a ${channelResult?.averageEngagement} engagement rate. Focus on replicating the "Outlier" videos identified in the list.`}
              </p>
            </div>
          )}
        </div>

        {/* Main Dashboard Area */}
        <div className="lg:col-span-8 space-y-6">
          {isAnalyzing || isGenerating ? (
            <div className="h-[600px] bg-white/5 rounded-3xl animate-pulse flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/40 font-medium">
                  {isAnalyzing 
                    ? 'Performing deep content & metadata analysis...' 
                    : 'AI is crafting your content...'}
                </p>
                {isAnalyzing && (
                  <p className="text-[10px] text-white/20 mt-2 uppercase tracking-widest animate-pulse">
                    Comparing tags, pacing, and engagement drivers...
                  </p>
                )}
              </div>
            </div>
          ) : mode === 'video' ? (
            analysisResult ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Views', value: analysisResult.realData?.statistics?.viewCount ? Number(analysisResult.realData.statistics.viewCount).toLocaleString() : 'N/A', icon: Eye, color: 'text-blue-400' },
                    { label: 'Likes', value: analysisResult.realData?.statistics?.likeCount ? Number(analysisResult.realData.statistics.likeCount).toLocaleString() : 'N/A', icon: Heart, color: 'text-red-400' },
                    { label: 'Comments', value: analysisResult.realData?.statistics?.commentCount ? Number(analysisResult.realData.statistics.commentCount).toLocaleString() : 'N/A', icon: MessageCircle, color: 'text-green-400' },
                    { label: 'SEO Score', value: analysisResult.seoScore || 85, icon: Search, color: 'text-purple-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className={cn("w-4 h-4", stat.color)} />
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Live</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-white/40">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Chart Section */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-orange-500" />
                      Live Data Comparison
                    </h3>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <div className="w-2 h-2 rounded-full bg-orange-500" /> Your Video
                      </div>
                      {compUrl && (
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <div className="w-2 h-2 rounded-full bg-blue-500" /> Competitor
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData}>
                        <XAxis dataKey="name" stroke="#ffffff20" fontSize={12} />
                        <YAxis stroke="#ffffff20" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="target" fill="#f97316" radius={[4, 4, 0, 0]} name="Your Video" />
                        {compUrl && <Bar dataKey="competitor" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Competitor" />}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Insights Tabs */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="flex border-b border-white/10">
                    {['overview', 'tags', 'titles', 'comparison'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-6 py-4 text-sm font-bold capitalize transition-all",
                          activeTab === tab ? "text-orange-500 border-b-2 border-orange-500 bg-orange-500/5" : "text-white/40 hover:text-white/60"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  {activeTab === 'overview' && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-orange-500" />
                            Recommended Hooks
                          </h4>
                          <div className="grid gap-3">
                            {analysisResult.hookSuggestions?.map((hook: string, i: number) => (
                              <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center justify-between group">
                                <span className="text-sm text-white/80 italic">"{hook}"</span>
                                <Copy className="w-4 h-4 text-white/20 group-hover:text-white cursor-pointer transition-colors" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            Content Gaps
                          </h4>
                          <div className="grid gap-3">
                            {analysisResult.contentGaps?.map((gap: string, i: number) => (
                              <div key={i} className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl text-sm text-white/80 flex items-start gap-3">
                                <span className="text-orange-500 font-bold">#{i+1}</span>
                                {gap}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab === 'tags' && (
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.suggestedTags?.map((tag: string) => (
                          <div key={tag} className="bg-orange-500/10 border border-orange-500/30 text-orange-500 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                            {tag} <Plus className="w-3 h-3 cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    )}
                    {activeTab === 'titles' && (
                      <div className="space-y-4">
                        {analysisResult.titleOptimizations?.map((title: string, i: number) => (
                          <div key={i} className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between group">
                            <span className="text-sm font-medium text-white">{title}</span>
                            <Copy className="w-4 h-4 text-white/20 group-hover:text-white cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    )}
                    {activeTab === 'comparison' && (
                      <div className="space-y-4">
                        {!compUrl ? <div className="text-center py-12 text-white/40">Add a competitor link to see side-by-side comparison.</div> : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/10">
                                  <th className="pb-4">Metric</th>
                                  <th className="pb-4">Your Video</th>
                                  <th className="pb-4">Competitor</th>
                                  <th className="pb-4">Verdict</th>
                                  <th className="pb-4">Insight</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm">
                                {analysisResult.comparisonPoints?.map((point: any, i: number) => (
                                  <tr key={i} className="border-b border-white/5">
                                    <td className="py-4 font-medium text-white/60">{point.aspect}</td>
                                    <td className="py-4 text-white">{point.myVideo}</td>
                                    <td className="py-4 text-white">{point.competitor}</td>
                                    <td className="py-4">
                                      <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", point.winner === 'me' ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500")}>
                                        {point.winner === 'me' ? 'Winning' : 'Losing'}
                                      </span>
                                    </td>
                                    <td className="py-4 text-white/40 text-xs italic">{point.insight}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="h-[600px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-12">
                  <BarChart3 className="w-10 h-10 text-white/20 mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-2">Ready to grow?</h3>
                  <p className="text-white/40 max-w-md">Enter a video link on the left to see deep analytics.</p>
                </div>
              )
            ) : mode === 'channel' ? (
              channelResult ? (
                channelResult.error ? (
                <div className="h-[600px] border-2 border-dashed border-red-500/20 rounded-3xl flex flex-col items-center justify-center text-center p-12">
                  <AlertCircle className="w-10 h-10 text-red-500 mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-2">Analysis Failed</h3>
                  <p className="text-white/40 max-w-md">{channelResult.error}</p>
                  <button 
                    onClick={() => setChannelResult(null)}
                    className="mt-6 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {/* Channel Header */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center text-4xl font-bold overflow-hidden">
                      {channelResult.realData?.channel?.snippet?.thumbnails?.high?.url ? (
                        <img src={channelResult.realData.channel.snippet.thumbnails.high.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (channelResult.channelName?.[0] || '?')}
                    </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-3xl font-bold text-white mb-2">{channelResult.channelName}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-white/40">
                      <span className="flex items-center gap-1"><User className="w-4 h-4" /> {channelResult.realData?.channel?.statistics?.subscriberCount ? Number(channelResult.realData.channel.statistics.subscriberCount).toLocaleString() : channelResult.subscriberCount} Subscribers</span>
                      <span className="flex items-center gap-1"><Youtube className="w-4 h-4" /> {channelResult.realData?.channel?.statistics?.viewCount ? Number(channelResult.realData.channel.statistics.viewCount).toLocaleString() : channelResult.totalViews} Total Views</span>
                      <span className="flex items-center gap-1 text-orange-500"><TrendingUp className="w-4 h-4" /> {channelResult.averageEngagement} Engagement</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleExport}
                    className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl font-bold hover:bg-white/10 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Export Data
                  </button>
                </div>

                {/* Channel Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Subscribers', value: channelResult.realData?.channel?.statistics?.subscriberCount ? Number(channelResult.realData.channel.statistics.subscriberCount).toLocaleString() : 'N/A', icon: User, color: 'text-blue-400' },
                    { label: 'Total Views', value: channelResult.realData?.channel?.statistics?.viewCount ? Number(channelResult.realData.channel.statistics.viewCount).toLocaleString() : 'N/A', icon: Eye, color: 'text-orange-400' },
                    { label: 'Videos', value: channelResult.realData?.channel?.statistics?.videoCount ? Number(channelResult.realData.channel.statistics.videoCount).toLocaleString() : 'N/A', icon: Youtube, color: 'text-red-400' },
                    { label: 'Est. Earnings', value: calculateEarnings(channelResult.realData?.channel?.statistics?.viewCount), icon: DollarSign, color: 'text-green-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className={cn("w-4 h-4", stat.color)} />
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Live</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-white/40">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Video List with Sorting/Filtering */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">Performance Intelligence</h3>
                      <div className="flex gap-1">
                        {(['all', 'outliers', 'crushing'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setChannelFilter(f)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                              channelFilter === f 
                                ? "bg-orange-500 text-white" 
                                : "bg-white/5 text-white/40 hover:bg-white/10"
                            )}
                          >
                            {f === 'all' ? 'All' : f === 'outliers' ? 'Outliers' : 'Crushing It'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input 
                          type="text" 
                          placeholder="Filter by title..."
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none"
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                        />
                      </div>
                      <select 
                        className="bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none"
                        onChange={(e) => setSortConfig({ key: e.target.value, direction: 'desc' })}
                      >
                        <option value="views">Views</option>
                        <option value="likes">Likes</option>
                        <option value="engagementRate">Engagement</option>
                        <option value="publishedAt">Date</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/10">
                          <th className="pb-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('title')}>Video</th>
                          <th className="pb-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('views')}>Views</th>
                          <th className="pb-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('engagementRate')}>Engagement</th>
                          <th className="pb-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredAndSortedVideos.map((video: any) => (
                          <tr key={video.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-20 h-12 bg-white/5 rounded-lg overflow-hidden shrink-0">
                                  <img src={video.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <span className="font-medium text-white line-clamp-1">{video.title}</span>
                              </div>
                            </td>
                            <td className="py-4 text-white">{video.views.toLocaleString()}</td>
                            <td className="py-4 text-white">{video.engagementRate}%</td>
                            <td className="py-4">
                              {video.isOutlier ? (
                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-orange-500/10 text-orange-500 flex items-center gap-1 w-fit">
                                  <TrendingUp className="w-3 h-3" /> Outlier
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-white/5 text-white/40">Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-[600px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-12">
                <BarChart3 className="w-10 h-10 text-white/20 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">Analyze a Channel</h3>
                <p className="text-white/40 max-w-md">Enter a channel URL to see full performance data and outlier videos.</p>
              </div>
            )
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                      {studioTool === 'thumbnail' && <Image className="w-5 h-5 text-orange-500" />}
                      {studioTool === 'keywords' && <Key className="w-5 h-5 text-orange-500" />}
                      {studioTool === 'ideas' && <Lightbulb className="w-5 h-5 text-orange-500" />}
                      {studioTool === 'script' && <FileText className="w-5 h-5 text-orange-500" />}
                      {studioTool === 'clips' && <Scissors className="w-5 h-5 text-orange-500" />}
                      {studioTool === 'paraphrase' && <RefreshCw className="w-5 h-5 text-orange-500" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white capitalize">{studioTool.replace(/([A-Z])/g, ' $1').trim()} Assistant</h3>
                      <p className="text-xs text-white/40">Powered by Gemini AI</p>
                    </div>
                  </div>
                  {studioResult && (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(studioResult);
                      }}
                      className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" /> Copy All
                    </button>
                  )}
                </div>

                <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-6 overflow-y-auto max-h-[500px] custom-scrollbar">
                  {studioResult ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-white/80 leading-relaxed font-mono text-sm">
                        {studioResult}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/20">
                      <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                      <p className="max-w-xs">Select a tool and enter your topic to generate AI-powered creator assets.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const LoginModal = ({ isOpen, onClose, initialSignUp = false }: { isOpen: boolean, onClose: () => void, initialSignUp?: boolean }) => {
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          createdAt: serverTimestamp(),
          plan: 'Starter'
        });
      }
      onClose();
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError(
          'Authentication method not enabled. Please go to the Firebase Console > Authentication > Sign-in method and enable "Google".'
        );
      } else {
        setError(err.message || 'An error occurred with Google Sign-In.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialSignUp);
      setIsForgotPassword(false);
      setError('');
      setMessage('');
    }
  }, [isOpen, initialSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address (e.g., name@example.com).');
      return;
    }

    setIsLoading(true);

    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent! Check your inbox.');
      } else if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          createdAt: serverTimestamp(),
          plan: 'Starter'
        });
        onClose();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError(
          'Authentication method not enabled. Please go to the Firebase Console > Authentication > Sign-in method and enable "Email/Password".'
        );
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
            <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-orange-500 w-6 h-6 fill-current" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
              </h3>
              <p className="text-white/40 text-sm mt-2">
                {isForgotPassword 
                  ? 'Enter your email to receive a reset link' 
                  : isSignUp 
                    ? 'Join Insight AI and start growing' 
                    : 'Enter your credentials to access Insight AI'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-2 text-red-500 text-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
                {error.includes('Firebase Console') && (
                  <a 
                    href="https://console.firebase.google.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 text-xs font-bold underline hover:text-red-400 flex items-center gap-1"
                  >
                    Go to Firebase Console <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {message && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-500 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-colors" 
                    placeholder="name@company.com"
                  />
                </div>
              </div>
              
              {!isForgotPassword && (
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-sm focus:outline-none focus:border-orange-500/50 transition-colors" 
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              
              {!isSignUp && !isForgotPassword && (
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-white/40 cursor-pointer">
                    <input type="checkbox" className="rounded border-white/10 bg-white/5" defaultChecked />
                    Remember me
                  </label>
                  <button 
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-orange-500 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {isForgotPassword && (
                <button 
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-xs text-orange-500 hover:underline block mx-auto"
                >
                  Back to Sign In
                </button>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Start Free Trial' : 'Sign In'}
              </button>
            </form>

            {!isForgotPassword && (
              <>
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#111] px-2 text-white/20 tracking-widest">Or continue with</span>
                  </div>
                </div>

                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
              </>
            )}

            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <p className="text-sm text-white/40">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"} 
                <button 
                  onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); }}
                  className="text-white hover:underline ml-1"
                >
                  {isSignUp ? 'Sign In' : 'Start free trial'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [view, setView] = useState<'landing' | 'onboarding' | 'checkout' | 'dashboard'>('landing');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userNiche, setUserNiche] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showWelcomeEmail, setShowWelcomeEmail] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginModalInitialSignUp, setLoginModalInitialSignUp] = useState(false);

  const openLogin = () => {
    setLoginModalInitialSignUp(false);
    setIsLoginOpen(true);
  };

  const openSignUp = () => {
    setLoginModalInitialSignUp(true);
    setIsLoginOpen(true);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user profile
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserNiche(data.niche || '');
            setSelectedPlan(data.plan ? { name: data.plan } : null);
            setView('dashboard');
          } else {
            // New user, maybe they haven't finished onboarding
            if (view === 'landing') setView('onboarding');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setView('landing');
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setIsSubscribing(true);
    try {
      await setDoc(doc(db, 'newsletter_subscriptions', newsletterEmail), {
        email: newsletterEmail,
        subscribedAt: serverTimestamp()
      });
      setShowWelcomeEmail(true);
      setNewsletterEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'newsletter_subscriptions');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('landing');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    if (user) {
      setView('onboarding');
    } else {
      openSignUp();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOnboardingComplete = async (niche: string) => {
    setUserNiche(niche);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          niche
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    setView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckoutComplete = async () => {
    if (user && selectedPlan) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          plan: selectedPlan.name
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (target: string) => {
    if (view !== 'landing') {
      setView('landing');
      setTimeout(() => {
        const element = document.getElementById(target);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(target);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500/30">
        <Navbar 
          onDashboardClick={() => setView('dashboard')} 
          isDashboard={view === 'dashboard'} 
          onNavClick={handleNavClick}
          onLoginClick={openLogin}
          onSignUpClick={openSignUp}
          user={user}
          onLogout={handleLogout}
        />

        <LoginModal 
          isOpen={isLoginOpen} 
          onClose={() => setIsLoginOpen(false)} 
          initialSignUp={loginModalInitialSignUp}
        />
        
        <AnimatePresence mode="wait">
          {view === 'landing' ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Hero onStart={() => user ? setView('dashboard') : openSignUp()} />
              <div id="features" className="max-w-7xl mx-auto px-4 py-20">
                <div className="grid md:grid-cols-3 gap-12">
                  <div id="outliers" className="space-y-4">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                      <TrendingUp className="text-orange-500 w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">Outlier Detection</h3>
                    <p className="text-white/40 leading-relaxed">Our AI scans millions of videos to find "outliers", which are videos that performed ten times better than the channel's average.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                      <Target className="text-blue-500 w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">Strategic Benchmarking</h3>
                    <p className="text-white/40 leading-relaxed">Analyze competitor performance patterns to identify high-growth opportunities and proven content structures in your niche.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                      <Sparkles className="text-purple-500 w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">AI Optimization</h3>
                    <p className="text-white/40 leading-relaxed">Get instant title variations and hook suggestions generated by Gemini AI tailored to your specific niche.</p>
                  </div>
                </div>
              </div>
              <Pricing onSelect={handlePlanSelect} />
              
              <section id="resources" className="py-24 px-4 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="max-w-xl">
                      <h2 className="text-3xl font-bold mb-6">Creator Resources</h2>
                      <p className="text-white/60 mb-8">Access our exclusive library of viral hooks, thumbnail templates, and niche-specific growth playbooks.</p>
                      <div className="grid grid-cols-2 gap-4">
                        {['Viral Hook Library', 'SEO Playbook', 'Thumbnail Kit', 'Niche Reports'].map(item => (
                          <div key={item} className="flex items-center gap-2 text-sm text-white/80">
                            <CheckCircle2 className="w-4 h-4 text-orange-500" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="w-full md:w-80 bg-white/5 border border-white/10 p-8 rounded-3xl">
                      <h3 className="font-bold mb-4">Join our Newsletter</h3>
                      <p className="text-xs text-white/40 mb-6">Get weekly outlier reports and AI growth tips delivered to your inbox.</p>
                      <form onSubmit={handleSubscribe}>
                        <input 
                          type="email" 
                          required
                          placeholder="Email address" 
                          value={newsletterEmail}
                          onChange={(e) => setNewsletterEmail(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm mb-4 focus:outline-none focus:border-orange-500/50" 
                        />
                        <button 
                          type="submit"
                          disabled={isSubscribing}
                          className="w-full bg-orange-500 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                        >
                          {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </section>

              <AnimatePresence>
                {showWelcomeEmail && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
                    >
                      <div className="flex items-center gap-3 text-orange-500 mb-6">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                          <Bell className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold">Welcome Email Sent!</h3>
                      </div>
                      
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-6">
                        <div className="text-xs text-white/20 uppercase tracking-widest mb-4 flex items-center justify-between">
                          <span>Email Preview</span>
                          <span className="text-[10px] bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded">Mailchimp Synced</span>
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Welcome to Insight AI! 🚀</h4>
                        <p className="text-sm text-white/60 leading-relaxed">
                          Hey there! Thanks for joining the Insight AI inner circle. <br /><br />
                          You're now part of an elite group of creators using AI to dominate the algorithm. Every Tuesday, we'll send you: <br /><br />
                          • Top 5 Outlier Videos in the tech niche <br />
                          • 10 High-CTR Title Templates <br />
                          • Exclusive AI Hook Strategies <br /><br />
                          Ready to grow? Head back to your dashboard and start analyzing.
                        </p>
                      </div>

                      <button 
                        onClick={() => setShowWelcomeEmail(false)}
                        className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-white/90 transition-all"
                      >
                        Got it, thanks!
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <footer className="py-12 border-t border-white/10 text-center text-white/20 text-sm">
                &copy; 2026 VidMetrics. All rights reserved. Built for creators.
              </footer>
            </motion.div>
          ) : view === 'onboarding' ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Onboarding onComplete={handleOnboardingComplete} />
            </motion.div>
          ) : view === 'checkout' ? (
            <motion.div
              key="checkout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Checkout plan={selectedPlan} onComplete={handleCheckoutComplete} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {user && <Dashboard user={user} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
