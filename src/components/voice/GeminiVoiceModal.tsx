import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Volume2, Sparkles, X, AlertCircle } from 'lucide-react';
import { floatTo16BitPCM, arrayBufferToBase64, LiveAudioPlayer } from '../../utils/audioLive';

interface GeminiVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GeminiVoiceModal({ isOpen, onClose }: GeminiVoiceModalProps) {
  const [status, setStatus] = useState<
    'connecting' | 'ready' | 'speaking' | 'listening' | 'error' | 'closed'
  >('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    startVoiceSession();

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.close();
      playerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('closed');
  };

  const startVoiceSession = async () => {
    setStatus('connecting');
    setErrorMessage(null);

    try {
      // 1. Initialize output player
      playerRef.current = new LiveAudioPlayer();

      // 2. Connect WebSocket to /api/live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Voice WebSocket connected');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            setStatus('ready');
            // Start microphone stream once session is confirmed ready
            await initMicrophone(ws);
            setStatus('listening');
          } else if (data.type === 'audio') {
            setStatus('speaking');
            if (playerRef.current) {
              await playerRef.current.playChunk(data.audio);
            }
          } else if (data.type === 'interrupted') {
            if (playerRef.current) {
              playerRef.current.stopAll();
            }
            setStatus('listening');
          } else if (data.type === 'error') {
            setStatus('error');
            setErrorMessage(data.message || 'Gemini 3.8 Live API error.');
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setStatus('error');
        setErrorMessage('Could not establish connection with Gemini 3.8 Live API.');
      };

      ws.onclose = () => {
        if (status !== 'error') {
          setStatus('closed');
        }
      };
    } catch (err: any) {
      console.error('Error starting voice session:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Microphone or connection failed.');
    }
  };

  const initMicrophone = async (ws: WebSocket) => {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    streamRef.current = stream;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });
    audioContextRef.current = inputAudioCtx;

    const source = inputAudioCtx.createMediaStreamSource(stream);
    // 4096 buffer size
    const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    source.connect(processor);
    processor.connect(inputAudioCtx.destination);

    processor.onaudioprocess = (e) => {
      if (isMutedRef.current) return;
      if (ws.readyState !== WebSocket.OPEN) return;

      const channelData = e.inputBuffer.getChannelData(0);
      const pcm16Buffer = floatTo16BitPCM(channelData);
      const base64Audio = arrayBufferToBase64(pcm16Buffer);

      ws.send(JSON.stringify({ audio: base64Audio }));
    };
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl overflow-hidden p-6 relative flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={() => {
            cleanup();
            onClose();
          }}
          aria-label="Close voice conversation"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Model Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gemini 3.8 Live · Real-time Voice</span>
        </div>

        <h3 id="voice-modal-title" className="text-xl font-bold tracking-tight text-white mb-2">
          RupeeWise Live Voice
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mb-8">
          Talk naturally with your AI finance coach. Speak about your budget, purchase dilemmas, or savings goals in real-time.
        </p>

        {/* Central Audio Visualizer Orb */}
        <div className="relative flex items-center justify-center w-36 h-36 mb-8">
          {/* Outer Pulse Rings */}
          {status === 'speaking' && (
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          )}
          {status === 'listening' && (
            <div className="absolute inset-2 rounded-full bg-indigo-500/20 animate-pulse" />
          )}

          {/* Central Orb */}
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
              status === 'speaking'
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/30 ring-4 ring-emerald-500/30 scale-105'
                : status === 'listening'
                ? 'bg-gradient-to-tr from-indigo-600 to-sky-400 shadow-indigo-500/30 ring-4 ring-indigo-500/30'
                : status === 'connecting'
                ? 'bg-slate-800 animate-pulse ring-2 ring-slate-700'
                : 'bg-slate-800'
            }`}
          >
            {status === 'speaking' ? (
              <Volume2 className="w-10 h-10 text-white animate-bounce" />
            ) : isMuted ? (
              <MicOff className="w-10 h-10 text-slate-400" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </div>
        </div>

        {/* Live Status Message */}
        <div className="mb-8">
          <div className="text-sm font-semibold tracking-wide capitalize text-slate-200">
            {status === 'connecting' && 'Connecting to Gemini Live...'}
            {status === 'ready' && 'Establishing Audio Pipeline...'}
            {status === 'listening' && (isMuted ? 'Microphone Muted' : 'Listening to you...')}
            {status === 'speaking' && 'Gemini is speaking...'}
            {status === 'error' && 'Connection Error'}
            {status === 'closed' && 'Call Ended'}
          </div>
          {errorMessage && (
            <div className="mt-2 text-xs text-rose-400 flex items-center justify-center gap-1.5 max-w-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`p-3.5 rounded-full border transition-all ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              cleanup();
              onClose();
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Voice Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
