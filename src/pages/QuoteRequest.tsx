import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Mic } from "lucide-react";
import { professionals } from "@/data/mock";

interface Message {
  id: string;
  sender: "system" | "client";
  text: string;
  time: string;
}

const QuoteRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const professional = professionals.find((p) => p.id === id);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "system",
      text: `Olá ${professional?.name || "Profissional"}. Descreva brevemente o serviço que você precisa.`,
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
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "client",
      text: input.trim(),
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
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
      <header className="bg-card border-b-2 border-border p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="font-display text-base uppercase tracking-tight text-foreground">
              {professional.name}
            </h1>
            <p className="text-xs text-muted-foreground">Solicitar orçamento</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "client" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 ${
                msg.sender === "client"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border-2 border-border text-foreground"
              }`}
            >
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
      <div className="flex-shrink-0 border-t-2 border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <button className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Mic size={22} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Descreva o serviço..."
            className="flex-1 bg-background border-2 border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 p-3 bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteRequest;
