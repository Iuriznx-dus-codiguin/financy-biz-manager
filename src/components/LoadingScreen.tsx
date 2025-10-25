import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Sparkles, Zap, TrendingUp, Shield } from 'lucide-react';

// Import da logo
import financyLogoDark from '@/assets/financy-logo-dark-theme.png';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Inicializando sua experiência...');
  const [currentFeature, setCurrentFeature] = useState(0);
  const { user } = useAuth();
  const { onboardingData, loading: onboardingLoading } = useOnboarding();

  const features = [
    { icon: Zap, title: 'Inteligência Artificial', desc: 'Reconhecimento automático de transações' },
    { icon: TrendingUp, title: 'Análises Avançadas', desc: 'Relatórios inteligentes e insights' },
    { icon: Shield, title: 'Segurança Total', desc: 'Seus dados protegidos com criptografia' },
    { icon: Sparkles, title: 'Interface Intuitiva', desc: 'Design pensado para sua produtividade' }
  ];

  const loadingSteps = [
    { text: '🔐 Verificando autenticação...', duration: 300, waitForAuth: true },
    { text: '👤 Carregando perfil do usuário...', duration: 400, waitForOnboarding: true },
    { text: '⚙️ Sincronizando configurações...', duration: 500 },
    { text: '📊 Carregando dados financeiros...', duration: 600 },
    { text: '🎯 Preparando dashboard...', duration: 400 },
    { text: '✨ Aplicando personalizações...', duration: 300 },
    { text: '🚀 Finalizando...', duration: 200 }
  ];

  useEffect(() => {
    const performRealLoading = async () => {
      let currentProgress = 0;
      
      for (let i = 0; i < loadingSteps.length; i++) {
        const step = loadingSteps[i];
        setLoadingText(step.text);
        
        // Esperar por dados reais se necessário
        if (step.waitForAuth && !user) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (step.waitForOnboarding && onboardingLoading) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Animar progresso gradualmente
        const targetProgress = ((i + 1) / loadingSteps.length) * 100;
        const progressIncrement = (targetProgress - currentProgress) / 15;
        
        for (let j = 0; j < 15; j++) {
          currentProgress += progressIncrement;
          setProgress(Math.min(currentProgress, targetProgress));
          await new Promise(resolve => setTimeout(resolve, step.duration / 15));
        }
        
        // Rotacionar features durante o carregamento
        if (i % 2 === 0) {
          setCurrentFeature((prev) => (prev + 1) % features.length);
        }
      }

      // Garantir que o progresso chegue a 100%
      setProgress(100);
      setLoadingText('✅ Tudo pronto!');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete();
    };

    performRealLoading();
  }, [onComplete, user, onboardingLoading]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center z-50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-grid-pattern"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: window.innerHeight + 20,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{
              y: -20,
              x: Math.random() * window.innerWidth,
            }}
            transition={{
              duration: Math.random() * 3 + 4,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-md mx-auto px-6">
        {/* Logo com animação aprimorada */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotateY: 0 }}
          animate={{ 
            scale: [0.3, 1.1, 1],
            opacity: 1,
            rotateY: [0, 360, 0]
          }}
          transition={{ 
            duration: 2.5,
            times: [0, 0.6, 1],
            ease: "easeInOut"
          }}
          className="relative mx-auto w-24 h-24"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-full opacity-20 animate-pulse" />
          <div className="absolute -inset-2 bg-gradient-to-r from-green-500/30 to-teal-500/30 rounded-full blur-lg animate-pulse" />
          <img 
            src={financyLogoDark} 
            alt="Financy Logo" 
            className="w-full h-full object-contain relative z-10 drop-shadow-lg"
          />
        </motion.div>

        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="space-y-2"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Financy
          </h1>
          <p className="text-gray-300 text-sm font-medium">
            Inteligência financeira ao seu alcance
          </p>
        </motion.div>

        {/* Feature Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFeature}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-4"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                {React.createElement(features[currentFeature].icon, { className: "w-6 h-6 text-white" })}
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-white">
                  {features[currentFeature].title}
                </h3>
                <p className="text-sm text-gray-300">
                  {features[currentFeature].desc}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="space-y-4"
        >
          <div className="relative">
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            
            {/* Progress indicator */}
            <motion.div 
              className="absolute -top-1 w-5 h-5 bg-white border-2 border-green-500 rounded-full shadow-lg"
              initial={{ left: "0%" }}
              animate={{ left: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ transform: 'translateX(-50%)' }}
            />
          </div>

          {/* Loading Text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={loadingText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <p className="text-sm font-medium text-gray-300">
                {loadingText}
              </p>
              <p className="text-xs text-gray-400">
                {Math.round(progress)}% concluído
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

      </div>

      <style>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
};