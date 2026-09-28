import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import financyLogoDark from '@/assets/financy-logo-new-dark.png';

export const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nomeCompleto: '',
  });

  const isValidEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const trimmedEmail = formData.email.trim().toLowerCase();

      if (!isValidEmail(trimmedEmail)) {
        setError('Informe um email válido.');
        return;
      }

      if (activeTab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Email ou senha incorretos.');
          } else if (error.message.toLowerCase().includes('email not confirmed')) {
            setError('Confirme seu email antes de fazer login. Verifique sua caixa de entrada (e spam).');
          } else {
            setError(error.message);
          }
          return;
        }

        if (data.session) {
          window.location.replace('/dashboard');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { nome_completo: formData.nomeCompleto.trim() },
          },
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            setError('Este email já está cadastrado. Tente fazer login.');
          } else {
            setError(error.message);
          }
          return;
        }

        if (data.session) {
          window.location.replace('/dashboard');
          return;
        }

        if (data.user) {
          setMessage('Conta criada! Enviamos um link de confirmação para seu email. Clique nele para entrar no app.');
        }
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });

      if (error) setError('Erro ao fazer login com Google: ' + error.message);
    } catch {
      setError('Erro inesperado ao fazer login com Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="dark auth-page w-full !bg-[hsl(240_10%_3.9%)] flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10 relative">
      {/* Ambient gradient — único, suave */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.18) 0%, transparent 70%), radial-gradient(50% 40% at 50% 100%, hsl(var(--primary) / 0.10) 0%, transparent 70%)',
        }}
      />
      {/* Grid pattern sutil */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.025)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + tagline */}
        <div className="text-center mb-6 sm:mb-8">
          <img
            src={financyLogoDark}
            alt="Financy"
            className="mx-auto w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-xl"
          />
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-foreground mt-2 tracking-tight">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Gestão financeira inteligente para pessoas e negócios
          </p>
        </div>

        <Card className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/40">
          <CardContent className="p-5 sm:p-7 space-y-5">
            {error && (
              <Alert variant="destructive" className="rounded-xl border-destructive/30 bg-destructive/10">
                <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="rounded-xl border-primary/30 bg-primary/10 text-primary">
                <AlertDescription className="text-sm font-medium">{message}</AlertDescription>
              </Alert>
            )}

            {/* Google */}
            <Button
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              variant="outline"
              className="w-full h-11 rounded-xl border-border/70 bg-background/40 hover:bg-background/70 text-sm font-medium transition-all"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando com Google...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continuar com Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  ou com email
                </span>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as 'login' | 'signup');
                setError(null);
                setMessage(null);
                setFormData({ email: '', password: '', nomeCompleto: '' });
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-10 rounded-xl bg-muted/40 p-1">
                <TabsTrigger
                  value="login"
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  Criar conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-xs font-medium text-foreground">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="h-11 pl-10 rounded-xl bg-background/40 border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-xs font-medium text-foreground">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Sua senha"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="h-11 pl-10 pr-10 rounded-xl bg-background/40 border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                    disabled={loading || googleLoading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar na minha conta'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-xs font-medium text-foreground">
                      Nome completo
                    </Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Como podemos te chamar?"
                        value={formData.nomeCompleto}
                        onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                        className="h-11 pl-10 rounded-xl bg-background/40 border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-xs font-medium text-foreground">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="h-11 pl-10 rounded-xl bg-background/40 border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-xs font-medium text-foreground">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Mínimo de 6 caracteres"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="h-11 pl-10 pr-10 rounded-xl bg-background/40 border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                    disabled={loading || googleLoading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando sua conta...
                      </>
                    ) : (
                      'Criar minha conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/40 border border-border/40 backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
              Seguro & criptografado
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground text-center max-w-xs leading-relaxed">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="text-primary hover:underline font-medium">Termos de Uso</a>{' '}
            e{' '}
            <a href="#" className="text-primary hover:underline font-medium">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
};
