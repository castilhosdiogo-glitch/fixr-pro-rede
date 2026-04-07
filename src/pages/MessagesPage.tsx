import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, MessageSquare, Send, AlertTriangle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";
import { usePlanGate } from "@/hooks/usePlanGate";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { MediaPicker } from "@/components/chat/MediaPicker";
import { MediaMessage } from "@/components/chat/MediaMessage";
import { PlanUpgradePrompt } from "@/components/chat/PlanUpgradePrompt";
import { sendPushNotification } from "@/hooks/usePushNotifications";

type MessageType = "texto" | "audio" | "foto" | "video";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean | null;
  tipo: MessageType;
  arquivo_url?: string | null;
  duracao?: number | null;
}

interface PartnerProfile {
  user_id: string;
  full_name: string;
}

const BLOCKED_PATTERNS = [
  /\b\d{2,3}[\s.-]?\d{4,5}[\s.-]?\d{4}\b/,
  /\b\(\d{2,3}\)\s?\d{4,5}-?\d{4}\b/,
  /whatsapp|whats\s?app|wpp|zap/i,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  /https?:\/\/[^\s]+/i,
  /www\.[^\s]+/i,
  /instagram|facebook|telegram|tiktok/i,
];

const containsBlockedContent = (text: string) =>
  BLOCKED_PATTERNS.some((p) => p.test(text));

const PUSH_LABELS: Record<MessageType, string> = {
  texto: "Nova mensagem",
  audio: "🎵 Áudio recebido",
  foto: "📷 Foto recebida",
  video: "🎬 Vídeo recebido",
};

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isProfessional = profile?.user_type === "professional";
  const { canChat, upgradeMessage, plan } = usePlanGate();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [blockedWarning, setBlockedWarning] = useState(false);
  const [mediaMode, setMediaMode] = useState<"none" | "audio" | "foto" | "video">("none");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: allMessages = [] } = useQuery<Message[]>({
    queryKey: ["all-messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user,
  });

  const partnerIds = useMemo(() => {
    if (!user) return [];
    const ids = new Set<string>();
    allMessages.forEach((m) => {
      if (m.sender_id !== user.id) ids.add(m.sender_id);
      if (m.receiver_id !== user.id) ids.add(m.receiver_id);
    });
    return Array.from(ids);
  }, [allMessages, user]);

  const { data: partnerProfiles = [] } = useQuery<PartnerProfile[]>({
    queryKey: ["partner-profiles", partnerIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", partnerIds);
      if (error) throw error;
      return data as PartnerProfile[];
    },
    enabled: partnerIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    partnerProfiles.forEach((p) => { map[p.user_id] = p.full_name; });
    return map;
  }, [partnerProfiles]);

  const conversations = useMemo(() => {
    if (!user) return [];
    const convMap: Record<string, { lastMsg: Message; unread: number }> = {};
    allMessages.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap[partnerId]) convMap[partnerId] = { lastMsg: m, unread: 0 };
      if (!m.is_read && m.receiver_id === user.id) convMap[partnerId].unread++;
    });
    return Object.entries(convMap)
      .map(([partnerId, { lastMsg, unread }]) => ({
        partnerId,
        partnerName: profileMap[partnerId] || "Usuário",
        lastMessage: lastMsg.tipo !== "texto" ? `[${lastMsg.tipo}]` : lastMsg.content,
        lastMessageAt: lastMsg.created_at,
        unread,
      }))
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [allMessages, user, profileMap]);

  const { data: conversationMessages = [] } = useQuery<Message[]>({
    queryKey: ["conversation", user?.id, selectedPartnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${selectedPartnerId}),and(sender_id.eq.${selectedPartnerId},receiver_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;

      const unreadIds = (data as Message[])
        .filter((m) => m.receiver_id === user!.id && !m.is_read)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ is_read: true }).in("id", unreadIds);
        queryClient.invalidateQueries({ queryKey: ["all-messages", user!.id] });
      }
      return data as Message[];
    },
    enabled: !!user && !!selectedPartnerId,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["all-messages", user.id] });
        if (selectedPartnerId) queryClient.invalidateQueries({ queryKey: ["conversation", user.id, selectedPartnerId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedPartnerId, queryClient]);

  useEffect(() => {
    if (selectedPartnerId) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages.length, selectedPartnerId]);

  const insertMessage = async (payload: {
    tipo: MessageType;
    content: string;
    arquivo_url?: string;
    duracao?: number;
  }) => {
    if (!user || !selectedPartnerId) return;
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedPartnerId,
      content: payload.content,
      tipo: payload.tipo,
      arquivo_url: payload.arquivo_url ?? null,
      duracao: payload.duracao ?? null,
    });

    // Push notification ao destinatário
    if (payload.tipo !== "texto") {
      try {
        await sendPushNotification(selectedPartnerId, {
          title: PUSH_LABELS[payload.tipo],
          body: `${profile?.full_name ?? "Alguém"} enviou um ${payload.tipo}`,
          type: `${payload.tipo}_recebido`,
        });
      } catch { /* non-fatal */ }
    }

    queryClient.invalidateQueries({ queryKey: ["conversation", user.id, selectedPartnerId] });
    queryClient.invalidateQueries({ queryKey: ["all-messages", user.id] });
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !selectedPartnerId || sending) return;
    if (containsBlockedContent(input.trim())) {
      setBlockedWarning(true);
      setTimeout(() => setBlockedWarning(false), 4000);
      return;
    }
    setBlockedWarning(false);
    setSending(true);
    await insertMessage({ tipo: "texto", content: input.trim() });
    setInput("");
    setSending(false);
  };

  const handleAudioSend = async (url: string, duration: number) => {
    await insertMessage({ tipo: "audio", content: "[audio]", arquivo_url: url, duracao: duration });
    setMediaMode("none");
  };

  const handleMediaSend = async (tipo: "foto" | "video", url: string) => {
    await insertMessage({ tipo, content: `[${tipo}]`, arquivo_url: url });
    setMediaMode("none");
  };

  if (!user) { navigate("/auth"); return null; }

  // ─── Individual conversation view ────────────────────────────────────────────
  if (selectedPartnerId) {
    const partnerName = profileMap[selectedPartnerId] || "Usuário";

    return (
      <div className="flex flex-col h-screen bg-background">
        <SEO title={`Conversa com ${partnerName} | Fixr`} />

        <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-4 max-w-lg mx-auto">
            <button
              onClick={() => { setSelectedPartnerId(null); setMediaMode("none"); }}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground">
                {partnerName.toUpperCase()}
              </h1>
              <p className="text-[9px] font-black uppercase tracking-widest text-primary mt-0.5 opacity-70 flex items-center gap-1">
                <Shield size={9} /> CONVERSA SEGURA
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">
          {conversationMessages.length === 0 && (
            <div className="text-center py-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">INICIE A CONVERSA</p>
            </div>
          )}
          {conversationMessages.map((msg) => {
            const isMine = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl border-2 ${
                  isMine ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/10 border-border text-foreground"
                }`}>
                  <MediaMessage
                    tipo={msg.tipo ?? "texto"}
                    content={msg.content}
                    arquivo_url={msg.arquivo_url}
                    duracao={msg.duracao}
                    isMine={isMine}
                  />
                  <p className={`text-[9px] mt-2 font-black uppercase tracking-widest ${isMine ? "text-primary-foreground/50 text-right" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-border bg-background p-4 pb-10 max-w-lg mx-auto w-full space-y-3">
          {blockedWarning && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-destructive bg-background">
              <AlertTriangle size={14} className="text-destructive flex-shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-destructive leading-tight">
                Informações de contato só podem ser compartilhadas após confirmação do serviço.
              </p>
            </div>
          )}

          {/* Media mode indicators */}
          {mediaMode === "audio" && !canChat("audio") && (
            <PlanUpgradePrompt message={upgradeMessage("audio")} compact />
          )}
          {mediaMode === "foto" && !canChat("foto") && (
            <PlanUpgradePrompt message={upgradeMessage("foto")} compact />
          )}
          {mediaMode === "video" && !canChat("video") && (
            <PlanUpgradePrompt message={upgradeMessage("video")} compact />
          )}

          {/* Input area */}
          <div className="flex items-center gap-2">
            {/* Audio */}
            {mediaMode === "audio" && canChat("audio") ? (
              <AudioRecorder
                onSend={handleAudioSend}
                disabled={sending}
              />
            ) : mediaMode !== "foto" && mediaMode !== "video" ? (
              <>
                {/* Text input + action buttons */}
                <div className="flex items-center gap-0 flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="DIGITE SUA MENSAGEM..."
                    className="flex-1 bg-secondary/10 border-2 border-border border-r-0 rounded-l-2xl px-4 py-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="w-14 h-[56px] bg-primary flex items-center justify-center text-primary-foreground rounded-r-2xl disabled:opacity-20 transition-all active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            ) : null}

            {/* Foto picker */}
            {mediaMode === "foto" && canChat("foto") && (
              <MediaPicker type="foto" onSend={(url) => handleMediaSend("foto", url)} />
            )}

            {/* Vídeo picker */}
            {mediaMode === "video" && canChat("video") && (
              <MediaPicker type="video" onSend={(url) => handleMediaSend("video", url)} />
            )}
          </div>

          {/* Media action buttons (only in text mode) */}
          {mediaMode === "none" && isProfessional && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMediaMode(canChat("audio") ? "audio" : "audio")}
                title={canChat("audio") ? "Gravar áudio" : upgradeMessage("audio")}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 active:scale-95 ${
                  canChat("audio") ? "bg-secondary/20 text-muted-foreground hover:text-primary hover:bg-primary/10" : "bg-secondary/10 text-muted-foreground/30"
                }`}
              >
                {/* Mic icon inline to avoid import issues */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
              <button
                onClick={() => setMediaMode("foto")}
                title={canChat("foto") ? "Enviar foto" : upgradeMessage("foto")}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 active:scale-95 ${
                  canChat("foto") ? "bg-secondary/20 text-muted-foreground hover:text-primary hover:bg-primary/10" : "bg-secondary/10 text-muted-foreground/30"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
              <button
                onClick={() => setMediaMode("video")}
                title={canChat("video") ? "Enviar vídeo" : upgradeMessage("video")}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 active:scale-95 ${
                  canChat("video") ? "bg-secondary/20 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10" : "bg-secondary/10 text-muted-foreground/30"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </button>
              {!canChat("audio") && plan === "explorador" && (
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">
                  MÍDIA — PARCEIRO+
                </p>
              )}
            </div>
          )}

          {/* Cancel media mode */}
          {mediaMode !== "none" && (
            <button
              onClick={() => setMediaMode("none")}
              className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              ← VOLTAR AO TEXTO
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Conversation list view ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Mensagens | Fixr" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-6 max-w-lg mx-auto">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground">
            CENTRAL DE MENSAGENS
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-border flex items-center justify-center mb-8">
              <MessageSquare size={32} className="text-primary" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {isProfessional ? "NENHUMA MENSAGEM DE CLIENTES" : "NENHUMA CONVERSA INICIADA"}
            </p>
            <p className="text-xs text-muted-foreground/70 max-w-[280px]">
              {isProfessional
                ? "As mensagens dos clientes que solicitarem seus serviços aparecerão aqui."
                : "Ao solicitar um orçamento, suas conversas com profissionais aparecerão aqui."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((conv) => (
              <button
                key={conv.partnerId}
                onClick={() => setSelectedPartnerId(conv.partnerId)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-card border-2 border-border hover:border-primary transition-colors active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-lg uppercase flex-shrink-0">
                  {conv.partnerName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-black text-xs uppercase tracking-widest text-foreground truncate">
                      {conv.partnerName.toUpperCase()}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex-shrink-0">
                      {new Date(conv.lastMessageAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-black flex-shrink-0">
                    {conv.unread}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MessagesPage;
