import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

// Import da logo
const financyLogo = '/lovable-uploads/11a67f5c-242f-4740-b1f7-1ed6c6895f51.png';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Inicializando...');
  const { user } = useAuth();
  const { onboardingData } = useOnboarding();
  const mountedRef = useRef(true);
  const [isCompleted, setIsCompleted] = useState(false);

  const loadingSteps = [
    { text: 'Inicializando conexão...', key: 'init' },
    { text: 'Carregando perfil do usuário...', key: 'profile' },
    { text: 'Verificando assinatura...', key: 'subscription' },
    { text: 'Carregando dashboards...', key: 'dashboards' },
    { text: 'Sincronizando receitas...', key: 'receitas' },
    { text: 'Carregando despesas...', key: 'despesas' },
    { text: 'Verificando impostos...', key: 'impostos' },
    { text: 'Carregando metas...', key: 'metas' },
    { text: 'Finalizando...', key: 'finish' }
  ];

  useEffect(() => {
    if (isCompleted) return;

    const loadWithTimeout = async () => {
      try {
        let completedSteps = 0;
        const totalSteps = loadingSteps.length;

        const updateProgress = (stepKey: string) => {
          if (!mountedRef.current) return;
          completedSteps++;
          const newProgress = (completedSteps / totalSteps) * 100;
          setProgress(newProgress);
          
          const step = loadingSteps.find(s => s.key === stepKey);
          if (step) {
            setLoadingText(step.text);
          }
        };

        // Passo 1: Inicialização - mais rápida
        await new Promise(resolve => setTimeout(resolve, 150));
        updateProgress('init');

        // Passo 2: Preparando ambiente
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress('profile');

        // Passo 3: Configurando sistema
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress('subscription');

        // Passo 4: Carregando workspace
        await new Promise(resolve => setTimeout(resolve, 150));
        updateProgress('dashboards');

        // Passo 5: Inicializando dados
        await new Promise(resolve => setTimeout(resolve, 150));
        updateProgress('receitas');

        // Passo 6: Preparando interface
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress('despesas');

        // Passo 7: Configurando recursos
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress('impostos');

        // Passo 8: Finalizando configuração
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress('metas');

        // Passo 9: Finalização
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress('finish');

        // Aguardar animação final
        await new Promise(resolve => setTimeout(resolve, 300));

        if (mountedRef.current && !isCompleted) {
          setIsCompleted(true);
          onComplete();
        }

      } catch (error) {
        console.error('Erro durante carregamento:', error);
        if (mountedRef.current && !isCompleted) {
          setProgress(100);
          setLoadingText('Finalizando...');
          setTimeout(() => {
            if (mountedRef.current) {
              setIsCompleted(true);
              onComplete();
            }
          }, 300);
        }
      }
    };

    // Timeout de segurança reduzido
    const timeoutId = setTimeout(() => {
      if (!isCompleted && mountedRef.current) {
        console.warn('Loading timeout - forçando conclusão');
        setProgress(100);
        setLoadingText('Finalizando...');
        setIsCompleted(true);
        onComplete();
      }
    }, 3000); // Reduzido para 3 segundos

    loadWithTimeout();

    return () => {
      clearTimeout(timeoutId);
      mountedRef.current = false;
    };
  }, [onComplete, isCompleted]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/20 via-background to-primary/10 flex items-center justify-center z-50">
      <div className="text-center space-y-8">
        {/* Logo com animação */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ 
            scale: [0.5, 1.1, 1],
            opacity: 1,
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
          className="relative mx-auto w-32 h-32"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60 rounded-full opacity-20 animate-pulse" />
          <img 
            src={financyLogo} 
            alt="Financy Logo" 
            className="w-full h-full object-contain relative z-10"
          />
        </motion.div>

        {/* Nome da marca */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-primary mb-2">Financy</h1>
          <p className="text-muted-foreground">Sua plataforma de gestão financeira</p>
        </motion.div>

        {/* Barra de progresso */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="w-80 mx-auto space-y-4"
        >
          <div className="relative">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/80"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="absolute -top-1 right-0 w-3 h-4 bg-primary rounded-full shadow-lg" 
                 style={{ transform: `translateX(-${100 - progress}%)` }} />
          </div>

          {/* Texto de carregamento */}
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-muted-foreground"
            >
              {loadingText}
            </motion.p>
          </AnimatePresence>

          {/* Porcentagem */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-xs text-muted-foreground"
          >
            {Math.round(progress)}%
          </motion.p>
        </motion.div>

        {/* Saudação personalizada quando disponível */}
        {onboardingData?.nome_preferido && progress > 50 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-primary/10 backdrop-blur-sm rounded-lg p-4 border border-primary/20"
          >
            <p className="text-primary font-medium">
              Bem-vindo de volta, {onboardingData.nome_preferido}! 👋
            </p>
          </motion.div>
        )}
      </div>

      {/* Efeito de partículas de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: window.innerHeight + 10
            }}
            animate={{
              y: -10,
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>
    </div>
  );
};