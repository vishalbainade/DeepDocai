import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Radio, 
  Brain, 
  Globe, 
  Sparkles, 
  ChevronDown, 
  Square, 
  MessageSquare, 
  ChevronRight,
  ExternalLink,
  Send,
  AlertCircle,
  PhoneOff
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { sendLiveAudioDialog } from '../services/api';

const LIVE_AUDIO_MODELS = [
  { id: 'gemini-3.8-live-extended-thinking', name: 'Gemini 3.8 Live Extended Thinking', badge: 'Flagship Thinking', color: 'text-amber-400' },
  { id: 'gemini-3.8-live', name: 'Gemini 3.8 Live', badge: 'Ultra Fast', color: 'text-emerald-400' },
  { id: 'gemini-3-flash-live', name: 'Gemini 3 Flash Live', badge: 'Next-Gen', color: 'text-cyan-400' },
  { id: 'gemini-2.5-flash-native-audio-dialog', name: 'Gemini 2.5 Flash Native Audio Dialog', badge: 'Native Audio', color: 'text-blue-400' },
];

const QUICK_PROMPTS = [
  'Summarize the core obligations',
  'What are the key liability risks?',
  'Explain termination provisions',
  'Check compliance with governing law',
];

const LiveAudioModal = ({ isOpen, onClose }) => {
  const { currentDocumentId } = useChat();

  const [selectedAudioModel, setSelectedAudioModel] = useState('gemini-3.8-live-extended-thinking');
  const [thinkingMode, setThinkingMode] = useState(true);
  const [groundingMode, setGroundingMode] = useState(true);

  // 'ready' | 'listening' | 'thinking' | 'speaking'
  const [status, setStatus] = useState('ready');
  const [micPermissionError, setMicPermissionError] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiThought, setAiThought] = useState('');
  const [webSources, setWebSources] = useState([]);
  const [dialogHistory, setDialogHistory] = useState([]);

  const [textInput, setTextInput] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const transcriptBufferRef = useRef('');

  // ─── Play Acoustic Sound Chimes ─────────────────────────────────
  const playAudioTone = (type = 'start') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'start') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'reply') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'interrupt') {
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // AudioContext unavailable
    }
  };

  // ─── Setup Web Audio Analyser for Visual Waveform ───────────────
  const setupAudioAnalyser = async () => {
    try {
      if (micStreamRef.current) return true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicPermissionError(null);

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(avg / 255);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
      return true;
    } catch (err) {
      console.warn('Microphone permission or analyser error:', err.message);
      setMicPermissionError(err.message.includes('Permission') ? 'Microphone permission denied. Click Orb or allow mic access in browser.' : 'Microphone unavailable.');
      return false;
    }
  };

  const cleanupAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // ─── Start / Stop Speech Recognition ────────────────────────────
  const startListening = () => {
    if (isMicMuted || isSpeakingRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('ready');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (!isSpeakingRef.current) {
          setStatus('listening');
          setMicPermissionError(null);
        }
      };

      recognition.onresult = (event) => {
        if (isSpeakingRef.current) {
          handleInterrupt();
        }

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentSpeech = (final || interim).trim();
        if (currentSpeech) {
          transcriptBufferRef.current = currentSpeech;
          setUserTranscript(currentSpeech);
          setStatus('listening');

          // Reset silence timer: when speaker pauses for 1.5s, auto-send turn!
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            const buffered = transcriptBufferRef.current.trim();
            if (buffered && !isSpeakingRef.current) {
              handleSendTurn(buffered);
            }
          }, 1500);
        }

        if (final && final.trim()) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          handleSendTurn(final.trim());
        }
      };

      recognition.onerror = (e) => {
        if (e.error === 'not-allowed') {
          setMicPermissionError('Microphone permission blocked. Please allow mic access in your browser address bar.');
          setStatus('ready');
        } else if (e.error === 'no-speech') {
          // Normal silence, keep listening
        } else {
          console.warn('SpeechRecognition status note:', e.error);
        }
      };

      recognition.onend = () => {
        if (isOpen && !isMicMuted && !isSpeakingRef.current && status === 'listening') {
          try {
            recognition.start();
          } catch {
            // Already restarted
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      playAudioTone('start');
      setupAudioAnalyser();
    } catch (err) {
      console.warn('Speech recognition start note:', err.message);
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  };

  const stopAllVoice = () => {
    stopListening();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    cleanupAudioAnalyser();
    setStatus('ready');
  };

  // Warm up voices and lifecycle on modal mount
  useEffect(() => {
    if (!isOpen) {
      stopAllVoice();
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.getVoices();
    }

    // Start listening on mount
    startListening();

    return () => {
      stopAllVoice();
    };
  }, [isOpen, isMicMuted]);

  // ─── Handle Turn Submission ─────────────────────────────────────
  const handleSendTurn = async (spokenPrompt) => {
    const textToSend = spokenPrompt || transcriptBufferRef.current || userTranscript;
    if (!textToSend || !textToSend.trim()) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    transcriptBufferRef.current = '';
    stopListening();

    setStatus('thinking');
    setUserTranscript(textToSend);

    try {
      const data = await sendLiveAudioDialog({
        transcript: textToSend,
        documentId: currentDocumentId,
        modelName: selectedAudioModel,
        thinkingMode,
        grounding: groundingMode,
      });

      if (data && data.spokenText) {
        setAiResponse(data.spokenText);
        setAiThought(data.thoughtText || '');
        setWebSources(data.webSources || []);

        setDialogHistory((prev) => [
          ...prev,
          { role: 'user', text: textToSend, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          { role: 'assistant', text: data.spokenText, thought: data.thoughtText, sources: data.webSources, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);

        if (!isSpeakerMuted) {
          playSpeechResponse(data.spokenText);
        } else {
          setStatus('listening');
          startListening();
        }
      } else {
        setStatus('listening');
        startListening();
      }
    } catch (err) {
      console.error('Audio dialog turn error:', err);
      setStatus('listening');
      startListening();
    }
  };

  // ─── Play Synthesized Speech Response ───────────────────────────
  const playSpeechResponse = (text) => {
    if (!window.speechSynthesis) {
      setStatus('listening');
      startListening();
      return;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    isSpeakingRef.current = true;
    setStatus('speaking');
    playAudioTone('reply');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find((v) => 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Guy') || v.name.includes('Samantha')) && 
      v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setStatus('speaking');
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setStatus('listening');
      startListening();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      isSpeakingRef.current = false;
      setStatus('listening');
      startListening();
    };

    // Chromium pause bug prevention
    const resumeWatch = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(resumeWatch);
      } else {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    window.speechSynthesis.speak(utterance);
  };

  // ─── Interrupt AI Output ────────────────────────────────────────
  const handleInterrupt = () => {
    playAudioTone('interrupt');
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    setStatus('listening');
    startListening();
  };

  // ─── Click Orb Handler ──────────────────────────────────────────
  const handleOrbClick = () => {
    if (status === 'speaking') {
      handleInterrupt();
    } else if (status === 'thinking') {
      // In progress
    } else if (status === 'listening') {
      if (userTranscript.trim()) {
        handleSendTurn(userTranscript.trim());
      } else {
        setIsMicMuted(!isMicMuted);
      }
    } else {
      // ready or stopped
      setIsMicMuted(false);
      startListening();
    }
  };

  if (!isOpen) return null;

  const activeModelMeta = LIVE_AUDIO_MODELS.find((m) => m.id === selectedAudioModel) || LIVE_AUDIO_MODELS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl h-[92vh] max-h-[840px] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden text-white"
        style={{
          background: 'radial-gradient(ellipse at 50% 15%, #18182b 0%, #0d0d16 55%, #08080c 100%)',
          boxShadow: '0 25px 70px -15px rgba(0, 0, 0, 0.95), 0 0 120px -30px rgba(99, 102, 241, 0.25)',
        }}
      >
        {/* Top Header Bar - Gemini Live */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Gemini 4-color sparkle */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-amber-400 flex items-center justify-center shadow-sm">
                <Sparkles size={15} className="text-white animate-pulse" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                  Gemini Live
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  Real-time Audio
                </span>
              </div>
            </div>

            <div className="relative ml-2">
              {/* Live Audio Model Dropdown */}
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-medium cursor-pointer"
              >
                <span className="font-semibold text-[11px] truncate max-w-[150px]">{activeModelMeta.name}</span>
                <ChevronDown size={11} className="text-white/50" />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-72 rounded-2xl bg-[#14141e] border border-white/10 shadow-2xl p-1.5 z-50">
                  {LIVE_AUDIO_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedAudioModel(m.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 hover:bg-white/10 transition-colors cursor-pointer ${
                        selectedAudioModel === m.id ? 'bg-white/10 text-white' : 'text-white/70'
                      }`}
                    >
                      <span className="font-semibold">{m.name}</span>
                      <span className={`text-[10px] font-mono ${m.color}`}>{m.badge}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Thinking Mode Pill */}
            <button
              type="button"
              onClick={() => setThinkingMode(!thinkingMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                thinkingMode ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/50'
              }`}
              title="Extended Deep Thinking in Gemini Live dialog"
            >
              <Brain size={12} className={thinkingMode ? 'text-amber-400' : 'text-white/40'} />
              <span>Thinking: {thinkingMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* Google Search Grounding Pill */}
            <button
              type="button"
              onClick={() => setGroundingMode(!groundingMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                groundingMode ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-white/50'
              }`}
              title="Real-time Google Search Grounding"
            >
              <Globe size={12} className={groundingMode ? 'text-blue-400' : 'text-white/40'} />
              <span>Search: {groundingMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                stopAllVoice();
                onClose();
              }}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white ml-2 cursor-pointer"
              title="End Gemini Live Session"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mic Permission Warning Banner if blocked */}
        {micPermissionError && (
          <div className="mx-6 mt-3 px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{micPermissionError}</span>
            </div>
            <button
              type="button"
              onClick={startListening}
              className="px-2 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500/50 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
            >
              Retry Mic
            </button>
          </div>
        )}

        {/* Center Canvas / Pulsing Orb Visualizer */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-6 select-none overflow-hidden">
          {/* Animated Atmospheric Glow */}
          <div 
            className="absolute w-80 h-80 rounded-full blur-3xl opacity-35 pointer-events-none transition-all duration-700"
            style={{
              background: status === 'speaking' 
                ? 'radial-gradient(circle, #6366f1 0%, #a855f7 60%, transparent 100%)' 
                : status === 'thinking'
                ? 'radial-gradient(circle, #f59e0b 0%, #d97706 60%, transparent 100%)'
                : 'radial-gradient(circle, #10b981 0%, #06b6d4 60%, transparent 100%)',
              transform: `scale(${1 + audioLevel * 1.6})`,
            }}
          />

          {/* Central Interactive Voice Orb */}
          <button
            type="button"
            onClick={handleOrbClick}
            className="relative flex items-center justify-center cursor-pointer group focus:outline-none"
            title={status === 'speaking' ? 'Click to interrupt' : status === 'listening' ? 'Click to send current speech' : 'Click to start speaking'}
          >
            {/* Outer pulsating ring */}
            <div 
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-white/20 transition-all duration-300 flex items-center justify-center group-hover:scale-105"
              style={{
                transform: `scale(${1 + (status === 'speaking' ? 0.08 : audioLevel * 0.45)})`,
                boxShadow: status === 'speaking'
                  ? '0 0 60px rgba(99, 102, 241, 0.45), inset 0 0 35px rgba(168, 85, 247, 0.35)'
                  : status === 'thinking'
                  ? '0 0 60px rgba(245, 158, 11, 0.45), inset 0 0 35px rgba(245, 158, 11, 0.25)'
                  : '0 0 50px rgba(16, 185, 129, 0.35), inset 0 0 25px rgba(6, 182, 212, 0.25)',
                borderColor: status === 'speaking' ? '#818cf8' : status === 'thinking' ? '#f59e0b' : '#34d399',
              }}
            >
              {/* Middle Orb */}
              <div 
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center transition-all duration-500"
                style={{
                  background: status === 'speaking'
                    ? 'radial-gradient(circle, #6366f1 0%, #8b5cf6 65%, #ec4899 100%)'
                    : status === 'thinking'
                    ? 'radial-gradient(circle, #f59e0b 0%, #b45309 65%, #78350f 100%)'
                    : 'radial-gradient(circle, #10b981 0%, #059669 65%, #064e3b 100%)',
                  animation: status === 'thinking' ? 'pulse 1.5s infinite ease-in-out' : undefined,
                }}
              >
                {/* Core Icon */}
                <div className="w-16 h-16 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center shadow-inner">
                  {status === 'speaking' ? (
                    <Volume2 size={30} className="text-white animate-pulse" />
                  ) : status === 'thinking' ? (
                    <Sparkles size={30} className="text-amber-300 animate-spin" />
                  ) : (
                    <Mic size={30} className={audioLevel > 0.05 ? 'text-white' : 'text-emerald-300'} />
                  )}
                </div>
              </div>
            </div>
          </button>

          {/* Status Badge */}
          <div className="mt-7 text-center z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider backdrop-blur-md border border-white/10">
              <span className={`w-2 h-2 rounded-full ${
                status === 'speaking' ? 'bg-indigo-400 animate-pulse' : status === 'thinking' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'
              }`} />
              {status === 'speaking' 
                ? 'Gemini Speaking (Tap Orb to Interrupt)' 
                : status === 'thinking' 
                ? 'Thinking & Synthesizing...' 
                : status === 'listening' 
                ? 'Listening... Speak or Tap Orb to Send' 
                : 'Ready (Tap Orb to Start)'}
            </span>
          </div>

          {/* Current Live Transcription Preview */}
          <div className="w-full max-w-lg mt-3 px-4 text-center z-10 min-h-[44px]">
            {userTranscript ? (
              <p className="text-sm font-medium text-white/95 leading-relaxed bg-black/45 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
                “{userTranscript}”
              </p>
            ) : (
              <p className="text-xs text-white/40 italic">
                Speak your question naturally, or pick a quick topic below...
              </p>
            )}
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-lg mt-2 z-10 px-4">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendTurn(prompt)}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/70 hover:text-white transition-all cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Spoken AI Answer Card */}
          {aiResponse && (
            <div className="w-full max-w-lg mt-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left backdrop-blur-md z-10 max-h-36 overflow-y-auto">
              <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold mb-1">
                <Sparkles size={13} />
                <span>Gemini Spoken Response:</span>
              </div>
              <p className="text-xs text-white/90 leading-relaxed">
                {aiResponse}
              </p>

              {/* Collapsible Thought if available */}
              {aiThought && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono uppercase text-amber-400 flex items-center gap-1">
                    <Brain size={10} /> Thought Trace:
                  </span>
                  <p className="text-[11px] font-mono text-white/60 leading-relaxed line-clamp-2 mt-0.5">
                    {aiThought}
                  </p>
                </div>
              )}

              {/* Web Sources Chips if available */}
              {webSources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-blue-400 flex items-center gap-1">
                    <Globe size={10} /> Grounded:
                  </span>
                  {webSources.slice(0, 3).map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:underline"
                    >
                      <span className="truncate max-w-[100px]">{s.title}</span>
                      <ExternalLink size={8} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text Input Fallback Bar */}
        <div className="px-6 py-2 border-t border-white/5 bg-white/[0.01]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (textInput.trim()) {
                handleSendTurn(textInput.trim());
                setTextInput('');
              }
            }}
            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type a question to speak back..."
              className="w-full bg-transparent outline-none text-xs text-white placeholder:text-white/40"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || status === 'thinking'}
              className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-black cursor-pointer transition-colors"
            >
              <Send size={13} />
            </button>
          </form>
        </div>

        {/* Bottom Audio Controls Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-white/[0.02]">
          {/* History drawer toggle */}
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs text-white/70 hover:text-white cursor-pointer"
          >
            <MessageSquare size={13} />
            <span>Dialog History ({dialogHistory.length / 2})</span>
            {showHistoryDrawer ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {/* Central Mic & Interrupt Buttons */}
          <div className="flex items-center gap-3">
            {status === 'speaking' ? (
              <button
                type="button"
                onClick={handleInterrupt}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shadow-lg transition-all cursor-pointer"
              >
                <Square size={13} fill="currentColor" />
                <span>Tap to Interrupt</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isMicMuted) {
                    setIsMicMuted(false);
                    startListening();
                  } else {
                    setIsMicMuted(true);
                    stopListening();
                    setStatus('ready');
                  }
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                  isMicMuted
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
                title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMicMuted ? <MicOff size={19} /> : <Mic size={19} />}
              </button>
            )}

            {/* Speaker mute toggle */}
            <button
              type="button"
              onClick={() => {
                if (!isSpeakerMuted && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
                setIsSpeakerMuted(!isSpeakerMuted);
              }}
              className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/70 hover:text-white cursor-pointer"
              title={isSpeakerMuted ? 'Unmute speaker output' : 'Mute speaker output'}
            >
              {isSpeakerMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            {/* End Live Session Button */}
            <button
              type="button"
              onClick={() => {
                stopAllVoice();
                onClose();
              }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center bg-red-600/90 hover:bg-red-600 text-white shadow-lg transition-all cursor-pointer"
              title="End Gemini Live Voice Session"
            >
              <PhoneOff size={18} />
            </button>
          </div>

          <div className="text-[11px] font-mono text-white/40">
            Bidirectional Voice
          </div>
        </div>

        {/* Collapsible History Drawer */}
        {showHistoryDrawer && (
          <div className="absolute inset-x-0 bottom-16 top-16 bg-[#0d0d14]/95 backdrop-blur-2xl z-40 p-6 overflow-y-auto border-t border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare size={15} />
                Live Audio Transcript History
              </h3>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="text-xs text-white/50 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            {dialogHistory.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-8">
                No voice turns recorded yet. Speak into the microphone or use a prompt above to begin.
              </p>
            ) : (
              <div className="space-y-3">
                {dialogHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                      item.role === 'user'
                        ? 'bg-white/5 border-white/10 text-white/90'
                        : 'bg-indigo-950/40 border-indigo-500/20 text-indigo-100'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-[10px] mb-1 opacity-70">
                      <span>{item.role === 'user' ? 'You (Spoken)' : 'Gemini Voice'}</span>
                      <span>{item.time}</span>
                    </div>
                    <p>{item.text}</p>
                    {item.thought && (
                      <div className="mt-1 pt-1 border-t border-white/10 text-[10px] text-amber-400 font-mono">
                        Thought: {item.thought}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAudioModal;
