import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border px-4 sm:px-6 py-4 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
        <div className="text-center sm:text-left">
          Financy © 2025 — Todos os direitos reservados
        </div>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          <button className="hover:text-foreground transition-colors">
            Política de Privacidade
          </button>
          <button className="hover:text-foreground transition-colors">
            Termos de Uso
          </button>
          <button className="hover:text-foreground transition-colors">
            Cookies
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
