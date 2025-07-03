
import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface CashClosingToastProps {
  isVisible: boolean;
  onClose: () => void;
  message?: string;
}

export const CashClosingToast: React.FC<CashClosingToastProps> = ({
  isVisible,
  onClose,
  message = "Fechamento de caixa registrado com sucesso!"
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isVisible) {
      setProgress(100);
      return;
    }

    const duration = 3000; // 3 segundos
    const interval = 50; // Atualizar a cada 50ms
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - decrement;
        if (newProgress <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-xl shadow-lg p-4 min-w-[320px] max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Sucesso!
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        </div>
        
        {/* Barra de progresso */}
        <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div 
            className="bg-green-500 h-1 rounded-full transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
