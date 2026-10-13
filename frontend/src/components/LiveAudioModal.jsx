import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
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
  PhoneOff,
  Sliders,
  Play,
  RotateCcw,
  Check
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { sendLiveAudioDialog } from '../services/api';

const LIVE_AUDIO_MODELS = [
  { id: 'gemini-3.8-live-extended-thinking', name: 'Gemini 3.8 Live Extended Thinking', badge: 'Thinking', color: 'text-amber-400' },
  { id: 'gemini-3.8-live', name: 'Gemini 3.8 Live', badge: 'Ultra Fast', color: 'text-emerald-400' },
  { id: 'gemini-3-flash-live', name: 'Gemini 3 Flash Live', badge: 'Next-Gen', color: 'text-cyan-400' },
  { id: 'gemini-2.5-flash-native-audio-dialog', name: 'Gemini 2.5 Flash Native Audio Dialog', badge: 'Native Audio', color: 'text-blue-400' },
];

const GEMINI_VOICES = [
  { id: 'puck', name: 'Puck', tone: 'Upbeat, friendly & engaging', pitch: 1.05, rate: 1.05, voiceGender: 'male' },
  { id: 'charon', name: 'Charon', tone: 'Deep, authoritative & steady', pitch: 0.85, rate: 0.95, voiceGender: 'male' },
  { id: 'aoede', name: 'Aoede', tone: 'Expressive, warm & articulate', pitch: 1.15, rate: 1.0, voiceGender: 'female' },
  { id: 'fenrir', name: 'Fenrir', tone: 'Crisp, resonant & analytical', pitch: 0.9, rate: 1.0, voiceGender: 'male' },
  { id: 'kore', name: 'Kore', tone: 'Calm, soothing & precise', pitch: 1.0, rate: 0.95, voiceGender: 'female' },
];

const PERSONA_PRESETS = [
  {
    id: 'counsel',
    title: 'Senior Legal Counsel',
    prompt: 'Act as an experienced senior corporate counsel. Provide sharp, statutory legal analysis, cite legal standards, and focus on contractual risk mitigation.',
  },
  {
    id: 'plain',
    title: 'Plain English Explainer',
    prompt: 'Explain complex legal clauses and contracts in simple, direct, conversational language with no confusing legal jargon.',
  },
  {
    id: 'negotiator',
    title: 'Deal & Contract Negotiator',
    prompt: 'Focus on commercial deal leverage, indemnities, liability caps, warranties, and practical negotiation strategies.',
  },
  {
    id: 'auditor',
    title: 'Strict Compliance Auditor',
    prompt: 'Audit agreements for regulatory compliance, data protection liabilities, and non-standard risk exposures.',
  },
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

  // Voice Persona & Customization Prompt
  const [selectedVoiceId, setSelectedVoiceId] = useState(() => localStorage.getItem('gemini_live_voice') || 'aoede');
  const [customPrompt, setCustomPrompt] = useState(() => localStorage.getItem('gemini_live_custom_prompt') || '');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1.0);

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
  const activeTranscriptRef = useRef('');
  const isRecognitionActiveRef = useRef(false);

  // Save customizations to localStorage
  useEffect(() => {
    localStorage.setItem('gemini_live_voice', selectedVoiceId);
  }, [selectedVoiceId]);

  useEffect(() => {
    localStorage.setItem('gemini_live_custom_prompt', customPrompt);
  }, [customPrompt]);

  // ─── Play Acoustic Sound Feedback ───────────────────────────────
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
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'interrupt') {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // AudioContext unavailable
    }
  };

  // ─── Setup Web Audio Analyser for Real-time Frequency Waveform ───
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
        analyser.smoothingTimeConstant = 0.5;
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
          const normalized = Math.min(1, avg / 128);
          setAudioLevel(normalized);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
      return true;
    } catch (err) {
      console.warn('Microphone permission / audio analyser error:', err.message);
      setMicPermissionError(
        err.message.includes('Permission') 
          ? 'Microphone blocked. Please grant microphone permission in your browser.' 
          : 'Microphone not detected.'
      );
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

  // ─── Continuous, Resilient Speech Recognition ───────────────────
  const initSpeechRecognition = () => {
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
        isRecognitionActiveRef.current = true;
        setMicPermissionError(null);
        if (!isSpeakingRef.current) {
          setStatus('listening');
        }
      };

      recognition.onresult = (event) => {
        // If Gemini is currently speaking, speech interrupts the AI
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
          activeTranscriptRef.current = currentSpeech;
          setUserTranscript(currentSpeech);
          setStatus('listening');

          // Auto-submit after 1.5 seconds of silence
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            const buffered = activeTranscriptRef.current.trim();
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
          setMicPermissionError('Microphone permission blocked. Please click Allow in your browser.');
          setStatus('ready');
        } else if (e.error === 'no-speech') {
          // Normal silence, keep listening
        } else {
          console.warn('SpeechRecognition warning:', e.error);
        }
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        // Auto-restart if modal is open, mic unmuted, and AI is not speaking
        if (isOpen && !isMicMuted && !isSpeakingRef.current) {
          setTimeout(() => {
            try {
              if (isOpen && !isMicMuted && !isRecognitionActiveRef.current) {
                recognition.start();
              }
            } catch {
              // Already started
            }
          }, 250);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setupAudioAnalyser();
    } catch (err) {
      console.warn('Speech recognition init note:', err.message);
    }
  };

  const stopAllVoice = () => {
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
    isRecognitionActiveRef.current = false;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    cleanupAudioAnalyser();
    setStatus('ready');
  };

  // Mount / Unmount lifecycle
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

    playAudioTone('start');
    initSpeechRecognition();

    return () => {
      stopAllVoice();
    };
  }, [isOpen]);

  // ─── Handle Turn Submission ─────────────────────────────────────
  const handleSendTurn = async (spokenPrompt) => {
    const textToSend = spokenPrompt || activeTranscriptRef.current || userTranscript;
    if (!textToSend || !textToSend.trim()) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    activeTranscriptRef.current = '';

    setStatus('thinking');
    setUserTranscript(textToSend);

    try {
      const data = await sendLiveAudioDialog({
        transcript: textToSend,
        documentId: currentDocumentId,
        modelName: selectedAudioModel,
        thinkingMode,
        grounding: groundingMode,
        customPrompt,
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
          setUserTranscript('');
        }
      } else {
        setStatus('listening');
        setUserTranscript('');
      }
    } catch (err) {
      console.error('Gemini Live dialog error:', err);
      setStatus('listening');
      setUserTranscript('');
    }
  };

  // ─── Play Synthesized Speech Response ───────────────────────────
  const playSpeechResponse = (text) => {
    if (!window.speechSynthesis) {
      setStatus('listening');
      setUserTranscript('');
      return;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    isSpeakingRef.current = true;
    setStatus('speaking');
    playAudioTone('reply');

    const utterance = new SpeechSynthesisUtterance(text);
    const activeVoiceMeta = GEMINI_VOICES.find((v) => v.id === selectedVoiceId) || GEMINI_VOICES[0];
    utterance.rate = voiceRate * (activeVoiceMeta.rate || 1.0);
    utterance.pitch = activeVoiceMeta.pitch || 1.0;

    const voices = window.speechSynthesis.getVoices();
    let selectedSysVoice = null;
    if (activeVoiceMeta.voiceGender === 'female') {
      selectedSysVoice = voices.find((v) => 
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Samantha') || v.name.includes('Zira')) && 
        v.lang.startsWith('en')
      );
    } else {
      selectedSysVoice = voices.find((v) => 
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Guy') || v.name.includes('David')) && 
        v.lang.startsWith('en')
      );
    }

    if (!selectedSysVoice) {
      selectedSysVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
    }

    if (selectedSysVoice) {
      utterance.voice = selectedSysVoice;
    }

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setStatus('speaking');
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setStatus('listening');
      setUserTranscript(''); // Clear for next turn
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      isSpeakingRef.current = false;
      setStatus('listening');
      setUserTranscript('');
    };

    // Chromium speech pause bug workaround
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

  // ─── Voice Preview Test ─────────────────────────────────────────
  const handlePreviewVoice = (voiceId) => {
    const vMeta = GEMINI_VOICES.find((v) => v.id === voiceId) || GEMINI_VOICES[0];
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(`Hello! I am Gemini Live using the ${vMeta.name} voice.`);
    utterance.pitch = vMeta.pitch;
    utterance.rate = voiceRate * vMeta.rate;

    const voices = window.speechSynthesis.getVoices();
    const candidate = vMeta.voiceGender === 'female'
      ? voices.find((v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Samantha')) && v.lang.startsWith('en'))
      : voices.find((v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Guy') || v.name.includes('David')) && v.lang.startsWith('en'));

    if (candidate) utterance.voice = candidate;
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
  };

  // ─── Click Orb Handler ──────────────────────────────────────────
  const handleOrbClick = () => {
    if (status === 'speaking') {
      handleInterrupt();
    } else if (status === 'thinking') {
      // Busy
    } else if (status === 'listening') {
      if (userTranscript.trim()) {
        handleSendTurn(userTranscript.trim());
      } else {
        // Toggle mic mute
        setIsMicMuted(!isMicMuted);
      }
    } else {
      setIsMicMuted(false);
      initSpeechRecognition();
    }
  };

  if (!isOpen) return null;

  const activeModelMeta = LIVE_AUDIO_MODELS.find((m) => m.id === selectedAudioModel) || LIVE_AUDIO_MODELS[0];
  const activeVoiceMeta = GEMINI_VOICES.find((v) => v.id === selectedVoiceId) || GEMINI_VOICES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl h-[92vh] max-h-[840px] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden text-white"
        style={{
          background: 'radial-gradient(ellipse at 50% 12%, #18151f 0%, #111015 50%, #0b0a0e 100%)',
          boxShadow: '0 25px 70px -15px rgba(0, 0, 0, 0.95), 0 0 120px -30px rgba(218, 119, 86, 0.25)',
        }}
      >
        {/* Top Header Bar - DeepDoc + Gemini Live */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Brand Terracotta & Amber Sparkle */}
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                style={{ background: 'linear-gradient(135deg, #da7756 0%, #f59e0b 60%, #8b5cf6 100%)' }}
              >
                <Sparkles size={15} className="text-white animate-pulse" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-white">
                  Gemini Live
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {activeVoiceMeta.name} Voice
                </span>
              </div>
            </div>

            {/* Model Selector Pill */}
            <div className="relative ml-2">
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-medium cursor-pointer"
              >
                <span className="font-semibold text-[11px] truncate max-w-[140px]">{activeModelMeta.name}</span>
                <ChevronDown size={11} className="text-white/50" />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-72 rounded-2xl bg-[#141418] border border-white/10 shadow-2xl p-1.5 z-50">
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
            {/* Persona & Voice Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                showSettingsDrawer ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
              }`}
              title="Voice Persona & Customization Prompt"
            >
              <Sliders size={12} className={showSettingsDrawer ? 'text-amber-400' : 'text-white/60'} />
              <span>Persona</span>
            </button>

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
              onClick={initSpeechRecognition}
              className="px-2 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500/50 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
            >
              Retry Mic
            </button>
          </div>
        )}

        {/* Center Canvas / DeepDoc Terracotta & Amber Gemini Live Orb */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-6 select-none overflow-hidden">
          {/* Animated Atmospheric Glow matching DeepDoc Terracotta & Amber */}
          <div 
            className="absolute w-84 h-84 rounded-full blur-3xl opacity-35 pointer-events-none transition-all duration-700"
            style={{
              background: status === 'speaking' 
                ? 'radial-gradient(circle, #8b5cf6 0%, #da7756 50%, transparent 100%)' 
                : status === 'thinking'
                ? 'radial-gradient(circle, #f59e0b 0%, #b45309 60%, transparent 100%)'
                : 'radial-gradient(circle, #da7756 0%, #f59e0b 50%, transparent 100%)',
              transform: `scale(${1 + audioLevel * 1.8})`,
            }}
          />

          {/* Central Interactive Voice Orb */}
          <div className="relative flex items-center justify-center">
            {/* Live Audio Equalizer Frequency Waveform Bars */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-dashed transition-all duration-300"
                style={{
                  borderColor: status === 'speaking' ? 'rgba(139, 92, 246, 0.4)' : status === 'thinking' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(218, 119, 86, 0.4)',
                  transform: `scale(${1 + audioLevel * 0.35}) rotate(${audioLevel * 30}deg)`,
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleOrbClick}
              className="relative flex items-center justify-center cursor-pointer group focus:outline-none"
              title={status === 'speaking' ? 'Click to interrupt' : status === 'listening' ? 'Click to send current speech' : 'Click to start speaking'}
            >
              {/* Outer pulsating ring */}
              <div 
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border transition-all duration-300 flex items-center justify-center group-hover:scale-105"
                style={{
                  transform: `scale(${1 + (status === 'speaking' ? 0.08 : audioLevel * 0.45)})`,
                  boxShadow: status === 'speaking'
                    ? '0 0 60px rgba(139, 92, 246, 0.45), inset 0 0 35px rgba(218, 119, 86, 0.3)'
                    : status === 'thinking'
                    ? '0 0 60px rgba(245, 158, 11, 0.45), inset 0 0 35px rgba(245, 158, 11, 0.25)'
                    : '0 0 60px rgba(218, 119, 86, 0.4), inset 0 0 30px rgba(245, 158, 11, 0.3)',
                  borderColor: status === 'speaking' ? '#a78bfa' : status === 'thinking' ? '#f59e0b' : '#da7756',
                }}
              >
                {/* Middle Orb with Terracotta/Amber/Violet Gradient */}
                <div 
                  className="w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center transition-all duration-500"
                  style={{
                    background: status === 'speaking'
                      ? 'radial-gradient(circle, #8b5cf6 0%, #da7756 70%, #ec4899 100%)'
                      : status === 'thinking'
                      ? 'radial-gradient(circle, #f59e0b 0%, #b45309 65%, #78350f 100%)'
                      : 'radial-gradient(circle, #da7756 0%, #e06847 45%, #b45309 85%, #78350f 100%)',
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
                      <Mic size={30} className={audioLevel > 0.08 ? 'text-white scale-110 transition-transform' : 'text-amber-200'} />
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Real-time Mic Audio Wave Indicator */}
          <div className="flex items-center gap-1.5 mt-5 h-4">
            {[0.2, 0.5, 0.8, 1.0, 0.7, 0.4, 0.9, 0.6, 0.3].map((mult, i) => (
              <span
                key={i}
                className="w-1 rounded-full transition-all duration-150"
                style={{
                  height: `${Math.max(4, audioLevel * 24 * mult)}px`,
                  backgroundColor: audioLevel > 0.05 ? '#da7756' : 'rgba(255, 255, 255, 0.2)',
                }}
              />
            ))}
          </div>

          {/* Status Badge */}
          <div className="mt-4 text-center z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider backdrop-blur-md border border-white/10">
              <span className={`w-2 h-2 rounded-full ${
                status === 'speaking' ? 'bg-purple-400 animate-pulse' : status === 'thinking' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'
              }`} />
              {status === 'speaking' 
                ? 'Gemini Speaking (Tap Orb to Interrupt)' 
                : status === 'thinking' 
                ? 'Thinking & Synthesizing...' 
                : audioLevel > 0.08
                ? 'Listening to your voice...'
                : 'Listening... Speak or Tap Orb to Send'}
            </span>
          </div>

          {/* Current Live Transcription Preview */}
          <div className="w-full max-w-lg mt-3 px-4 text-center z-10 min-h-[44px]">
            {userTranscript ? (
              <p className="text-sm font-medium text-white/95 leading-relaxed bg-black/50 px-4 py-2 rounded-2xl border border-amber-500/30 backdrop-blur-md shadow-lg">
                “{userTranscript}”
              </p>
            ) : (
              <p className="text-xs text-white/40 italic">
                Speak your legal question naturally, or pick a starter topic below...
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
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-1">
                <Sparkles size={13} />
                <span>Gemini Live ({activeVoiceMeta.name}):</span>
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
                    initSpeechRecognition();
                  } else {
                    setIsMicMuted(true);
                    if (recognitionRef.current) {
                      try { recognitionRef.current.stop(); } catch {}
                    }
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

        {/* Persona & Voice Customization Settings Drawer */}
        {showSettingsDrawer && (
          <div className="absolute inset-x-0 bottom-16 top-16 bg-[#121117]/98 backdrop-blur-2xl z-40 p-6 overflow-y-auto border-t border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders size={15} className="text-amber-400" />
                Gemini Live Voice & Persona Customization
              </h3>
              <button
                onClick={() => setShowSettingsDrawer(false)}
                className="text-xs text-white/50 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Voice Persona Selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-white/80 mb-2">
                Select Gemini Voice Persona:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GEMINI_VOICES.map((v) => {
                  const isSelected = selectedVoiceId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVoiceId(v.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-500/10 text-white' 
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{v.name}</span>
                          {isSelected && <Check size={13} className="text-amber-400" />}
                        </div>
                        <p className="text-[10px] text-white/50 mt-0.5">{v.tone}</p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewVoice(v.id);
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
                        title={`Preview ${v.name} Voice`}
                      >
                        <Play size={12} fill="currentColor" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Speed rate control */}
              <div className="mt-3 flex items-center gap-3 text-xs text-white/70">
                <span>Speed:</span>
                {[0.85, 1.0, 1.15].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setVoiceRate(rate)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                      voiceRate === rate 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                        : 'bg-white/5 border-white/10 text-white/60'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Customization Prompt Directives */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Custom Persona & Behavior Prompt:
              </label>
              <p className="text-[11px] text-white/50 mb-2">
                Choose a preset role or write custom instructions for how Gemini Live should speak and analyze.
              </p>

              {/* Presets */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {PERSONA_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCustomPrompt(p.prompt)}
                    className="p-2 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] transition-all cursor-pointer"
                  >
                    <span className="font-semibold block text-amber-300">{p.title}</span>
                    <span className="text-[10px] text-white/50 line-clamp-1 mt-0.5">{p.prompt}</span>
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Act as a senior partner. Keep spoken answers under 3 sentences. Highlight high-risk indemnities immediately."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
              />

              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setCustomPrompt('')}
                  className="text-[10px] text-white/40 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={10} /> Reset to Default
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsDrawer(false)}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold cursor-pointer"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible History Drawer */}
        {showHistoryDrawer && (
          <div className="absolute inset-x-0 bottom-16 top-16 bg-[#121117]/98 backdrop-blur-2xl z-40 p-6 overflow-y-auto border-t border-white/10">
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
                        : 'bg-amber-950/20 border-amber-500/20 text-amber-100'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-[10px] mb-1 opacity-70">
                      <span>{item.role === 'user' ? 'You (Spoken)' : `Gemini Live (${activeVoiceMeta.name})`}</span>
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
