
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ user: User | null; error: AuthError | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (event === 'SIGNED_IN') {
        toast.success('Login realizado com sucesso!');
        // Log successful login
        if (session?.user) {
          try {
            await supabase.rpc('log_security_event', {
              p_user_id: session.user.id,
              p_action: 'SUCCESSFUL_LOGIN',
              p_table_name: 'auth',
              p_risk_level: 'low'
            });
          } catch (error) {
            console.error('Erro ao registrar login:', error);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        toast.info('Logout realizado com sucesso!');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      // Check rate limit first
      const identifier = `signup_${email}`;
      const { data: rateLimitOk } = await supabase.rpc('check_auth_rate_limit', {
        p_identifier: identifier,
        p_max_attempts: 3,
        p_window_minutes: 60,
        p_block_minutes: 120
      });

      if (!rateLimitOk) {
        toast.error('Muitas tentativas de cadastro. Tente novamente mais tarde.');
        return { user: null, error: { message: 'Rate limit exceeded' } as AuthError };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        // Log failed signup attempt
        await supabase.rpc('log_security_event', {
          p_user_id: null,
          p_action: 'FAILED_SIGNUP',
          p_table_name: 'auth',
          p_new_values: { email, error_message: error.message },
          p_risk_level: 'medium'
        });
        throw error;
      }

      if (data.user && !data.session) {
        toast.info('Verifique seu email para confirmar a conta!');
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { user: null, error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Check rate limit first
      const identifier = `login_${email}`;
      const { data: rateLimitOk } = await supabase.rpc('check_auth_rate_limit', {
        p_identifier: identifier,
        p_max_attempts: 5,
        p_window_minutes: 15,
        p_block_minutes: 60
      });

      if (!rateLimitOk) {
        toast.error('Muitas tentativas de login. Tente novamente mais tarde.');
        // Log blocked login attempt
        await supabase.rpc('log_security_event', {
          p_user_id: null,
          p_action: 'BLOCKED_LOGIN_ATTEMPT',
          p_table_name: 'auth',
          p_new_values: { email, reason: 'rate_limit_exceeded' },
          p_risk_level: 'high'
        });
        return { user: null, error: { message: 'Rate limit exceeded' } as AuthError };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed login attempt
        await supabase.rpc('log_security_event', {
          p_user_id: null,
          p_action: 'FAILED_LOGIN',
          p_table_name: 'auth',
          p_new_values: { email, error_message: error.message },
          p_risk_level: 'medium'
        });
        throw error;
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { user: null, error: error as AuthError };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      toast.error('Erro ao fazer login com Google');
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        // Log logout
        await supabase.rpc('log_security_event', {
          p_user_id: user.id,
          p_action: 'LOGOUT',
          p_table_name: 'auth',
          p_risk_level: 'low'
        });
      }
      
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
