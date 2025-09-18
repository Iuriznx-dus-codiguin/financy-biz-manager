import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Carregando...');

  const loadingSteps = [
    'Inicializando sistema...',
    'Carregando dados...',
    'Preparando interface...',
    'Finalizando...'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2;
        const stepIndex = Math.floor(next / 25);
        if (stepIndex < loadingSteps.length) {
          setLoadingText(loadingSteps[stepIndex]);
        }
        
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 mx-auto"
        >
          <img 
            src="/src/assets/financy-logo.png" 
            alt="Financy" 
            className="w-full h-full object-contain"
          />
        </motion.div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Financy</h2>
          <div className="w-64 bg-secondary rounded-full h-2">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <p className="text-sm text-muted-foreground">{loadingText}</p>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
      </div>
    </div>
  );
};