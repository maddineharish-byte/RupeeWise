import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Zap,
  Brain,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Loader2,
} from 'lucide-react';
import { useFinanceCalculations } from '../../context/useFinanceCalculations';
import { formatPaise } from '../../utils/currency';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  timestamp: string;
}

export function GeminiChatView() {
  const { state, summary, healthScore } = useFinanceCalculations();

  // Model & Persona Selection
  // gemini-3.5-flash for general tasks, gemini-3.1-flash-lite for fast tasks, gemini-3.1-pro-preview for complex tasks
  const [selectedModel, setSelectedModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview'>('gemini-3.5-flash');
  const [includeFinancialContext, setIncludeFinancialContext] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Namaste ${state.userProfile.name}! I am your RupeeWise AI Personal Finance Advisor.
I can analyze your budget adherence, evaluate proposed purchases before you spend, audit your daily burn rate, and help you save with confidence.

Ask me anything about your current budget or try one of the starter questions below!`,
      modelUsed: 'gemini-3.5-flash',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isLoading) return;

    setError(null);
    const userMsgId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const financialContext = includeFinancialContext
        ? {
            startingBudgetRupees: summary.startingBudgetPaise / 100,
            currentDay: state.period.currentDay,
            totalDays: state.period.totalDays,
            daysRemaining: summary.daysRemaining,
            currentBalanceRupees: summary.currentBalancePaise / 100,
            unpaidCommitmentsRupees: summary.unpaidCommitmentsPaise / 100,
            availableToSpendRupees: summary.availableToSpendPaise / 100,
            dailyAllowanceRupees: summary.dailyAllowancePaise / 100,
            currentDailyBurnRupees: summary.currentDailyBurnPaise / 100,
            remainingSavingsTargetRupees: summary.remainingSavingsTargetPaise / 100,
            healthScore: healthScore.totalScore,
            riskLevel: healthScore.riskLevel,
          }
        : null;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          financialContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with Gemini.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.text,
          modelUsed: data.modelUsed,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Something went wrong while querying Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat history cleared. How can I assist your financial journey today, ${state.userProfile.name}?`,
        modelUsed: selectedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const starterPrompts = [
    'How do I reduce my ₹300/day burn rate down to my ₹238 allowance?',
    'Should I buy a smartphone on EMI with my ₹7,000 current balance?',
    'Audit my category allocations: is ₹3,000 for dining too high?',
    'How should I prioritize my upcoming ₹2,000 unpaid bills vs savings?',
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header & Role Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              RupeeWise AI Financial Coach
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Powered by Google Gemini multi-turn reasoning with live budget telemetry.
          </p>
        </div>

        {/* Model Selector based on task requirements */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSelectedModel('gemini-3.5-flash')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                selectedModel === 'gemini-3.5-flash'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="General tasks: Balanced, intelligent personal finance advisor"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>General (3.5 Flash)</span>
            </button>

            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Fast tasks: Ultra-fast tips and rapid calculations"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Fast (3.1 Lite)</span>
            </button>

            <button
              onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                selectedModel === 'gemini-3.1-pro-preview'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Complex tasks: Deep financial audits and advanced scenario reasoning"
            >
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              <span>Complex (3.1 Pro)</span>
            </button>
          </div>

          <button
            onClick={handleClearHistory}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Clear conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Financial Snapshot Toggle Indicator */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 rounded-lg text-xs text-slate-600">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeFinancialContext}
            onChange={(e) => setIncludeFinancialContext(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-0"
          />
          <span>
            Include live financial snapshot (Current Balance: {formatPaise(summary.currentBalancePaise)}, Available: {formatPaise(summary.availableToSpendPaise)}, Allowance: {formatPaise(summary.dailyAllowancePaise)}/d)
          </span>
        </label>
        <span className="font-mono text-[11px] text-slate-500 hidden sm:inline">
          Model: {selectedModel}
        </span>
      </div>

      {/* Main Chat Thread Window */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[540px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  <div
                    className={`mt-2 flex items-center justify-between text-[10px] ${
                      isUser ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.modelUsed && !isUser && (
                      <span className="font-mono">{msg.modelUsed}</span>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl rounded-bl-xs p-4 text-xs flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Thinking with {selectedModel}...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter prompts strip if few messages */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
            {starterPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-200 px-2.5 py-1 rounded-full transition-colors truncate max-w-xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Message Input Box */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask RupeeWise about budgeting, purchases, or savings..."
              aria-label="Ask RupeeWise financial advisor"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 text-emerald-400" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
