import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/data/mock";

export const useCategories = () => {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return (data || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || "Hammer",
        count: 0,
      }));
    },
    staleTime: 1000 * 60 * 10, // 10 minutos de cache
  });
};
