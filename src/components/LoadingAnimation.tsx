
import React, { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';

interface PropriedadesAnimacaoCarregamento {
  estaCarregando: boolean;
  aoConcluir?: () => void;
  mensagem?: string;
  mensagemSucesso?: string;
}

export const AnimacaoCarregamento: React.FC<PropriedadesAnimacaoCarregamento> = ({
  estaCarregando,
  aoConcluir,
  mensagem = "Processando...",
  mensagemSucesso = "Concluído com sucesso!"
}) => {
  const [mostrarSucesso, setMostrarSucesso] = useState(false);

  useEffect(() => {
    if (!estaCarregando && mostrarSucesso) {
      const temporizador = setTimeout(() => {
        setMostrarSucesso(false);
        aoConcluir?.();
      }, 2000);
      return () => clearTimeout(temporizador);
    }
    
    if (!estaCarregando) {
      setMostrarSucesso(true);
    }
  }, [estaCarregando, mostrarSucesso, aoConcluir]);

  if (!estaCarregando && !mostrarSucesso) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
        <div className="text-center">
          {estaCarregando ? (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {mensagem}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Aguarde enquanto salvamos suas informações...
              </p>
            </>
          ) : mostrarSucesso ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-600 animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                {mensagemSucesso}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dados salvos com sucesso no banco de dados!
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
