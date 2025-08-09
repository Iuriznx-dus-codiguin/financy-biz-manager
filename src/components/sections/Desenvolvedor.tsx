import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Code2, Copy, Key, Lock, CheckCircle, Shield, Terminal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Desenvolvedor: React.FC = () => {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false);
  const [activationKey, setActivationKey] = useState('');
  const [unlockedKeys, setUnlockedKeys] = useState<Set<number>>(new Set());
  const [inputKey, setInputKey] = useState('');
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number | null>(null);
  const { toast } = useToast();

  // Chave mestra para ativar modo desenvolvedor
  const MASTER_KEY = 'dev_master_2024_financy';

  // Verificar se modo desenvolvedor já está ativo
  useEffect(() => {
    const devMode = localStorage.getItem('financy_dev_mode');
    if (devMode === 'active') {
      setIsDeveloperMode(true);
    }
  }, []);

  const handleActivateDeveloperMode = () => {
    if (isDeveloperMode) {
      toast({
        title: "Modo Desenvolvedor Ativo",
        description: "Você já é um desenvolvedor!",
      });
      return;
    }
    setIsActivationDialogOpen(true);
  };

  const handleMasterKeySubmit = () => {
    if (activationKey === MASTER_KEY) {
      setIsDeveloperMode(true);
      localStorage.setItem('financy_dev_mode', 'active');
      setIsActivationDialogOpen(false);
      setActivationKey('');
      toast({
        title: "Modo Desenvolvedor Ativado!",
        description: "Bem-vindo à área de desenvolvimento.",
      });
    } else {
      toast({
        title: "Chave Inválida",
        description: "A chave de desenvolvedor inserida não é válida.",
        variant: "destructive",
      });
    }
  };

  // Chaves criptografadas de 20 caracteres
  const encryptedKeys = [
    'A8k9mN2pQ7xW4vB3zR6y',
    'F5jL8dE9rT1nY4hU6cV0',
    'M3wP7bG2sI9kX5oQ8fA1',
    'R6vN4kL9dF2eT8wY3cB7',
    'S1pX9mH4qL7vN2kF6rE8',
    'T9kR3bY8sW1mP5vN7qL4',
    'U2hF6pK9dL3vN8cR4wX7',
    'V7mP2kY9sW4vN6bF1qL8',
    'W4cR8pN2kF9vL3mY7bX5',
    'X1vN6kP9dF4mL8wY2cR7'
  ];

  // Chaves de acesso reais (normalmente viriam de uma API)
  const actualKeys = [
    'dev_api_key_001_secure',
    'dev_api_key_002_secure',
    'dev_api_key_003_secure',
    'dev_api_key_004_secure',
    'dev_api_key_005_secure',
    'dev_api_key_006_secure',
    'dev_api_key_007_secure',
    'dev_api_key_008_secure',
    'dev_api_key_009_secure',
    'dev_api_key_010_secure'
  ];

  const handleUnlockKey = (index: number) => {
    setSelectedKeyIndex(index);
    setInputKey('');
  };

  const handleSubmitKey = () => {
    if (selectedKeyIndex === null) return;

    // Simular validação de chave (na prática seria uma validação real)
    if (inputKey === encryptedKeys[selectedKeyIndex]) {
      setUnlockedKeys(prev => new Set([...prev, selectedKeyIndex]));
      toast({
        title: "Chave desbloqueada!",
        description: "Acesso liberado com sucesso.",
      });
      setSelectedKeyIndex(null);
      setInputKey('');
    } else {
      toast({
        title: "Chave inválida",
        description: "A chave inserida não é válida.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Chave copiada para a área de transferência.",
    });
  };

  return (
    <section id="desenvolvedor" className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Área do Desenvolvedor</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Chaves de acesso para integração com APIs e sistemas externos
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        {!isDeveloperMode ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Ativação do Modo Desenvolvedor
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Para acessar as funcionalidades de desenvolvedor, você precisa ativar o modo desenvolvedor com uma chave especial.
              </p>
              <Button onClick={handleActivateDeveloperMode} size="lg">
                <Terminal className="h-4 w-4 mr-2" />
                Ativar Modo Desenvolvedor
              </Button>
              
              <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ativar Modo Desenvolvedor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="master-key">Chave de Desenvolvedor</Label>
                      <Input
                        id="master-key"
                        value={activationKey}
                        onChange={(e) => setActivationKey(e.target.value)}
                        placeholder="Digite a chave mestra..."
                        className="mt-1"
                        type="password"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleMasterKeySubmit} className="flex-1">
                        Ativar
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsActivationDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Instruções de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Para acessar as chaves de API, você precisa inserir a chave criptografada correspondente. 
                  Cada chave liberada permite integração com diferentes serviços da plataforma Financy.
                </p>
              </CardContent>
            </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {encryptedKeys.map((encryptedKey, index) => {
            const isUnlocked = unlockedKeys.has(index);
            
            return (
              <Card key={index} className="rounded-2xl hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      API Key #{(index + 1).toString().padStart(2, '0')}
                    </span>
                    {isUnlocked ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="bg-muted rounded-lg p-3">
                    <Label className="text-xs text-muted-foreground">Chave Criptografada</Label>
                    <code className="block text-sm font-mono text-foreground mt-1 break-all">
                      {encryptedKey}
                    </code>
                  </div>
                  
                  {isUnlocked ? (
                    <div className="space-y-2">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <Label className="text-xs text-green-700 dark:text-green-300">Chave de Acesso</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="block text-sm font-mono text-green-800 dark:text-green-200 flex-1 break-all">
                            {actualKeys[index]}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(actualKeys[index])}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => handleUnlockKey(index)}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Desbloquear Chave
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Desbloquear API Key #{(index + 1).toString().padStart(2, '0')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="key-input">Insira a chave criptografada</Label>
                            <Input
                              id="key-input"
                              value={inputKey}
                              onChange={(e) => setInputKey(e.target.value)}
                              placeholder="Digite a chave criptografada..."
                              className="mt-1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSubmitKey} className="flex-1">
                              Validar Chave
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-2xl mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Status do Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Chaves desbloqueadas: <span className="font-semibold text-foreground">{unlockedKeys.size}</span> de {encryptedKeys.length}
              </div>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(unlockedKeys.size / encryptedKeys.length) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </section>
  );
};

export default Desenvolvedor;