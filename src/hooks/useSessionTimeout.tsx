
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const WARNING_TIME = 5 * 60 * 1000; // 5 minutos antes do timeout

export const useSessionTimeout = () => {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    if (user) {
      // Aviso 5 minutos antes do logout
      warningRef.current = setTimeout(() => {
        const shouldContinue = confirm(
          'Sua sessão expirará em 5 minutos. Deseja continuar?'
        );
        if (!shouldContinue) {
          signOut();
        }
      }, SESSION_TIMEOUT - WARNING_TIME);

      // Logout automático
      timeoutRef.current = setTimeout(() => {
        alert('Sessão expirada por inatividade. Você será redirecionado para o login.');
        signOut();
      }, SESSION_TIMEOUT);
    }
  };

  useEffect(() => {
    if (user) {
      resetTimeout();

      // Eventos que resetam o timeout
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const resetTimeoutHandler = () => resetTimeout();
      
      events.forEach(event => {
        document.addEventListener(event, resetTimeoutHandler, true);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, resetTimeoutHandler, true);
        });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
      };
    }
  }, [user]);

  return { resetTimeout };
};
