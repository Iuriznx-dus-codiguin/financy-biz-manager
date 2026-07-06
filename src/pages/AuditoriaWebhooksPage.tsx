import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { isDeveloperTier } from '@/utils/subscriptionHelpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, RefreshCw, ShieldAlert, Eye, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

interface CaktoWebhookLog {
  id: string;
  created_at: string;
  event_type: string | null;
  category: string;
  status: string;
  http_status: number | null;
  attempt_count: number;
  is_retry: boolean;
  email_masked: string | null;
  user_id: string | null;
  subscription_type: string | null;
  plan_id: string | null;
  plan_name: string | null;
  transaction_id: string | null;
  subscription_id: string | null;
  amount: number | null;
  payment_method: string | null;
  duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  payload: unknown;
  response: unknown;
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'cancellation', label: 'Cancelamento' },
  { value: 'pending', label: 'Pendente' },
  { value: 'failed', label: 'Falha' },
  { value: 'funnel', label: 'Funil' },
  { value: 'unknown', label: 'Desconhecido' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'success', label: 'Sucesso' },
  { value: 'failed', label: 'Erro' },
  { value: 'pending', label: 'Pendente' },
  { value: 'ignored', label: 'Ignorado' },
  { value: 'retried', label: 'Retentativas' },
];

const SUBSCRIPTION_OPTIONS = [
  { value: 'all', label: 'Todas as assinaturas' },
  { value: 'personal', label: 'Pessoal' },
  { value: 'business', label: 'Empresarial' },
  { value: 'pending', label: 'Pendente' },
  { value: 'unknown', label: 'Não identificada' },
];

const PAGE_SIZE = 50;

const statusVariant: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-600 border-red-500/30',
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  ignored: 'bg-muted text-muted-foreground border-border',
};

const categoryVariant: Record<string, string> = {
  approved: 'bg-emerald-500/10 text-emerald-600',
  cancellation: 'bg-red-500/10 text-red-600',
  pending: 'bg-amber-500/10 text-amber-600',
  failed: 'bg-orange-500/10 text-orange-600',
  funnel: 'bg-blue-500/10 text-blue-600',
  unknown: 'bg-muted text-muted-foreground',
};

export default function AuditoriaWebhooksPage() {
  const { subscription, loading: subLoading } = useUserSubscription();
  const [logs, setLogs] = useState<CaktoWebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<CaktoWebhookLog | null>(null);

  const [filters, setFilters] = useState({
    subscription: 'all',
    category: 'all',
    status: 'all',
    search: '',
  });

  const isDeveloper = isDeveloperTier(subscription);

  const fetchLogs = async () => {
    setRefreshing(true);
    try {
      let query = supabase
        .from('cakto_webhook_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (filters.subscription !== 'all') query = query.eq('subscription_type', filters.subscription);
      if (filters.category !== 'all') query = query.eq('category', filters.category);
      if (filters.status === 'retried') query = query.eq('is_retry', true);
      else if (filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        query = query.or(
          `email_masked.ilike.${term},transaction_id.ilike.${term},plan_name.ilike.${term},event_type.ilike.${term}`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as unknown as CaktoWebhookLog[]) || []);
    } catch (err: any) {
      toast.error('Erro ao carregar logs', { description: err?.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isDeveloper) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeveloper, filters.subscription, filters.category, filters.status]);

  const summary = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === 'success').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    const retried = logs.filter((l) => l.is_retry).length;
    return { total, success, failed, retried };
  }, [logs]);

  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isDeveloper) {
    return <Navigate to="/configuracoes" replace />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Auditoria de Webhooks Cakto
          </h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe eventos processados, erros e reenvios da Cakto em tempo real.
          </p>
        </div>
        <Button onClick={fetchLogs} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: summary.total, tone: 'text-foreground' },
          { label: 'Sucesso', value: summary.success, tone: 'text-emerald-600' },
          { label: 'Erros', value: summary.failed, tone: 'text-red-600' },
          { label: 'Reenvios', value: summary.retried, tone: 'text-amber-600' },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {card.label}
              </p>
              <p className={`text-2xl font-bold ${card.tone}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Assinatura</Label>
            <Select
              value={filters.subscription}
              onValueChange={(v) => setFilters((f) => ({ ...f, subscription: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Select
              value={filters.category}
              onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Buscar</Label>
            <form
              onSubmit={(e) => { e.preventDefault(); fetchLogs(); }}
              className="flex gap-2"
            >
              <Input
                placeholder="Email, transação, plano..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
              <Button type="submit" size="sm" variant="secondary">Filtrar</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos eventos ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum log encontrado para os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Transação</TableHead>
                    <TableHead>Tentativa</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(log.created_at), 'dd/MM HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{log.event_type || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={categoryVariant[log.category] || ''}>
                          {log.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusVariant[log.status] || ''}>
                          {log.status}
                          {log.http_status ? ` · ${log.http_status}` : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{log.plan_name || '—'}</TableCell>
                      <TableCell className="text-xs">{log.email_masked || '—'}</TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[140px]">
                        {log.transaction_id || '—'}
                      </TableCell>
                      <TableCell>
                        {log.is_retry ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 gap-1">
                            <RotateCw className="h-3 w-3" />#{log.attempt_count}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">#{log.attempt_count}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do evento</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Evento:</span> <span className="font-mono">{selected.event_type}</span></div>
                <div><span className="text-muted-foreground">Categoria:</span> {selected.category}</div>
                <div><span className="text-muted-foreground">Status:</span> {selected.status} ({selected.http_status})</div>
                <div><span className="text-muted-foreground">Duração:</span> {selected.duration_ms}ms</div>
                <div><span className="text-muted-foreground">Assinatura:</span> {selected.subscription_type || '—'}</div>
                <div><span className="text-muted-foreground">Plano:</span> {selected.plan_name || '—'}</div>
                <div><span className="text-muted-foreground">Email:</span> {selected.email_masked || '—'}</div>
                <div><span className="text-muted-foreground">Transação:</span> <span className="font-mono text-xs">{selected.transaction_id || '—'}</span></div>
                <div><span className="text-muted-foreground">Tentativa:</span> #{selected.attempt_count} {selected.is_retry && '(retry)'}</div>
                <div><span className="text-muted-foreground">Valor:</span> {selected.amount ? `R$ ${selected.amount}` : '—'}</div>
              </div>
              {selected.error_code && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3">
                  <p className="text-red-600 font-semibold text-xs uppercase mb-1">
                    Erro: {selected.error_code}
                  </p>
                  <p className="text-sm">{selected.error_message}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Payload recebido</p>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Resposta enviada</p>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(selected.response, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
