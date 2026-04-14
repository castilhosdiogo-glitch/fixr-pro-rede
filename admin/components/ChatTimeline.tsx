import { Mic, ImageIcon, Video, MessageSquare } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  tipo: string | null;
  arquivo_url: string | null;
  duracao: number | null;
  created_at: string;
};

export function ChatTimeline({
  messages,
  nameMap,
  clientId,
}: {
  messages: Message[];
  nameMap: Record<string, string>;
  clientId: string;
}) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Nenhuma mensagem trocada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const isClient = m.sender_id === clientId;
        return (
          <div
            key={m.id}
            className={cn(
              "flex flex-col",
              isClient ? "items-start" : "items-end",
            )}
          >
            <div className="text-[10px] text-slate-400 mb-1 px-1">
              {nameMap[m.sender_id] ?? "—"} · {formatDateTime(m.created_at)}
            </div>
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-3 py-2 border",
                isClient
                  ? "bg-slate-50 border-slate-200 rounded-tl-sm"
                  : "bg-brand-50 border-brand-200 rounded-tr-sm",
              )}
            >
              <MessageBody message={m} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MessageBody({ message }: { message: Message }) {
  const tipo = message.tipo ?? "text";

  if (tipo === "text") {
    return <p className="text-sm text-slate-800 whitespace-pre-wrap">{message.content}</p>;
  }

  if (tipo === "photo") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <ImageIcon size={13} />
          <span>Foto</span>
        </div>
        {message.arquivo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.arquivo_url}
            alt="Anexo"
            className="max-w-[240px] rounded-md border border-slate-200"
          />
        ) : (
          <p className="text-xs text-slate-400 italic">URL indisponível</p>
        )}
        {message.content && (
          <p className="text-sm text-slate-800">{message.content}</p>
        )}
      </div>
    );
  }

  if (tipo === "audio") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Mic size={13} />
          <span>
            Áudio
            {message.duracao ? ` · ${message.duracao}s` : ""}
          </span>
        </div>
        {message.arquivo_url ? (
          <audio controls className="max-w-[240px]" src={message.arquivo_url} />
        ) : (
          <p className="text-xs text-slate-400 italic">URL indisponível</p>
        )}
      </div>
    );
  }

  if (tipo === "video") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Video size={13} />
          <span>
            Vídeo
            {message.duracao ? ` · ${message.duracao}s` : ""}
          </span>
        </div>
        {message.arquivo_url ? (
          <video
            controls
            className="max-w-[240px] rounded-md border border-slate-200"
            src={message.arquivo_url}
          />
        ) : (
          <p className="text-xs text-slate-400 italic">URL indisponível</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <MessageSquare size={13} />
      <span>Mensagem ({tipo})</span>
    </div>
  );
}
