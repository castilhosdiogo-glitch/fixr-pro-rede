import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Shield, AlertTriangle } from "lucide-react";
import { professionals } from "@/data/mock";

interface Message {
  id: string;
  sender: "system" | "client" | "warning";
  text: string;
  time: string;
}

// Contact protection: detect phone numbers, emails, WhatsApp refs, external links
const BLOCKED_PATTERNS = [
  /\b\d{2,3}[\s.-]?\d{4,5}[\s.-]?\d{4}\b/,           // Phone numbers
  /\b\(\d{2,3}\)\s?\d{4,5}-?\d{4}\b/,                  // (xx) xxxxx-xxxx
  /whatsapp|whats\s?app|wpp|zap/i,                       // WhatsApp references
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Emails
  /https?:\/\/[^\s]+/i,                                   // URLs
  /www\.[^\s]+/i,                                          // www links
  /instagram|facebook|telegram|tiktok/i,                   // Social media
];

const containsBlockedContent = (text: string): boolean => {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
};

const BLOCKED_WARNING = "Para sua segurança, informações de contato só podem ser compartilhadas após a confirmação do serviço.";

const QuoteRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const professional = professionals.find((p) => p.id === id);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "system",
      text: `Olá! Descreva brevemente o serviço que você precisa de ${professional?.name || "Profissional"}.`,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profissional não encontrado.</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;

    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Check for blocked content
    if (containsBlockedContent(input.trim())) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "warning",
          text: BLOCKED_WARNING,
          time: now,
        },
      ]);
      setInput("");
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "client",
      text: input.trim(),
      time: now,
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    // Simulate auto-reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "system",
          text: "Obrigado pela mensagem! O profissional foi notificado e responderá em breve.",
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-base tracking-tight text-foreground">
              {professional.name}
            </h1>
            <p className="text-xs text-muted-foreground">Solicitar serviço</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-medium">
            <Shield size={10} />
            Protegido
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "client" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                msg.sender === "client"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : msg.sender === "warning"
                  ? "bg-destructive/10 border border-destructive/20 text-foreground rounded-bl-sm"
                  : "bg-card border border-border text-foreground rounded-bl-sm"
              }`}
            >
              {msg.sender === "warning" && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={12} className="text-destructive" />
                  <span className="text-[10px] font-display text-destructive uppercase tracking-wider">Aviso de segurança</span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.sender === "client" ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Descreva o serviço que você precisa..."
            className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
          <Shield size={8} />
          Comunicação protegida pela plataforma PROFIX
        </p>
      </div>
    </div>
  );
};

export default QuoteRequest;
