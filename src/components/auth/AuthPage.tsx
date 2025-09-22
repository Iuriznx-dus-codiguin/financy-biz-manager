import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, Phone } from 'lucide-react';
import financyLogo from '@/assets/financy-logo.png';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    email: '',
    password: '',
    nomeCompleto: '',
    telefone: ''
  });

  const isValidEmail = (text: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  };

  const isValidPhone = (text: string) => {
    // Remove caracteres não numéricos para validação
    const numbers = text.replace(/\D/g, '');
    return numbers.length >= 10 && numbers.length <= 11;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // Determinar se é email ou telefone
        const loginField = formData.emailOrPhone.trim();
        let loginEmail = '';

        if (isValidEmail(loginField)) {
          // É um email, usar diretamente
          loginEmail = loginField;
        } else if (isValidPhone(loginField)) {
          // É um telefone, buscar o email correspondente na tabela profiles
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('telefone', loginField)
            .single();

          if (profileError || !profileData?.email) {
            setError('Telefone não encontrado no sistema');
            return;
          }
          
          loginEmail = profileData.email;
        } else {
          setError('Por favor, insira um email ou telefone válido');
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Email/telefone ou senha incorretos');
          } else {
            setError(error.message);
          }
          return;
        }

        if (data.user) {
          window.location.href = '/';
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              nome_completo: formData.nomeCompleto,
              telefone: formData.telefone
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

        if (data.user) {
          setMessage('Conta criada com sucesso! Verifique seu email para confirmar.');
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
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        setError('Erro ao fazer login com Google: ' + error.message);
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/10 dark:via-background dark:to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de background */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/3 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>
      
      {/* Container principal */}
      <div className="relative z-10 w-full max-w-lg">
        <Card className="rounded-3xl shadow-2xl backdrop-blur-md bg-card/95 border border-border/50 overflow-hidden">
          {/* Header com logo */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-8 py-12 text-center relative">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
            <div className="relative z-10 space-y-4">
              <div className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-lg ring-1 ring-white/20">
                <img 
                  src={financyLogo}
                  alt="Financy" 
                  className="w-16 h-16 object-contain filter brightness-0 invert"
                />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-primary-foreground font-inter">
                  {isLogin ? 'Bem-vindo de volta!' : 'Bem-vindo ao Financy'}
                </h1>
                <p className="text-primary-foreground/80 text-lg font-medium">
                  {isLogin ? 'Acesse sua conta para continuar' : 'Sua jornada financeira começa aqui'}
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-8 space-y-6">
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
              className="w-full rounded-2xl h-14 text-base font-semibold border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group"
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
                  Ou continue com email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="nomeCompleto" className="text-sm font-medium text-foreground">Nome Completo</Label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="nomeCompleto"
                      type="text"
                      placeholder="Seu nome completo"
                      value={formData.nomeCompleto}
                      onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                      className="rounded-2xl h-14 pl-12 pr-4 border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm hover:bg-background/70 focus:bg-background text-base"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor={isLogin ? "emailOrPhone" : "email"} className="text-sm font-medium text-foreground">
                  {isLogin ? 'Email ou Telefone' : 'Email'}
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id={isLogin ? "emailOrPhone" : "email"}
                    type={isLogin ? "text" : "email"}
                    placeholder={isLogin ? "seu@email.com ou (11) 99999-9999" : "seu@email.com"}
                    value={isLogin ? formData.emailOrPhone : formData.email}
                    onChange={(e) => handleInputChange(isLogin ? 'emailOrPhone' : 'email', e.target.value)}
                    className="rounded-2xl h-14 pl-12 pr-4 border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm hover:bg-background/70 focus:bg-background text-base"
                    required
                  />
                </div>
                {isLogin && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>Use seu email ou telefone para entrar</span>
                  </p>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-sm font-medium text-foreground">Telefone</Label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="telefone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', e.target.value)}
                      className="rounded-2xl h-14 pl-12 pr-4 border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm hover:bg-background/70 focus:bg-background text-base"
                      required={!isLogin}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>Será usado como opção alternativa de login</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="rounded-2xl h-14 pl-12 pr-12 border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm hover:bg-background/70 focus:bg-background text-base"
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
                {!isLogin && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Mínimo de 6 caracteres
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-2xl h-16 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/25 transform hover:-translate-y-0.5 active:translate-y-0"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isLogin ? 'Entrando...' : 'Criando conta...'}
                  </>
                ) : (
                  isLogin ? 'Entrar na minha conta' : 'Criar minha conta'
                )}
              </Button>
            </form>

            <div className="text-center pt-4">
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setMessage(null);
                  setFormData({ emailOrPhone: '', email: '', password: '', nomeCompleto: '', telefone: '' });
                }}
                className="text-primary font-medium hover:text-primary/80 transition-colors text-base"
                disabled={loading || googleLoading}
              >
                {isLogin 
                  ? 'Não tem uma conta? Cadastre-se gratuitamente' 
                  : 'Já tem uma conta? Faça login'
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rodapé informativo */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="text-primary hover:text-primary/80 font-medium">Termos de Uso</a>{' '}
            e{' '}
            <a href="#" className="text-primary hover:text-primary/80 font-medium">Política de Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  );
};