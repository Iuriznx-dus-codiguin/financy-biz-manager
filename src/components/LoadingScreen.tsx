import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useUserSubscription } from '@/hooks/useUserSubscription';

// Import da logo
import financyLogoDark from '@/assets/financy-logo-new-dark.png';

interface LoadingScreenProps {
  onComplete: () => void;
}

// Duração mínima curta apenas para evitar uma piscada visual desconfortável.
// O carregamento real (auth, onboarding, assinatura) é o que de fato governa.
const MIN_VISIBLE_MS = 450;

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const { loading: authLoading } = useAuth();
  const { loading: onboardingLoading } = useOnboarding();
  const { loading: subscriptionLoading } = useUserSubscription();
  const mountedAt = useRef(performance.now());
  const completedRef = useRef(false);
  const [progress, setProgress] = useState(15);

  const ready = !authLoading && !onboardingLoading && !subscriptionLoading;

  // Progresso reflete o estado real: avança conforme cada bloco fica pronto.
  useEffect(() => {
    let p = 15;
    if (!authLoading) p = Math.max(p, 50);
    if (!onboardingLoading) p = Math.max(p, 80);
    if (!subscriptionLoading) p = Math.max(p, 100);
    setProgress(p);
  }, [authLoading, onboardingLoading, subscriptionLoading]);

  useEffect(() => {
    if (!ready || completedRef.current) return;
    completedRef.current = true;
    const elapsed = performance.now() - mountedAt.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const t = window.setTimeout(onComplete, wait);
    return () => window.clearTimeout(t);
  }, [ready, onComplete]);

  return (
    <div className="dark loading-screen fixed inset-0 !bg-gradient-to-br !from-gray-900 !via-green-900 !to-emerald-900 flex items-center justify-center z-50 overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern" />
      </div>

      <div className="relative z-10 text-center space-y-6 max-w-sm mx-auto px-6">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative mx-auto w-24 h-24"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-teal-500/30 rounded-full blur-xl animate-pulse" />
          <img
            src={financyLogoDark}
            alt="Financy"
            className="w-full h-full object-contain relative z-10 drop-shadow-lg"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-gray-300 text-sm font-medium"
        >
          Inteligência financeira ao seu alcance
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="space-y-2"
        >
          <div className="h-1.5 bg-gray-700/70 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </div>
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
