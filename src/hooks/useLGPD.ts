import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Fetch user's consent status (LGPD)
 */
export function useUserConsent() {
  const { user } = useAuth();

  return async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("user_consents")
      .select("*")
      .eq("user_id", user.id)
      .single();
    return data;
  };
}

/**
 * Request account and data deletion (LGPD Article 17)
 * Anonymizes profile, deletes messages, anonymizes reviews
 */
export function useRequestDataDeletion() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Verify password before deletion
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || "",
        password,
      });

      if (signInError) {
        throw new Error("Senha incorreta");
      }

      // Call RPC function to delete user data
      const { error } = await supabase.rpc("delete_user_data", {
        p_user_id: user.id,
      });

      if (error) throw error;

      // Sign out after deletion
      await supabase.auth.signOut();
    },
  });
}

/**
 * Request data export (GDPR/LGPD Article 20)
 * Returns JSON of user's personal data
 */
export function useExportUserData() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const [profileRes, proProfileRes, messagesRes, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id),
        supabase.from("professional_profiles").select("*").eq("user_id", user.id),
        supabase.from("messages").select("*").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`),
        supabase.from("reviews").select("*").or(`client_id.eq.${user.id},professional_id.eq.${user.id}`),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        profiles: profileRes.data,
        professional_profiles: proProfileRes.data,
        messages: messagesRes.data,
        reviews: reviewsRes.data,
      };

      // Trigger download
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Fixr-data-export-${user.id}.json`;
      link.click();
      URL.revokeObjectURL(url);

      return exportData;
    },
  });
}

