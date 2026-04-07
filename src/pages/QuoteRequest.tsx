import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  const [input, setInput] = useState("");

  const { data: professional, isLoading } = useQuery({
    queryKey: ["professional-quote", id],
    queryFn: async () => {
      const { data: pro, error: proError } = await supabase
        .from("professional_profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (proError || !pro) throw new Error("Profissional não encontrado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", pro.user_id)
        .single();

      return {
        id: pro.id,
        name: profile?.full_name || "Profissional",
        photo: profile?.avatar_url || "",
        category: pro.category_name || "Especialista",
        rating: pro.rating || 5.0,
        reviewCount: pro.review_count || 0,
      };
    },
    enabled: !!id,
  });

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (professional && messages.length === 0) {
      setMessages([
        {
          id: "1",
          sender: "system",
          text: `OLÁ! DESCREVA BREVEMENTE O SERVIÇO QUE VOCÊ PRECISA DE ${professional.name.toUpperCase()}.`,
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [professional, messages.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Sincronizando Conexão...</p>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="bg-destructive/10 p-8 rounded-3xl border-2 border-destructive text-center max-w-xs">
          <AlertTriangle size={48} className="text-destructive mx-auto mb-6" />
          <h2 className="font-display font-black text-xs uppercase tracking-widest text-destructive mb-2">ERRO DE CONEXÃO</h2>
          <p className="text-sm text-foreground mb-8">PROFISSIONAL NÃO ENCONTRADO NO NOSSO TERMINAL.</p>
          <button 
            onClick={() => navigate('/buscar')}
            className="w-full py-4 bg-destructive text-white font-display font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-destructive/90 transition-all"
          >
            VOLTAR PARA BUSCA
          </button>
        </div>
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
      <header className="bg-background border-b border-border p-5 flex-shrink-0">
        <div className="flex items-center gap-6 max-w-lg mx-auto">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground truncate">
              ORÇAMENTO: {professional.name.toUpperCase()}
            </h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-primary mt-1 opacity-80">
              FALAR COM O PROFISSIONAL
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-secondary/20 text-foreground text-[9px] font-black uppercase tracking-widest border border-border">
            <Shield size={12} className="text-primary" />
            SEGURO
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background max-w-lg mx-auto w-full">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "client" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] px-5 py-4 rounded-2xl border-2 ${
                msg.sender === "client"
                  ? "bg-primary text-primary-foreground border-primary"
                  : msg.sender === "warning"
                  ? "bg-background border-destructive text-foreground"
                  : "bg-secondary/10 border-border text-foreground"
              } shadow-none`}
            >
              {msg.sender === "warning" && (
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive" />
                  <span className="text-[10px] font-black text-destructive uppercase tracking-[0.2em]">AVISO DE SEGURANÇA</span>
                </div>
              )}
              {msg.sender === "system" && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">SISTEMA:</span>
                </div>
              )}
              <p className={`text-sm leading-relaxed ${msg.sender === "client" ? "font-bold uppercase tracking-tight" : "font-medium"}`}>
                {msg.text.toUpperCase()}
              </p>
              <p
                className={`text-[9px] mt-4 font-black uppercase tracking-widest ${
                  msg.sender === "client" ? "text-primary-foreground/50 text-right" : "text-muted-foreground"
                }`}
              >
                ÀS: {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-background p-6 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="DESCREVA O QUE VOCÊ PRECISA..."
              className="flex-1 bg-secondary/10 border-2 border-border border-r-0 rounded-2xl px-6 py-5 text-sm font-black uppercase tracking-widest text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex-shrink-0 w-16 h-[60px] bg-primary flex items-center justify-center text-primary-foreground rounded-2xl disabled:opacity-20 transition-all active:scale-95 group"
            >
              <Send size={24} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <p className="text-[9px] font-black text-muted-foreground mt-4 text-center uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <Shield size={10} className="text-primary" />
            CONVERSA 100% SEGURA E PROTEGIDA PELA Fixr
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuoteRequest;

