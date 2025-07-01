
import { useEffect } from 'react';

export const useSecurityHeaders = () => {
  useEffect(() => {
    // Adicionar meta tags de segurança dinamicamente
    const addMetaTag = (name: string, content: string) => {
      const existingTag = document.querySelector(`meta[name="${name}"]`);
      if (!existingTag) {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    };

    // Content Security Policy
    addMetaTag('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://hbyozfmpsgbxofcetdez.supabase.co; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://hbyozfmpsgbxofcetdez.supabase.co wss://hbyozfmpsgbxofcetdez.supabase.co; " +
      "frame-ancestors 'none';"
    );

    // Outras políticas de segurança
    addMetaTag('X-Content-Type-Options', 'nosniff');
    addMetaTag('X-Frame-Options', 'DENY');
    addMetaTag('X-XSS-Protection', '1; mode=block');
    addMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    addMetaTag('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Prevenir clickjacking
    if (window.self !== window.top) {
      window.top!.location = window.self.location;
    }
  }, []);
};
