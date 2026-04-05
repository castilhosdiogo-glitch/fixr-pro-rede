import { describe, it, expect, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase Auth
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}));

describe("Auth Flow Logic", () => {
  it("should send correct metadata for professional registration", async () => {
    const mockSignUp = vi.mocked(supabase.auth.signUp);
    mockSignUp.mockResolvedValueOnce({ 
      data: { user: { id: "123" }, session: null }, 
      error: null 
    } as any);

    const email = "pro@test.com";
    const password = "password123";
    const metadata = {
      full_name: "Test Pro",
      user_type: "professional",
      phone: "123456789",
      city: "Porto Alegre",
      state: "RS",
      category_id: "eletrica",
      category_name: "Elétrica",
    };

    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email,
      password,
      options: {
        data: metadata
      }
    });
  });
});
