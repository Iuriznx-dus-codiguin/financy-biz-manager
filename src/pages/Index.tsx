
import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import Dashboard from '@/components/sections/Dashboard';
import Receitas from '@/components/sections/Receitas';
import Despesas from '@/components/sections/Despesas';
import Impostos from '@/components/sections/Impostos';
import Relatorios from '@/components/sections/Relatorios';
import Fechamento from '@/components/sections/Fechamento';
import Configuracoes from '@/components/sections/Configuracoes';
import Ajuda from '@/components/sections/Ajuda';
import Footer from '@/components/Footer';
import FloatingActionButton from '@/components/FloatingActionButton';

const Index = () => {
  const [activeSection, setActiveSection] = useState('painel');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleThemeToggle = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
      />

      {/* Main Content */}
      <main className="ml-72 min-h-screen">
        <div className="container mx-auto px-8 py-8 space-y-16">
          <Dashboard />
          <Receitas />
          <Despesas />
          <Impostos />
          <Relatorios />
          <Fechamento />
          <Configuracoes />
          <Ajuda />
        </div>
        
        <Footer />
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
};

export default Index;
