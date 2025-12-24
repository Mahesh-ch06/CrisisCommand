
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Activity, Shield, Map as MapIcon, Users, AlertTriangle, Play, Square, History, Terminal } from 'lucide-react';
import { IncidentReport, ThreatLevel, AppState } from './types';
import { GeminiService } from './services/geminiService';
import ThreatMeter from './components/ThreatMeter';
import RecommendationCard from './components/RecommendationCard';

const gemini = new GeminiService();

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isMonitoring: false,
    history: [],
    currentReport: null,
    error: null,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<number | null>(null);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState(prev => ({ ...prev, isMonitoring: true, error: null }));
    } catch (err) {
      console.error("Camera access denied", err);
      setState(prev => ({ ...prev, error: "Unable to access camera. Please check permissions." }));
    }
  };

  const stopMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }
    setState(prev => ({ ...prev, isMonitoring: false }));
  };

  const performAnalysis = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !state.isMonitoring) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Capture frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    try {
      const report = await gemini.analyzeFeed(frameBase64);
      setState(prev => ({
        ...prev,
        currentReport: report,
        history: [report, ...prev.history].slice(0, 20),
      }));
    } catch (err) {
      console.error("Analysis failed", err);
    }
  }, [state.isMonitoring]);

  useEffect(() => {
    if (state.isMonitoring) {
      analysisIntervalRef.current = window.setInterval(performAnalysis, 5000);
    } else {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    }
    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [state.isMonitoring, performAnalysis]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-950">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-red-600 p-1.5 rounded-lg shadow-lg shadow-red-600/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-100 uppercase">CrisisCommand AI</h1>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${state.isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-[10px] mono text-slate-400 uppercase tracking-widest">
                {state.isMonitoring ? 'Autonomous Node Active' : 'System Standby'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {state.error && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900 px-3 py-1 rounded">
              {state.error}
            </div>
          )}
          <button
            onClick={state.isMonitoring ? stopMonitoring : startMonitoring}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-bold text-xs uppercase transition-all ${
              state.isMonitoring 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' 
                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
            }`}
          >
            {state.isMonitoring ? (
              <><Square className="w-4 h-4" /><span>Cease Operations</span></>
            ) : (
              <><Play className="w-4 h-4" /><span>Initialize Command</span></>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Feed & Analysis */}
        <section className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
          {/* Feed Display */}
          <div className="relative flex-1 bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover opacity-80"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* HUD Overlays */}
            {!state.isMonitoring && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                <div className="text-center">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-bounce" />
                  <p className="text-slate-400 mono text-sm">NO ACTIVE FEED DETECTED</p>
                  <button onClick={startMonitoring} className="mt-4 text-xs text-red-500 font-bold border border-red-500 px-4 py-2 hover:bg-red-500 hover:text-white transition-colors">START SIGNAL</button>
                </div>
              </div>
            )}

            {/* Corner Markers */}
            <div className="absolute top-4 left-4 border-l-2 border-t-2 border-red-500 w-8 h-8 opacity-40"></div>
            <div className="absolute top-4 right-4 border-r-2 border-t-2 border-red-500 w-8 h-8 opacity-40"></div>
            <div className="absolute bottom-4 left-4 border-l-2 border-b-2 border-red-500 w-8 h-8 opacity-40"></div>
            <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-red-500 w-8 h-8 opacity-40"></div>

            {/* Live Telemetry Overlay */}
            {state.isMonitoring && state.currentReport && (
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                <div className="bg-slate-950/80 border border-slate-800 p-2 rounded backdrop-blur">
                  <div className="text-[10px] text-slate-500 mono mb-1 uppercase tracking-widest">Incident Summary</div>
                  <div className="text-xs text-white max-w-sm">{state.currentReport.incident_summary}</div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <div className="bg-slate-950/80 border border-slate-800 p-2 rounded backdrop-blur text-right">
                    <div className="text-[10px] text-slate-500 mono mb-1 uppercase tracking-widest">Active Hazards</div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {state.currentReport.detected_hazards.map((h, i) => (
                        <span key={i} className="bg-red-900/40 text-red-400 text-[9px] px-1.5 py-0.5 border border-red-800 rounded">{h}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Incident Log Terminal */}
          <div className="h-48 shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mission Log</span>
              </div>
              <span className="text-[10px] mono text-slate-500">SECURE CHANNEL ALPHA-9</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 mono text-[11px]">
              {state.history.length === 0 ? (
                <div className="text-slate-600 italic">Listening for incident telemetry...</div>
              ) : (
                state.history.map((h, i) => (
                  <div key={i} className="flex space-x-4 border-l-2 border-slate-700 pl-4 py-1 hover:bg-slate-800/30 transition-colors">
                    <span className="text-slate-500">{new Date(h.timestamp).toLocaleTimeString()}</span>
                    <span className={`${h.threat_level === ThreatLevel.CRITICAL ? 'text-red-500 font-bold' : 'text-slate-300'}`}>
                      [{h.threat_level}]
                    </span>
                    <span className="text-slate-400">{h.incident_summary}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right Sidebar: Intelligence Dashboard */}
        <aside className="w-96 border-l border-slate-800 bg-slate-900/30 p-6 flex flex-col space-y-6 overflow-y-auto">
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-[0.2em] flex items-center space-x-2">
            <Activity className="w-4 h-4 text-red-500" />
            <span>Situational Intel</span>
          </h2>

          <ThreatMeter level={state.currentReport?.threat_level || ThreatLevel.LOW} />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-500 uppercase font-bold">Victims</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {state.currentReport?.victim_count_estimate ?? '--'}
              </div>
            </div>
            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MapIcon className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-500 uppercase font-bold">Risk Zone</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {state.currentReport?.geo_inference.risk_radius_meters ? `${state.currentReport.geo_inference.risk_radius_meters}m` : '--'}
              </div>
            </div>
          </div>

          {/* Location Context */}
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Location Inference</div>
            <p className="text-sm text-slate-300 italic">
              {state.currentReport?.geo_inference.location_description || "Awaiting visual triangulation..."}
            </p>
          </div>

          {/* Recommended Actions */}
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Tactical Recommendations</span>
              {state.currentReport && (
                <span className="px-2 py-0.5 bg-red-900/20 text-red-500 text-[10px] font-bold border border-red-900/50 rounded animate-pulse">
                  ACTIVE RESPONSES: {state.currentReport.recommended_actions.length}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {state.currentReport?.recommended_actions.length ? (
                state.currentReport.recommended_actions.map((action, i) => (
                  <RecommendationCard key={i} action={action} />
                ))
              ) : (
                <div className="text-center py-10 text-slate-600">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs italic">No tactical directives issued.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Persistent Status Bar */}
      <footer className="h-8 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-6 text-[10px] mono text-slate-500">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-slate-600">ENCRYPTION:</span>
            <span className="text-emerald-600">AES-256 ACTIVE</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-600">AI MODEL:</span>
            <span className="text-slate-400">GEMINI-3-FLASH</span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-slate-600">LATENCY:</span>
            <span className="text-emerald-600">~140ms</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Uptime:</span>
            <span className="text-slate-400">00:12:44:02</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
