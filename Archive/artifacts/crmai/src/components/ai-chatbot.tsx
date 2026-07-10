import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Trash2, Sparkles, Mic, MicOff, Volume2, VolumeX, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

async function fetchModules(): Promise<Record<string, boolean>> {
  const res = await fetch("/api/app-modules/public", { credentials: "include" });
  if (!res.ok) return {};
  return res.json();
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\n)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="px-1 py-0.5 bg-muted rounded text-xs font-mono">{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? ((window as unknown as Record<string, unknown>).SpeechRecognition as typeof SpeechRecognition | undefined) ||
      ((window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof SpeechRecognition | undefined)
    : undefined;

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);

  const { data: modules } = useQuery<Record<string, boolean>>({
    queryKey: ["app-modules-public"],
    queryFn: fetchModules,
    staleTime: 60_000,
  });
  const voiceAllowed = modules?.voice_commands !== false;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakText = useCallback((text: string) => {
    if (!voiceAllowed || !voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const plain = text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .trim();
    const utt = new SpeechSynthesisUtterance(plain);
    utt.rate = 1.0;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [voiceEnabled]);

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const sendMessage = useCallback(async (overrideInput?: string) => {
    const trimmed = (overrideInput ?? input).trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    stopSpeaking();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      const reply: string = data.reply;
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      speakText(reply);
    } catch {
      const errMsg = "Sorry, I couldn't process that request. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
      speakText(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, speakText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    stopSpeaking();
  };

  const toggleRecording = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      alert("Voice input is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join("");
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        recognition.stop();
        setIsRecording(false);
        sendMessage(transcript);
      }
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  }, [isRecording, sendMessage]);

  const micSupported = voiceAllowed && Boolean(SpeechRecognitionAPI);
  const ttsSupported = voiceAllowed && typeof window !== "undefined" && Boolean(window.speechSynthesis);

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all flex items-center justify-center group"
        >
          <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">ArborMind AI</p>
                <p className="text-[10px] text-muted-foreground">CRM Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {ttsSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-7 w-7", voiceEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => { setVoiceEnabled(v => !v); stopSpeaking(); }}
                  title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
                >
                  {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </Button>
              )}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={clearChat}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => { setIsOpen(false); stopSpeaking(); }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Hi! I'm your agentic CRM assistant.</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                    I can search your live data, look up records, and analyse your pipeline. Ask me anything — or tap the mic to speak.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  {[
                    "Show my top 5 opportunities",
                    "What's overdue on my plate?",
                    "Pipeline by stage",
                    "Find leads from 'Acme'",
                    "Revenue this quarter",
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => { setInput(suggestion); }}
                      className="text-[11px] px-2.5 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  <MarkdownText text={msg.content} />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {isSpeaking && (
            <div className="mx-3 mb-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="w-0.5 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${8 + (i % 2) * 6}px`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-primary font-medium flex-1">Speaking…</span>
              <button
                onClick={stopSpeaking}
                className="text-primary hover:text-primary/70 transition-colors"
                title="Stop speaking"
              >
                <StopCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isRecording && (
            <div className="mx-3 mb-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="w-2 h-2 rounded-full bg-destructive animate-ping" />
              <span className="text-[11px] text-destructive font-medium">Listening…</span>
            </div>
          )}

          <div className="p-3 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              {micSupported && (
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 rounded-xl shrink-0 transition-colors",
                    isRecording
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={toggleRecording}
                  disabled={isLoading}
                  title={isRecording ? "Stop recording" : "Speak a command"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "Listening…" : "Ask about your CRM…"}
                className="flex-1 h-9 px-3 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                disabled={isLoading || isRecording}
              />
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
