import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  ChevronRight, 
  Loader2, 
  MapPin, 
  Calendar, 
  CheckCircle2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIBookingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "G'day! I'm your GrassRoots AI Assistant. I can help you get an instant quote and book your next mow. What's your address or property size?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages,
          userMessage: userMessage
        })
      });

      if (!response.ok) throw new Error("Failed to reach assistant");
      
      const data = await response.json();
      const assistantMessage = data.text || "I'm sorry, I couldn't process that. Could you try again?";
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Mates, I'm having a bit of a technical glitch. Try jumping straight into our booking tool!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
            className="mb-4 w-[380px] h-[550px] shadow-2xl rounded-2xl overflow-hidden border border-orange-200/50 bg-white/95 backdrop-blur-xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-charcoal p-2 rounded-lg border border-white/20">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-tight italic">GrassAssistant AI</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                    <span className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-black italic">Active Node</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors relative z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface"
            >
              {messages.map((message, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: message.role === 'assistant' ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    message.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-[13px] leading-relaxed shadow-premium",
                    message.role === 'user' 
                      ? "bg-charcoal text-white rounded-tr-none font-bold italic" 
                      : "bg-white text-charcoal rounded-tl-none border border-border"
                  )}>
                    {message.content}
                  </div>
                  <span className="text-[9px] text-clay/50 mt-1 px-1 font-black uppercase tracking-widest italic">
                    {message.role === 'assistant' ? 'GrassRoots HQ' : 'Client'}
                  </span>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-border flex items-center gap-2 shadow-premium">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-[10px] text-clay font-black uppercase tracking-widest italic">Signal Proc...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide py-2 bg-surface border-t border-border/30">
              <button 
                onClick={() => navigate('/booking')}
                className="whitespace-nowrap px-3 py-1.5 bg-secondary text-white rounded-full text-[10px] font-black uppercase tracking-[0.1em] italic hover:scale-105 transition-transform flex items-center gap-1.5 shadow-premium"
              >
                <ChevronRight className="w-3 h-3" />
                START INSTANT BOOK
              </button>
              <button 
                onClick={() => setInput("What's your pricing?")}
                className="whitespace-nowrap px-3 py-1.5 bg-white border border-border rounded-full text-[10px] font-black text-clay uppercase tracking-[0.1em] italic hover:bg-surface transition-colors flex items-center gap-1.5 shadow-premium"
              >
                PRICING INTEL
              </button>
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-border">
              <div className="relative group">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Inquire with GrassRoots..."
                  className="pr-12 bg-surface border-border rounded-xl focus:ring-primary focus:border-primary h-12 text-xs font-bold transition-all group-focus-within:bg-white italic"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary text-white disabled:opacity-50 disabled:bg-clay/20 transition-all hover:bg-primary-hover shadow-button"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[8px] text-center text-clay/40 mt-2 flex items-center justify-center gap-1 font-black uppercase tracking-widest italic">
                <Sparkles className="w-2.5 h-2.5 text-primary" />
                Authorized GrassRoots Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-[24px] shadow-premium flex items-center justify-center relative overflow-hidden transition-all duration-500 border-2",
          isOpen ? "bg-charcoal border-primary" : "bg-primary border-primary/20 hover:scale-110"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-7 h-7 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <Bot className="w-7 h-7 text-white shadow-premium" />
              <span className="text-[8px] text-white font-black mt-0.5 uppercase tracking-widest italic">GR HQ</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-secondary border-4 border-surface rounded-full shadow-premium"
          />
        )}
      </motion.button>
    </div>
  );
}
