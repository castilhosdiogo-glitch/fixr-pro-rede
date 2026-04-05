import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type KycStatus = "pending" | "under_review" | "approved" | "rejected";
export type DocumentType = "cpf" | "rg" | "cnh";

export interface KycSubmission {
  id: string;
  user_id: string;
  full_legal_name: string;
  document_type: DocumentType;
  document_number: string;
  selfie_path: string | null;
  document_front_path: string | null;
  document_back_path: string | null;
  status: KycStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface KycFormData {
  full_legal_name: string;
  document_type: DocumentType;
  document_number: string;
  selfie: File | null;
  document_front: File | null;
  document_back: File | null;
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadKycFile(
  userId: string,
  slot: "selfie" | "document_front" | "document_back",
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${slot}.${ext}`;
  const { error } = await supabase.storage
    .from("kyc-documents")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Own KYC submission status */
export function useMyKyc() {
  const { user } = useAuth();
  return useQuery<KycSubmission | null>({
    queryKey: ["kyc", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_submissions")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as KycSubmission | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Submit or resubmit KYC */
export function useSubmitKyc() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (form: KycFormData) => {
      const uid = user!.id;

      // Upload files in parallel
      const [selfiePath, frontPath, backPath] = await Promise.all([
        form.selfie ? uploadKycFile(uid, "selfie", form.selfie) : Promise.resolve(null),
        form.document_front ? uploadKycFile(uid, "document_front", form.document_front) : Promise.resolve(null),
        form.document_back ? uploadKycFile(uid, "document_back", form.document_back) : Promise.resolve(null),
      ]);

      const payload = {
        user_id: uid,
        full_legal_name: form.full_legal_name.trim(),
        document_type: form.document_type,
        document_number: form.document_number.trim(),
        selfie_path: selfiePath,
        document_front_path: frontPath,
        document_back_path: backPath,
        status: "pending" as KycStatus,
        rejection_reason: null,
      };

      const { data, error } = await supabase
        .from("kyc_submissions")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as KycSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc", user?.id] });
    },
  });
}

/** Get signed URL to preview an uploaded KYC file */
export function useKycFileUrl(path: string | null) {
  return useQuery<string | null>({
    queryKey: ["kyc-file", path],
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(path, 60 * 10); // 10 min
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 9 * 60 * 1000, // 9 min (before URL expires)
  });
}

// ─── Admin hooks ─────────────────────────────────────────────────────────────

/** Admin: list all pending/under_review KYC submissions */
export function useAdminKycQueue() {
  return useQuery<KycSubmission[]>({
    queryKey: ["kyc-admin-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_submissions")
        .select("*")
        .in("status", ["pending", "under_review"])
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as KycSubmission[];
    },
    staleTime: 30_000,
  });
}

/** Admin: approve or reject a KYC submission */
export function useAdminReviewKyc() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      rejection_reason,
    }: {
      id: string;
      action: "approved" | "rejected";
      rejection_reason?: string;
    }) => {
      const { error } = await supabase
        .from("kyc_submissions")
        .update({
          status: action,
          rejection_reason: rejection_reason ?? null,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc-admin-queue"] });
    },
  });
}
