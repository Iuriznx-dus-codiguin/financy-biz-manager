import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, Sparkles } from 'lucide-react';
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
    nomeCompleto: ''
  });

  const isValidEmail = (text: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  };

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
            setError('Email ou senha incorretos');
          } else if (error.message.toLowerCase().includes('email not confirmed')) {
            setError('Confirme seu email antes de fazer login. Verifique sua caixa de entrada (e spam).');
          } else {
            setError(error.message);
          }
          return;
        }

        if (data.session) {
          // Vai direto para /dashboard (AuthenticatedLayout cuida de gating de assinatura)
          window.location.replace('/dashboard');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              nome_completo: formData.nomeCompleto.trim()
            }
          }
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            setError('Este email já está cadastrado. Tente fazer login.');
          } else {
            setError(error.message);
          }
          return;
        }

        // Se confirmação de email estiver desativada, já vem sessão — manda pro app.
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) {
        setError('Erro ao fazer login com Google: ' + error.message);
      } else {
      }
    } catch (err) {
      setError('Erro inesperado ao fazer login com Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="dark auth-page w-full !bg-gradient-to-br !from-gray-950 !via-gray-900 !to-gray-950 flex items-center justify-center py-6 px-3 sm:p-6 lg:p-8 relative">
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      {/* Elementos decorativos de background com animação - ajustados para mobile */}
      <div className="absolute top-0 left-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-96 lg:h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-96 lg:h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-24 h-24 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-primary/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      
      {/* Floating particles - ocultos em mobile para melhor performance */}
      <div className="hidden sm:block absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-ping"></div>
      <div className="hidden sm:block absolute top-3/4 right-1/4 w-2 h-2 bg-primary/30 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
      <div className="hidden sm:block absolute top-1/2 right-1/3 w-2 h-2 bg-primary/30 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
      
      {/* Container principal */}
      <div className="relative z-10 w-full max-w-lg px-2">
        {/* Logo e título no topo */}
        <div className="text-center mb-4 sm:mb-6 space-y-2 sm:space-y-3">
          {/* Logo */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative mx-auto">
              <img 
                src={financyLogoDark}
                alt="Financy" 
                className="w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 object-contain drop-shadow-2xl mx-auto"
              />
            </div>
          </div>
          
          {/* Subtítulo */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-4 sm:w-8 bg-gradient-to-r from-transparent to-primary/50"></div>
              <p className="text-gray-300 text-xs sm:text-base font-medium">
                Gestão Financeira Inteligente
              </p>
              <div className="h-px w-4 sm:w-8 bg-gradient-to-l from-transparent to-primary/50"></div>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl bg-card/90 border border-primary/10 overflow-hidden relative">
          {/* Animated gradient border effect */}
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-50 blur-xl"></div>
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-primary/5 to-transparent"></div>
          <CardContent className="relative z-10 p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-5">
            {error && (
              <Alert className="border-destructive/20 bg-destructive/5 text-destructive rounded-xl">
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="border-primary/20 bg-primary/5 text-primary rounded-xl">
                <AlertDescription className="font-medium">{message}</AlertDescription>
              </Alert>
            )}

            {/* Google Login Button */}
            <Button
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              variant="outline"
              className="w-full rounded-xl sm:rounded-2xl h-11 sm:h-13 text-xs sm:text-base font-semibold border-2 border-border/50 hover:border-primary/30 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:bg-background/70 group"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Entrando com Google...
                </>
              ) : (
                <>
                  <svg className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continuar com Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-card px-4 text-muted-foreground font-medium">
                  Ou
                </span>
              </div>
            </div>

            {/* Tabs para Login e Cadastro */}
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v as 'login' | 'signup');
              setError(null);
              setMessage(null);
              setFormData({ email: '', password: '', nomeCompleto: '' });
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto min-h-[44px] rounded-xl sm:rounded-2xl bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 backdrop-blur-sm p-1 border border-border/50">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg sm:rounded-xl text-[11px] xs:text-xs sm:text-base font-semibold data-[state=active]:bg-background/90 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/5 transition-all duration-300 py-2.5"
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="rounded-lg sm:rounded-xl text-[11px] xs:text-xs sm:text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 py-2.5"
                >
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="truncate">Criar Conta</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4 sm:mt-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
                      Email
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="rounded-xl sm:rounded-2xl h-12 sm:h-14 pl-11 sm:pl-12 pr-4 border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm hover:bg-background/70 focus:bg-background text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium text-foreground">Senha</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="rounded-xl sm:rounded-2xl h-12 sm:h-14 pl-11 sm:pl-12 pr-11 sm:pr-12 border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm hover:bg-background/70 focus:bg-background text-sm sm:text-base"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full rounded-xl sm:rounded-2xl h-11 sm:h-13 lg:h-14 text-xs sm:text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/30 transform hover:-translate-y-1 active:translate-y-0 relative overflow-hidden group"
                    disabled={loading || googleLoading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <span className="relative z-10">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar na minha conta'
                    )}
                    </span>
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4 sm:mt-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">Nome Completo</Label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={formData.nomeCompleto}
                        onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                        className="rounded-xl sm:rounded-2xl h-12 sm:h-14 pl-11 sm:pl-12 pr-4 border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm hover:bg-background/70 focus:bg-background text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                      Email
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="rounded-xl sm:rounded-2xl h-12 sm:h-14 pl-11 sm:pl-12 pr-4 border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm hover:bg-background/70 focus:bg-background text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">Senha</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Crie uma senha segura"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="rounded-xl sm:rounded-2xl h-12 sm:h-14 pl-11 sm:pl-12 pr-11 sm:pr-12 border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm hover:bg-background/70 focus:bg-background text-sm sm:text-base"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo de 6 caracteres
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full rounded-2xl h-16 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/30 transform hover:-translate-y-1 active:translate-y-0 relative overflow-hidden group"
                    disabled={loading || googleLoading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <span className="relative z-10 flex items-center justify-center">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin inline-block" />
                        <span>Criando sua conta...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5 inline-block" />
                        <span>Criar minha conta grátis</span>
                      </>
                    )}
                    </span>
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Rodapé informativo com efeito tech */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse"></div>
              <span className="text-xs text-muted-foreground font-medium">Seguro & Criptografado</span>
            </div>
            <div className="h-px w-12 bg-gradient-to-l from-transparent via-primary/30 to-transparent"></div>
          </div>
          <p className="text-muted-foreground text-xs">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="text-primary hover:text-primary/80 font-medium transition-colors">Termos de Uso</a>{' '}
            e{' '}
            <a href="#" className="text-primary hover:text-primary/80 font-medium transition-colors">Política de Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  );
};