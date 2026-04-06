import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
<<<<<<< HEAD
  profile: any | null;
=======
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
<<<<<<< HEAD
  profile: null,
=======
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
<<<<<<< HEAD
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
=======
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
        setLoading(false);
      }
    );

<<<<<<< HEAD
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
=======
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
<<<<<<< HEAD
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
=======
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
