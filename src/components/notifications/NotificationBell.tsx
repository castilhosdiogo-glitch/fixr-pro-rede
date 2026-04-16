import { Bell, CheckCheck, Clock, Star, ThumbsUp, Zap } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useNotifications,
  useNotificationsRealtime,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
  type AppNotification,
} from "@/hooks/useNotifications";
import { Link } from "react-router-dom";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  service_accepted:  { icon: <Zap size={12} />,        color: "text-primary" },
  service_completed: { icon: <CheckCheck size={12} />,  color: "text-emerald-500" },
  review_available:  { icon: <Star size={12} />,        color: "text-yellow-500" },
  review_received:   { icon: <ThumbsUp size={12} />,    color: "text-blue-500" },
};

function NotificationItem({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const cfg = TYPE_CONFIG[n.type] ?? { icon: <Bell size={12} />, color: "text-muted-foreground" };
  const isUnread = !n.read_at;

  const inner = (
    <div
      onClick={() => !n.read_at && onRead(n.id)}
      className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/10 transition-colors cursor-pointer ${
        isUnread ? "bg-primary/5" : ""
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-foreground leading-tight">
          {n.title}
        </p>
        <p className="text-[9px] font-medium text-muted-foreground mt-0.5 leading-snug">
          {n.body}
        </p>
        <p className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/50 mt-1 flex items-center gap-1">
          <Clock size={7} />
          {new Date(n.created_at).toLocaleString("pt-BR", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      {isUnread && (
        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
      )}
    </div>
  );

  // If it's a review_available notification, wrap in a link to client dashboard
  if (n.type === "review_available") {
    return <Link to="/meu-painel">{inner}</Link>;
  }
  if (n.type === "service_accepted") {
    return <Link to="/meu-painel">{inner}</Link>;
  }
  return inner;
}

export default function NotificationBell() {
  useNotificationsRealtime();
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const unread = useUnreadCount();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAll } = useMarkAllRead();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/20 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={18} className="text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-black flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 z-50 w-80 bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  Notificações {unread > 0 && `(${unread})`}
                </span>
                {unread > 0 && (
                  <button
                    onClick={() => markAll()}
                    className="text-[8px] font-black uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                  >
                    Marcar tudo lido
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Nenhuma notificação
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      n={n}
                      onRead={(id) => {
                        markRead(id);
                        setOpen(false);
                      }}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
