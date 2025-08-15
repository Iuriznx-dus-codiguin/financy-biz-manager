import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

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
  const { setReceitas, setDespesas, setImpostos, setMetas } = useAppContext();

  const loadingSteps = [
    { text: 'Inicializando...', duration: 500 },
    { text: 'Carregando dados do usuário...', duration: 800 },
    { text: 'Verificando assinatura...', duration: 600 },
    { text: 'Sincronizando receitas...', duration: 700 },
    { text: 'Carregando despesas...', duration: 700 },
    { text: 'Verificando impostos...', duration: 400 },
    { text: 'Finalizando...', duration: 300 }
  ];

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        // Carregar todos os dados do usuário em paralelo
        const [receitasData, despesasData, impostosData, metasData, subscriptionData] = await Promise.all([
          supabase.from('receitas').select('*').eq('user_id', user.id),
          supabase.from('despesas').select('*').eq('user_id', user.id),
          supabase.from('impostos').select('*').eq('user_id', user.id),
          supabase.from('metas').select('*').eq('user_id', user.id),
          supabase.from('customer_subscriptions').select('*').eq('user_id', user.id).maybeSingle()
        ]);

        // Atualizar contexto com os dados carregados, formatando-os corretamente
        if (receitasData.data) {
          const receitasFormatadas = receitasData.data.map(r => ({
            id: r.id,
            data: r.data,
            descricao: r.descricao,
            categoria: r.categoria,
            valor: r.valor,
            cliente: r.cliente,
            formaPagamento: r.forma_pagamento,
            dashboard_id: r.dashboard_id
          }));
          setReceitas(receitasFormatadas);
        }
        
        if (despesasData.data) {
          const despesasFormatadas = despesasData.data.map(d => ({
            id: d.id,
            data: d.data,
            descricao: d.descricao,
            categoria: d.categoria,
            valor: d.valor,
            fornecedor: d.fornecedor,
            formaPagamento: d.forma_pagamento,
            dashboard_id: d.dashboard_id
          }));
          setDespesas(despesasFormatadas);
        }
        
        if (impostosData.data) {
          const impostosFormatados = impostosData.data.map(i => ({
            id: i.id,
            descricao: i.descricao,
            tipo: i.tipo,
            valor: i.valor,
            valorTipo: 'fixo' as const,
            vencimento: i.vencimento,
            pago: i.pago || false,
            tipoRecorrencia: (i.recorrente ? 'recorrente' : 'unico') as 'unico' | 'recorrente',
            dashboard_id: i.dashboard_id
          }));
          setImpostos(impostosFormatados);
        }
        
        if (metasData.data) {
          const metasFormatadas = metasData.data.map(m => ({
            id: m.id,
            titulo: m.titulo,
            valorMeta: m.valor_meta,
            valorAtual: m.valor_atual,
            progresso: m.progresso,
            prazo: m.prazo,
            categoria: m.categoria,
            status: m.status as 'em_andamento' | 'concluida' | 'atrasada',
            cor: m.cor,
            dashboard_id: m.dashboard_id
          }));
          setMetas(metasFormatadas);
        }

        console.log('Dados do usuário carregados com sucesso');
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    // Simular carregamento com animação
    let currentStep = 0;
    let currentProgress = 0;

    const runLoadingSequence = () => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep];
        setLoadingText(step.text);

        const stepProgress = 100 / loadingSteps.length;
        const increment = stepProgress / (step.duration / 50);

        const progressInterval = setInterval(() => {
          currentProgress += increment;
          setProgress(Math.min(currentProgress, (currentStep + 1) * stepProgress));
        }, 50);

        setTimeout(() => {
          clearInterval(progressInterval);
          currentStep++;
          runLoadingSequence();
        }, step.duration);
      } else {
        // Completar o loading
        setProgress(100);
        setLoadingText('Pronto!');
        setTimeout(onComplete, 200);
      }
    };

    // Iniciar carregamento dos dados e animação
    loadUserData();
    runLoadingSequence();
  }, [user, onComplete, setReceitas, setDespesas, setImpostos, setMetas]);

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