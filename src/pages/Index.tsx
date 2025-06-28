
import React, { useState } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
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
    <div className="min-h-screen bg-background w-full">
      <SidebarProvider>
        <AppSidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
          </header>
          
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-8 py-8">
              {renderActiveSection()}
            </div>
            <Footer />
          </main>
        </SidebarInset>
      </SidebarProvider>

      <FloatingActionButton />
    </div>
  );
};

export default Index;
