import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

/** Returns whether push is supported and permission state */
export function usePushSupport() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => {
      if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
      return Notification.permission;
    }
  );

  return { permission, setPermission };
}

/** Returns whether the current user has an active push subscription */
export function useHasPushSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["push-subscription", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { count } = await supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return (count ?? 0) > 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Subscribes the browser to Web Push and saves to DB */
export function useEnablePush() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { setPermission } = usePushSupport();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push não suportado neste navegador");
      }

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Permissão negada");

      // Get SW registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      const keys = json.keys as { p256dh: string; auth: string };

      // Upsert into DB
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: "user_id,endpoint" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["push-subscription", user?.id] });
    },
  });
}

/** Sends a push notification to a specific user via the edge function */
export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; type?: string; url?: string }
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!supabaseUrl || !supabaseKey) return;
  await fetch(`${supabaseUrl}/functions/v1/push-notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ user_id: userId, ...payload }),
  });
}

/** Unsubscribes and removes from DB */
export function useDisablePush() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["push-subscription", user?.id] });
    },
  });
}
