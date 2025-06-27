
import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import Dashboard from '@/components/sections/Dashboard';
import Receitas from '@/components/sections/Receitas';
import Despesas from '@/components/sections/Despesas';
import Impostos from '@/components/sections/Impostos';
import Relatorios from '@/components/sections/Relatorios';
import Fechamento from '@/components/sections/Fechamento';
import Assinatura from '@/components/sections/Assinatura';
import Configuracoes from '@/components/sections/Configuracoes';
import Ajuda from '@/components/sections/Ajuda';
import Footer from '@/components/Footer';
import FloatingActionButton from '@/components/FloatingActionButton';

const Index = () => {
  const [activeSection, setActiveSection] = useState('painel');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleThemeToggle = () => {
    setIsDark(!isDark);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'painel':
        return <Dashboard />;
      case 'receitas':
        return <Receitas />;
      case 'despesas':
        return <Despesas />;
      case 'impostos':
        return <Impostos />;
      case 'relatorios':
        return <Relatorios />;
      case 'fechamento':
        return <Fechamento />;
      case 'assinatura':
        return <Assinatura />;
      case 'configuracoes':
        return <Configuracoes />;
      case 'ajuda':
        return <Ajuda />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
      />

      <main className="ml-72 min-h-screen">
        <div className="container mx-auto px-8 py-8">
          {renderActiveSection()}
        </div>
        <Footer />
      </main>

      <FloatingActionButton />
    </div>
  );
};

export default Index;
