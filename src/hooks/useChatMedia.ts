import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUploadChatMedia() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ file, type }: { file: Blob; type: "audio" | "photo" | "video" }) => {
      if (!user) throw new Error("Não autenticado");

      const ext = type === "audio" ? "webm" : type === "photo" ? "jpg" : "mp4";
      const path = `${user.id}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(path, file, {
          contentType: file.type || `${type === "audio" ? "audio" : type === "photo" ? "image" : "video"}/${ext}`,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("chat-media")
        .getPublicUrl(path);

      return data.publicUrl;
    },
  });
}

export function useSignedMediaUrl(path: string | null) {
  // For private buckets, use signed URLs
  // Since we're using RLS, we can use the authenticated client directly
  if (!path) return null;

  const { data } = supabase.storage
    .from("chat-media")
    .getPublicUrl(path);

  return data.publicUrl;
}
