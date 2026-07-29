import { SupportChat } from '@/components/support/SupportChat';

export default function SuportePage() {
  return (
    <div className="h-[calc(100dvh-11rem)] min-h-[520px] flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suporte inteligente</h1>
        <p className="text-sm text-muted-foreground">
          Tire dúvidas sobre a plataforma ou diagnostique um erro pelo código.
        </p>
      </div>
      <SupportChat showHistory className="flex-1 min-h-0" />
    </div>
  );
}
