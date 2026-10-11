import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  CornerDownLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Receipt,
  Loader2,
  ExternalLink,
  ArrowRight,
  FileEdit,
} from 'lucide-react';
import { useFinanceCalculations } from '../../context/useFinanceCalculations';
import { ExpenseCategory, Transaction, TransactionType } from '../../types/finance';
import { formatPaise } from '../../utils/currency';
import { parseLocalIntent } from '../../utils/naturalLanguageParser';
import {
  playSuccessChime,
  playQuestionPromptTone,
  speakSynthesizedVoice,
} from '../../utils/soundEffects';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ExtractedTransactionIntent {
  isComplete: boolean;
  amountRupees: number | null;
  amountPaise: number | null;
  description: string | null;
  category: ExpenseCategory | null;
  type: TransactionType;
  missingFields: string[];
  spokenReply: string;
}

interface VoiceTransactionWidgetProps {
  onPopulateModal?: (draft: Partial<Transaction>) => void;
}

/**
 * Natural language intent parser within VoiceTransactionWidget.
 * Uses the Gemini API (via /api/voice-transaction endpoint) to analyze speech
 * transcriptions and extract transaction fields (amount, description, category, type)
 * and pass them to the application state.
 */
export async function parseNaturalLanguageIntentWithGemini(
  transcript: string,
  history: ConversationTurn[] = []
): Promise<ExtractedTransactionIntent> {
  // Call server-side Gemini API endpoint
  const response = await fetch('/api/voice-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, history }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gemini API failed to parse transcription.');
  }

  const result = await response.json();
  const amountRupees = typeof result.amountRupees === 'number' ? result.amountRupees : null;
  const amountPaise = amountRupees !== null ? Math.round(amountRupees * 100) : null;
  const type: TransactionType = result.type === 'income' ? 'income' : 'expense';
  const category = (result.category as ExpenseCategory) || 'Other';
  const description = result.description || null;

  return {
    isComplete: Boolean(result.isComplete && amountRupees && description),
    amountRupees,
    amountPaise,
    description,
    category,
    type,
    missingFields: result.missingFields || [],
    spokenReply: result.spokenReply || '',
  };
}

export function VoiceTransactionWidget({ onPopulateModal }: VoiceTransactionWidgetProps) {
  const { dispatch } = useFinanceCalculations();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted intent fields from Gemini
  const [extractedIntent, setExtractedIntent] = useState<ExtractedTransactionIntent | null>(null);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);

  // Manual text fallback input
  const [manualText, setManualText] = useState('');

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  isListeningRef.current = isListening;

  const isSoundEnabledRef = useRef(true);
  isSoundEnabledRef.current = isSoundEnabled;

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. You can type transactions below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: any) => {
      let currentInterim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          currentFinal += item[0].transcript + ' ';
        } else {
          currentInterim += item[0].transcript;
        }
      }

      if (currentFinal) {
        setTranscript((prev) => prev + currentFinal);
      }
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone permission was denied. Please allow mic access or use text input.');
      } else if (event.error !== 'no-speech') {
        setError(`Speech recognition: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, []);

  const startListening = () => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    if (recognitionRef.current) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (err: any) {
        console.error('Recognition start error:', err);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
  };

  const handleOpenWidget = () => {
    setIsOpen(true);
    setCompletedTx(null);
    setExtractedIntent(null);
    setConversation([]);
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    startListening();
  };

  const handleCloseWidget = () => {
    stopListening();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsOpen(false);
  };

  // Submit current transcription to Gemini Intent Parser
  const handleProcessTranscript = async (textToProcess?: string) => {
    const rawText = (textToProcess || transcript || interimTranscript || manualText).trim();
    if (!rawText || isProcessing) return;

    stopListening();
    setIsProcessing(true);
    setError(null);
    setManualText('');

    const updatedHistory: ConversationTurn[] = [
      ...conversation,
      { role: 'user', text: rawText },
    ];
    setConversation(updatedHistory);
    setTranscript('');
    setInterimTranscript('');

    try {
      // Natural Language Intent Parser using the Gemini API
      const intent = await parseNaturalLanguageIntentWithGemini(rawText, updatedHistory);
      setExtractedIntent(intent);

      const spokenReply = intent.spokenReply || 'Could you provide more details?';

      setConversation((prev) => [
        ...prev,
        { role: 'assistant', text: spokenReply },
      ]);

      // Check if all fields (amount, description, category, type) are extracted
      if (intent.isComplete && intent.amountPaise && intent.category && intent.description) {
        const draftTx: Partial<Transaction> = {
          type: intent.type,
          category: intent.category,
          description: intent.description,
          amountPaise: intent.amountPaise,
          date: new Date().toISOString().split('T')[0],
          status: 'posted',
        };

        const newTx: Transaction = {
          id: `voice-tx-${Date.now()}`,
          type: draftTx.type!,
          category: draftTx.category!,
          description: draftTx.description!,
          amountPaise: draftTx.amountPaise!,
          date: draftTx.date!,
          status: draftTx.status!,
          createdAt: Date.now(),
        };

        // 1. Auditory Feedback: Play Harmonic Success Chime and speak response
        if (isSoundEnabledRef.current) {
          playSuccessChime();
          speakSynthesizedVoice(spokenReply);
        }

        // 2. Automatically populate TransactionModal fields!
        if (onPopulateModal) {
          onPopulateModal(draftTx);
        }

        // Commit transaction to shared state
        dispatch({ type: 'ADD_TRANSACTION', payload: newTx });
        setCompletedTx(newTx);
      } else {
        // Missing fields! Play Question Prompt Tone and speak clarification question
        if (isSoundEnabledRef.current) {
          playQuestionPromptTone();
          speakSynthesizedVoice(spokenReply, () => {
            // Once speech finishes, auto-restart mic listening
            startListening();
          });
        } else {
          setTimeout(() => {
            startListening();
          }, 1200);
        }
      }
    } catch (err: any) {
      console.error('Gemini natural language parsing error:', err);
      // Fall back to client heuristic if network error
      const local = parseLocalIntent(rawText);
      if (local.isComplete && local.amountRupees) {
        const paise = Math.round(local.amountRupees * 100);
        const draft: Partial<Transaction> = {
          type: local.type,
          category: local.category || 'Other',
          description: local.description || 'Spoken expense',
          amountPaise: paise,
          date: new Date().toISOString().split('T')[0],
          status: 'posted',
        };
        if (onPopulateModal) {
          onPopulateModal(draft);
        }
      }
      setError(err.message || 'Gemini could not analyze the transcription.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Directly populate TransactionModal with whatever fields are currently extracted
  const handlePopulateModalDirectly = () => {
    if (!extractedIntent || !onPopulateModal) return;

    const draft: Partial<Transaction> = {
      type: extractedIntent.type,
      amountPaise: extractedIntent.amountPaise || undefined,
      category: extractedIntent.category || 'Food & Dining',
      description: extractedIntent.description || '',
      date: new Date().toISOString().split('T')[0],
      status: 'posted',
    };

    if (isSoundEnabled) {
      playSuccessChime();
    }

    onPopulateModal(draft);
    handleCloseWidget();
  };

  const handleReset = () => {
    setCompletedTx(null);
    setExtractedIntent(null);
    setConversation([]);
    setTranscript('');
    setInterimTranscript('');
    setManualText('');
    startListening();
  };

  return (
    <>
      {/* Floating Bottom-Right Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handleOpenWidget}
            aria-label="Open voice transaction assistant"
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 focus:outline-none ring-4 ring-emerald-600/20 active:scale-95"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <Mic className="w-5 h-5 text-white animate-pulse" />
            <span className="text-xs font-bold tracking-wide whitespace-nowrap pr-1">
              Voice Add Spend
            </span>
          </button>
        </div>
      )}

      {/* Floating Bottom-Right Active Card */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500 text-slate-900 flex items-center justify-center font-bold text-xs">
                ₹
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-tight leading-none">
                  Gemini Voice Intent Parser
                </h4>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {isListening ? 'Listening for speech...' : isProcessing ? 'Analyzing with Gemini...' : 'Ready'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Auditory Feedback Toggle Button */}
              <button
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                aria-label={isSoundEnabled ? 'Mute sound feedback' : 'Enable sound feedback'}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSoundEnabled
                    ? 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
                    : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800'
                }`}
                title={isSoundEnabled ? 'Sound feedback ON' : 'Sound feedback MUTED'}
              >
                {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={handleCloseWidget}
                aria-label="Close voice assistant"
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Gemini Extracted Transaction Fields Box */}
          {extractedIntent && (
            <div className="p-3 bg-indigo-50/80 border-b border-indigo-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Gemini Extracted Fields:</span>
                </span>
                {onPopulateModal && (
                  <button
                    onClick={handlePopulateModalDirectly}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-0.5"
                  >
                    <FileEdit className="w-3 h-3" />
                    <span>Populate in Form</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white p-2 rounded-lg border border-indigo-100">
                <div>
                  <span className="text-slate-400 font-sans block text-[10px]">Amount:</span>
                  <span className="font-bold text-slate-900">
                    {extractedIntent.amountRupees !== null ? `₹${extractedIntent.amountRupees}` : '❓ Missing'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px]">Type:</span>
                  <span className="font-semibold capitalize text-slate-900">
                    {extractedIntent.type}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px]">Category:</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {extractedIntent.category || '❓ Unclassified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px]">Description:</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {extractedIntent.description || '❓ Missing'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Conversation & Prompt Thread */}
          <div className="p-4 space-y-3 max-h-72 overflow-y-auto bg-slate-50 text-xs">
            {conversation.length === 0 && !completedTx && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Speak to auto-populate TransactionModal:</span>
                  </div>
                  {isSoundEnabled && (
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      <span>Audio ON</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Say your spend naturally. Gemini extracts <strong>amount</strong>, <strong>description</strong>, <strong>category</strong>, and <strong>type</strong>:
                  <br />
                  • <em>"Add an expense of 450 rupees for lunch at cafeteria"</em>
                  <br />
                  • <em>"Spent 200 on chai and snacks"</em>
                  <br />
                  • <em>"Received 5000 stipend from internship"</em>
                </p>
              </div>
            )}

            {conversation.map((turn, index) => {
              const isUser = turn.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-2.5 leading-relaxed ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mb-1">
                        <Volume2 className="w-3 h-3" />
                        <span>RupeeWise Voice Assistant</span>
                      </div>
                    )}
                    <div>{turn.text}</div>
                  </div>
                </div>
              );
            })}

            {/* Completed Transaction Confirmation Box */}
            {completedTx && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-2 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Populated & Saved to Ledger!</span>
                  </div>
                  {isSoundEnabled && (
                    <span className="text-[10px] text-emerald-600 font-mono font-medium flex items-center gap-1">
                      <Volume2 className="w-3 h-3 animate-bounce" />
                      <span>Chime Played</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-emerald-200">
                  <span className="font-semibold text-slate-900">
                    {completedTx.description}
                  </span>
                  <span className="font-bold text-emerald-700">
                    {completedTx.type === 'expense' ? '-' : '+'}
                    {formatPaise(completedTx.amountPaise)}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-700 flex items-center justify-between">
                  <span>
                    Category: <strong>{completedTx.category}</strong>
                  </span>
                  {onPopulateModal && (
                    <button
                      onClick={() => {
                        onPopulateModal(completedTx);
                        handleCloseWidget();
                      }}
                      className="font-semibold text-emerald-800 underline flex items-center gap-0.5"
                    >
                      <span>Open in Modal</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Live Transcription Wave Feedback */}
            {(transcript || interimTranscript) && !completedTx && (
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 font-mono text-[11px]">
                <span className="text-[10px] text-indigo-500 font-sans block mb-0.5">
                  Hearing speech...
                </span>
                <span>{transcript}</span>
                <span className="text-slate-400 italic">{interimTranscript}</span>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Gemini API analyzing transcription...</span>
              </div>
            )}

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Interactive Mic & Action Controls */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isListening) stopListening();
                  else startListening();
                }}
                aria-label={isListening ? 'Stop microphone listening' : 'Start microphone listening'}
                className={`p-2.5 rounded-xl transition-all shadow-xs ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={isListening ? 'Stop listening' : 'Start microphone'}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <input
                type="text"
                placeholder={
                  isListening
                    ? 'Listening... or type speech command here'
                    : 'Type e.g. "Bought books for 1200"'
                }
                aria-label="Transaction speech input or manual text command"
                value={manualText || transcript || interimTranscript}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleProcessTranscript(manualText);
                  }
                }}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />

              <button
                onClick={() => handleProcessTranscript(manualText)}
                disabled={isProcessing || (!transcript && !interimTranscript && !manualText)}
                aria-label="Process transaction text with Gemini"
                className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors"
                title="Process transcription with Gemini"
              >
                <CornerDownLeft className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            {completedTx && (
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-slate-500">Live ledger updated!</span>
                <button
                  onClick={handleReset}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Add Another Spend</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
