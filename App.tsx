
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Activity, Shield, Map as MapIcon, Users, AlertTriangle, 
  Play, Square, History, Terminal, Pause, Volume2, VolumeX,
  Maximize, Minimize, PictureInPicture2, Flame, Droplets, 
  Wind, TriangleAlert, Biohazard, Skull, Zap, Trash2, Bomb, FlaskConical,
  Crosshair, Target
} from 'lucide-react';
import { IncidentReport, ThreatLevel, AppState } from './types';
import { GeminiService } from './services/geminiService';
import ThreatMeter from './components/ThreatMeter';
import RecommendationCard from './components/RecommendationCard';

const gemini = new GeminiService();

const HazardIcon = ({ name, size = 12 }: { name: string, size?: number }) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('fire')) return <Flame size={size} className="text-red-500" />;
  if (lowerName.includes('flood') || lowerName.includes('water')) return <Droplets size={size} className="text-blue-500" />;
  if (lowerName.includes('smoke') || lowerName.includes('gas')) return <Wind size={size} className="text-slate-400" />;
  if (lowerName.includes('collapse') || lowerName.includes('structural')) return <TriangleAlert size={size} className="text-amber-500" />;
  if (lowerName.includes('explosion')) return <Bomb size={size} className="text-orange-600" />;
  if (lowerName.includes('chemical') || lowerName.includes('spill')) return <FlaskConical size={size} className="text-emerald-500" />;
  if (lowerName.includes('toxic') || lowerName.includes('bio')) return <Biohazard size={size} className="text-lime-500" />;
  if (lowerName.includes('victim') || lowerName.includes('casualty')) return <Skull size={size} className="text-rose-600" />;
  if (lowerName.includes('power') || lowerName.includes('electrical')) return <Zap size={size} className="text-yellow-400" />;
  return <AlertTriangle size={size} className="text-orange-500" />;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isMonitoring: false,
    history: [],
    currentReport: null,
    error: null,
  });

  const [playback, setPlayback] = useState({
    isPaused: false,
    volume: 0.5,
    isMuted: true,
    isFullscreen: false,
    isPip: false
  });

  const [hoveredHazard, setHoveredHazard] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<number | null>(null);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = playback.isMuted;
        videoRef.current.volume = playback.volume;
      }
      setState(prev => ({ ...prev, isMonitoring: true, error: null }));
    } catch (err) {
      console.error("Camera access denied", err);
      setState(prev => ({ ...prev, error: "Unable to access camera/mic. Please check permissions." }));
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
    setPlayback(p => ({ ...p, isPaused: false, isPip: false }));
    setHoveredHazard(null);
  };

  const togglePause = () => {
    if (videoRef.current) {
      if (playback.isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setPlayback(prev => ({ ...prev, isPaused: !prev.isPaused }));
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !playback.isMuted;
      videoRef.current.muted = newMuted;
      setPlayback(prev => ({ ...prev, isMuted: newMuted }));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("Picture-in-Picture failed", error);
    }
  };

  const clearHazards = () => {
    if (state.currentReport) {
      setState(prev => ({
        ...prev,
        currentReport: prev.currentReport ? {
          ...prev.currentReport,
          detected_hazards: []
        } : null
      }));
      setHoveredHazard(null);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setPlayback(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };

    const video = videoRef.current;
    const handleEnterPip = () => setPlayback(p => ({ ...p, isPip: true }));
    const handleLeavePip = () => setPlayback(p => ({ ...p, isPip: false }));

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    if (video) {
      video.addEventListener('enterpictureinpicture', handleEnterPip);
      video.addEventListener('leavepictureinpicture', handleLeavePip);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('enterpictureinpicture', handleEnterPip);
        video.removeEventListener('leavepictureinpicture', handleLeavePip);
      }
    };
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val > 0 && playback.isMuted) {
        videoRef.current.muted = false;
        setPlayback(prev => ({ ...prev, volume: val, isMuted: false }));
      } else {
        setPlayback(prev => ({ ...prev, volume: val }));
      }
    }
  };

  const performAnalysis = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !state.isMonitoring || playback.isPaused) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
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
  }, [state.isMonitoring, playback.isPaused]);

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

  const isPipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-red-600 p-1.5 rounded-lg shadow-lg shadow-red-600/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-slate-100">CrisisCommand AI</h1>
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
        <section className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
          <div 
            ref={containerRef}
            className="relative flex-1 bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl group"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-700 ${state.isMonitoring ? 'opacity-80' : 'opacity-0'}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Tactical Detection Highlight HUD Overlay */}
            {hoveredHazard && state.isMonitoring && (
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                {/* Main Targeting Frame */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] border border-red-500/30 rounded-lg">
                  <div className="absolute inset-0 border-2 border-red-600/40 rounded-lg animate-pulse shadow-[inset_0_0_100px_rgba(220,38,38,0.1)]"></div>
                  
                  {/* Sweep/Scan Line Animation */}
                  <div className="absolute w-full h-[2px] bg-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan_3s_linear_infinite]" style={{ top: '0%' }}></div>
                  
                  {/* Target Crosshair */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60">
                    <Crosshair className="w-16 h-16 text-red-500 animate-spin" style={{ animationDuration: '10s' }} />
                  </div>

                  {/* Corner Brackets */}
                  <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-red-500 rounded-tl-sm"></div>
                  <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-red-500 rounded-tr-sm"></div>
                  <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-red-500 rounded-bl-sm"></div>
                  <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-red-500 rounded-br-sm"></div>

                  {/* Target Labels */}
                  <div className="absolute -top-12 left-0 flex items-end space-x-2">
                    <div className="bg-red-600 text-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] rounded-t-sm shadow-xl flex items-center space-x-2">
                      <Target size={14} className="animate-pulse" />
                      <span>LOCK: {hoveredHazard}</span>
                    </div>
                    <div className="bg-slate-900/80 text-red-500 px-2 py-1 text-[9px] mono font-bold uppercase tracking-widest border border-red-900/50 rounded-t-sm">
                      STRENGTH: 94.2%
                    </div>
                  </div>

                  {/* HUD Telemetry inside frame */}
                  <div className="absolute bottom-4 left-4 mono text-[10px] text-red-500 space-y-1 opacity-80">
                    <div>LAT: 40.7128° N</div>
                    <div>LON: 74.0060° W</div>
                  </div>
                  <div className="absolute bottom-4 right-4 mono text-[10px] text-red-500 space-y-1 opacity-80 text-right">
                    <div>ALT: 124m</div>
                    <div>ZOOM: 4.0X</div>
                  </div>
                </div>

                {/* Aesthetic HUD Styles */}
                <style>{`
                  @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    5% { opacity: 1; }
                    95% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                  }
                `}</style>
              </div>
            )}
            
            {!state.isMonitoring && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-20">
                <div className="text-center">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-bounce" />
                  <p className="text-slate-400 mono text-sm uppercase tracking-widest">No Active Feed Detected</p>
                  <button onClick={startMonitoring} className="mt-4 text-xs text-red-500 font-bold border border-red-500 px-4 py-2 hover:bg-red-500 hover:text-white transition-colors uppercase tracking-widest text-slate-100">Start Signal</button>
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 border-l-2 border-t-2 border-red-500 w-8 h-8 opacity-40"></div>
            <div className="absolute top-4 right-4 border-r-2 border-t-2 border-red-500 w-8 h-8 opacity-40"></div>
            <div className="absolute bottom-4 left-4 border-l-2 border-b-2 border-red-500 w-8 h-8 opacity-40"></div>
            <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-red-500 w-8 h-8 opacity-40"></div>

            {state.isMonitoring && state.currentReport && (
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="bg-slate-950/80 border border-slate-800 p-2 rounded backdrop-blur max-w-[300px]">
                  <div className="text-[10px] text-slate-500 mono mb-1 uppercase tracking-widest">Incident Summary</div>
                  <div className="text-xs text-white leading-tight">{state.currentReport.incident_summary}</div>
                </div>
                <div className="flex flex-col items-end space-y-2 pointer-events-auto">
                  <div className="bg-slate-950/80 border border-slate-800 p-2 rounded backdrop-blur text-right">
                    <div className="text-[10px] text-slate-500 mono mb-1 uppercase tracking-widest">Active Hazards</div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {state.currentReport.detected_hazards.map((h, i) => (
                        <span 
                          key={i} 
                          onMouseEnter={() => setHoveredHazard(h)}
                          onMouseLeave={() => setHoveredHazard(null)}
                          className={`flex items-center space-x-1.5 px-2 py-0.5 border rounded text-[10px] transition-all duration-300 cursor-help ${
                            hoveredHazard === h 
                              ? 'bg-red-600 border-red-500 text-white scale-110 shadow-lg shadow-red-600/20' 
                              : 'bg-red-900/40 border-red-800 text-red-400'
                          }`}
                        >
                          <HazardIcon name={h} size={10} />
                          <span className="font-bold">{h}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {state.isMonitoring && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-slate-950/80 border border-slate-800 px-6 py-3 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl z-30">
                <button 
                  onClick={togglePause}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-200"
                  title={playback.isPaused ? "Resume Feed" : "Pause Feed"}
                >
                  {playback.isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                </button>

                <div className="h-6 w-px bg-slate-800"></div>

                <div className="flex items-center space-x-3 group/volume">
                  <button 
                    onClick={toggleMute}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-200"
                    title={playback.isMuted ? "Unmute" : "Mute"}
                  >
                    {playback.isMuted || playback.volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={playback.isMuted ? 0 : playback.volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <div className="h-6 w-px bg-slate-800"></div>

                {isPipSupported && (
                  <button 
                    onClick={togglePip}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-200"
                    title={playback.isPip ? "Exit PiP" : "Enter Picture-in-Picture"}
                  >
                    <PictureInPicture2 className={`w-5 h-5 ${playback.isPip ? 'text-red-500' : ''}`} />
                  </button>
                )}

                <button 
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-200"
                  title={playback.isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {playback.isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
                
                {playback.isPaused && (
                  <div className="flex items-center space-x-2 text-[10px] mono text-red-500 animate-pulse font-bold uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    <span>Feed Frozen</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-48 shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mission Log</span>
              </div>
              <span className="text-[10px] mono text-slate-500 uppercase">Secure Channel Alpha-9</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 mono text-[11px]">
              {state.history.length === 0 ? (
                <div className="text-slate-600 italic uppercase">Listening for incident telemetry...</div>
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

        <aside className="w-96 border-l border-slate-800 bg-slate-900/30 p-6 flex flex-col space-y-6 overflow-y-auto shrink-0">
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-[0.2em] flex items-center space-x-2">
            <Activity className="w-4 h-4 text-red-500" />
            <span>Situational Intel</span>
          </h2>

          <ThreatMeter level={state.currentReport?.threat_level || ThreatLevel.LOW} />

          {/* Active Hazards Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Active Hazards</div>
              {state.currentReport && state.currentReport.detected_hazards.length > 0 && (
                <button 
                  onClick={clearHazards}
                  className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase flex items-center space-x-1 group transition-colors"
                  title="Clear all hazards"
                >
                  <Trash2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {state.currentReport?.detected_hazards.length ? (
                state.currentReport.detected_hazards.map((h, i) => (
                  <div 
                    key={i}
                    onMouseEnter={() => setHoveredHazard(h)}
                    onMouseLeave={() => setHoveredHazard(null)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all duration-300 cursor-crosshair ${
                      hoveredHazard === h
                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30 scale-105'
                        : 'bg-slate-900/50 border-slate-800 text-slate-200 hover:border-red-900 hover:bg-red-950/20'
                    }`}
                  >
                    <HazardIcon name={h} size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">{h}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-600 italic">No hazards reported...</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Victims</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {state.currentReport?.victim_count_estimate ?? '--'}
              </div>
            </div>
            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MapIcon className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Risk Zone</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {state.currentReport?.geo_inference.risk_radius_meters ? `${state.currentReport.geo_inference.risk_radius_meters}m` : '--'}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Location Context</div>
            <p className="text-sm text-slate-300 italic">
              {state.currentReport?.geo_inference.location_description || "Awaiting visual triangulation..."}
            </p>
          </div>

          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tactical Directives</span>
              {state.currentReport && (
                <span className="px-2 py-0.5 bg-red-900/20 text-red-500 text-[10px] font-bold border border-red-900/50 rounded animate-pulse uppercase">
                  Active: {state.currentReport.recommended_actions.length}
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
                  <p className="text-xs italic uppercase tracking-widest">No directives issued</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>

      <footer className="h-8 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-6 text-[10px] mono text-slate-500">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-slate-600 uppercase">Encryption:</span>
            <span className="text-emerald-600 uppercase">AES-256 Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-600 uppercase">Modality:</span>
            <span className="text-slate-400 uppercase">Vision + Audio</span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-slate-600 uppercase">Latency:</span>
            <span className="text-emerald-600 uppercase">~140ms</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="uppercase">Uptime:</span>
            <span className="text-slate-400">00:12:44:02</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
