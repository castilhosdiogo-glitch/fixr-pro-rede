import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, MessageSquare, Send, AlertTriangle, Shield, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useUploadChatMedia } from "@/hooks/useChatMedia";
import AudioRecorder from "@/components/chat/AudioRecorder";
import MediaPicker from "@/components/chat/MediaPicker";
import MediaMessage from "@/components/chat/MediaMessage";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean | null;
  tipo?: string;
  arquivo_url?: string;
  duracao?: number;
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

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isProfessional = profile?.user_type === "professional";

  const planGate = usePlanGate();
  const uploadMedia = useUploadChatMedia();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [blockedWarning, setBlockedWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all messages for this user (used for conversation list)
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

  // Extract unique partner IDs from all messages
  const partnerIds = useMemo(() => {
    if (!user) return [];
    const ids = new Set<string>();
    allMessages.forEach((m) => {
      if (m.sender_id !== user.id) ids.add(m.sender_id);
      if (m.receiver_id !== user.id) ids.add(m.receiver_id);
    });
    return Array.from(ids);
  }, [allMessages, user]);

  // Fetch profiles for all conversation partners
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

  // Build grouped conversation list from all messages
  const conversations = useMemo(() => {
    if (!user) return [];
    const convMap: Record<string, { lastMsg: Message; unread: number }> = {};
    allMessages.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap[partnerId]) {
        convMap[partnerId] = { lastMsg: m, unread: 0 };
      }
      if (!m.is_read && m.receiver_id === user.id) {
        convMap[partnerId].unread++;
      }
    });
    return Object.entries(convMap)
      .map(([partnerId, { lastMsg, unread }]) => ({
        partnerId,
        partnerName: profileMap[partnerId] || "Usuário",
        lastMessage: lastMsg.content,
        lastMessageAt: lastMsg.created_at,
        unread,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
  }, [allMessages, user, profileMap]);

  // Fetch messages for the open conversation
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

      // Mark incoming unread messages as read
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

  // Real-time subscription for incoming messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-messages", user.id] });
          if (selectedPartnerId) {
            queryClient.invalidateQueries({
              queryKey: ["conversation", user.id, selectedPartnerId],
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedPartnerId, queryClient]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (selectedPartnerId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages.length, selectedPartnerId]);

  const handleSend = async () => {
    if (!input.trim() || !user || !selectedPartnerId || sending) return;

    if (containsBlockedContent(input.trim())) {
      setBlockedWarning(true);
      setTimeout(() => setBlockedWarning(false), 4000);
      return;
    }

    setBlockedWarning(false);
    setSending(true);

    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedPartnerId,
      content: input.trim(),
      tipo: "text",
    });

    setInput("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["conversation", user.id, selectedPartnerId] });
    queryClient.invalidateQueries({ queryKey: ["all-messages", user.id] });
  };

  const handleSendMedia = async (blob: Blob, type: "audio" | "photo" | "video", duration?: number) => {
    if (!user || !selectedPartnerId || sending) return;
    setSending(true);

    try {
      const url = await uploadMedia.mutateAsync({ file: blob, type });

      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedPartnerId,
        content: type === "audio" ? "Mensagem de áudio" : type === "photo" ? "Foto" : "Vídeo",
        tipo: type,
        arquivo_url: url,
        duracao: duration ?? null,
      });

      queryClient.invalidateQueries({ queryKey: ["conversation", user.id, selectedPartnerId] });
      queryClient.invalidateQueries({ queryKey: ["all-messages", user.id] });
    } catch {
      // upload failed silently
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  // ─── Individual conversation view ────────────────────────────────────────────
  if (selectedPartnerId) {
    const partnerName = profileMap[selectedPartnerId] || "Usuário";

    return (
      <div className="flex flex-col h-screen bg-background">
        <SEO title={`Conversa com ${partnerName} | Fixr`} />

        <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-4 max-w-lg mx-auto">
            <button
              onClick={() => setSelectedPartnerId(null)}
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
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                INICIE A CONVERSA
              </p>
            </div>
          )}
          {conversationMessages.map((msg) => {
            const isMine = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl border-2 ${
                    isMine
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/10 border-border text-foreground"
                  }`}
                >
                  {msg.tipo && msg.tipo !== "text" && msg.arquivo_url ? (
                    <MediaMessage
                      tipo={msg.tipo as "audio" | "photo" | "video"}
                      arquivoUrl={msg.arquivo_url}
                      duracao={msg.duracao}
                      isMine={isMine}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                  <p
                    className={`text-[9px] mt-2 font-black uppercase tracking-widest ${
                      isMine ? "text-primary-foreground/50 text-right" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-border bg-background p-4 pb-10 max-w-lg mx-auto w-full">
          {blockedWarning && (
            <div className="flex items-center gap-2 mb-3 px-4 py-3 rounded-2xl border-2 border-destructive bg-background">
              <AlertTriangle size={14} className="text-destructive flex-shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-destructive leading-tight">
                Informações de contato só podem ser compartilhadas após confirmação do serviço.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <AudioRecorder
              onRecordComplete={(blob, duration) => handleSendMedia(blob, "audio", duration)}
              disabled={!planGate.can("chatAudio") || sending || uploadMedia.isPending}
            />
            <MediaPicker
              onMediaSelect={(file, type) => handleSendMedia(file, type)}
              canPhoto={planGate.can("chatPhoto")}
              canVideo={planGate.can("chatVideo")}
              disabled={sending || uploadMedia.isPending}
            />
            {uploadMedia.isPending && (
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                ENVIANDO...
              </span>
            )}
            {!planGate.can("chatAudio") && (
              <button
                onClick={() => navigate("/planos")}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
              >
                <Lock size={10} /> PROFISSIONAL P/ ÁUDIO E VÍDEO
              </button>
            )}
          </div>
          <div className="flex items-center gap-0">
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

