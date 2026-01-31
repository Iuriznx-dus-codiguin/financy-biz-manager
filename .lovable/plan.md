
# Plano: Remover Modelo de 7 Dias Gratis e Implementar Acesso Condicionado a Pagamento

## Resumo da Analise Atual

Analisei profundamente a estrutura do sistema de assinaturas e identifiquei todos os componentes que gerenciam o teste gratuito de 7 dias. O sistema atual funciona assim:

1. Quando um usuario se cadastra, triggers criam automaticamente uma assinatura `free_trial` com 7 dias de acesso
2. Durante esses 7 dias, o usuario tem acesso completo a plataforma
3. Apos 7 dias, o acesso e bloqueado e o usuario e direcionado para a pagina de assinatura

## Componentes Identificados que Precisam de Alteracao

### 1. Funcoes SQL no Supabase (2 funcoes)
- `create_free_trial_subscription`: Cria assinatura de teste gratuito
- `ensure_user_has_subscription`: Fallback que tambem cria teste gratuito

### 2. Triggers no Banco de Dados (2 triggers)
- `on_auth_user_created_free_trial` (auth.users)
- `create_trial_on_profile_insert` (profiles)

### 3. Edge Function
- `schedule-user-webhooks`: Agenda webhooks relacionados ao teste gratuito

### 4. Hooks do Frontend (4 arquivos)
- `src/hooks/useUserSubscription.tsx`: Logica de verificacao de assinatura
- `src/hooks/useSubscriptionRedirect.tsx`: Redirecionamento baseado em assinatura
- `src/hooks/useSubscription.tsx`: Hook alternativo de assinatura
- `src/hooks/useOnboarding.tsx`: Agenda webhooks de teste gratuito

### 5. Componentes de UI (4 componentes)
- `src/components/SubscriptionBanners.tsx`: Banners de aviso de teste
- `src/components/FreeTrialNotification.tsx`: Notificacao de teste gratuito
- `src/components/GlobalSubscriptionAlert.tsx`: Alerta global de assinatura
- `src/components/sections/Assinatura.tsx`: Pagina de planos (mencoes a "7 dias")

---

## Plano de Implementacao

### Etapa 1: Alterar Funcoes SQL (Migracao Supabase)

Modificar as funcoes para criar assinaturas com status `pending_payment` em vez de `free_trial`:

**Funcao `create_free_trial_subscription`:**
- Novo usuarios recebem assinatura com `status = 'pending_payment'`
- `subscription_type = 'pending'`
- `plan_name = 'Aguardando Pagamento'`
- `expires_at = now()` (acesso bloqueado imediatamente)
- Features limitadas: `{"max_dashboards": 0, "ai_requests_per_month": 0, "team_members": 0}`

**Funcao `ensure_user_has_subscription`:**
- Mesma logica: criar assinatura pendente em vez de teste gratuito

### Etapa 2: Ajustar Hook useUserSubscription

Modificar a logica de verificacao:
- Novo status `pending_payment` sera tratado como assinatura expirada
- `isSubscriptionExpired()` retorna `true` para usuarios sem pagamento confirmado

### Etapa 3: Atualizar Hook useSubscriptionRedirect

Garantir que usuarios com `pending_payment`:
- Sao redirecionados imediatamente para a pagina de assinatura
- Nao conseguem acessar nenhuma funcionalidade protegida

### Etapa 4: Modificar Componentes de UI

**SubscriptionBanners.tsx:**
- Adicionar tratamento para status `pending_payment`
- Mostrar mensagem: "Assine um plano para comecar a usar o Financy!"

**Assinatura.tsx:**
- Remover mencoes a "Teste gratuito: 7 dias" de todos os planos
- Remover feature `{ name: 'Teste gratuito', value: '7 dias' }` de todas as listas

**FreeTrialNotification.tsx:**
- Remover componente ou adaptar para mensagem de pagamento pendente

### Etapa 5: Ajustar Hook useOnboarding

Remover o agendamento de webhooks de `free_trial`:
```javascript
// REMOVER esta chamada
const { data: scheduleData, error: scheduleError } = await supabase.functions.invoke('schedule-user-webhooks', {
  body: { 
    userId: user.id,
    eventType: 'free_trial'  // <- Remover
  }
});
```

### Etapa 6: Atualizar Edge Function schedule-user-webhooks

Remover logica de agendamento para `free_trial`:
- Manter apenas `subscription_renewal` para usuarios pagantes

---

## Detalhes Tecnicos

### Nova Estrutura de Status de Assinatura

| Status | Significado | Acesso |
|--------|------------|--------|
| `pending_payment` | Usuario novo, aguardando pagamento | Bloqueado |
| `active` | Assinatura ativa e paga | Liberado |
| `expired` | Assinatura expirou | Bloqueado |
| `cancelled` | Assinatura cancelada | Bloqueado |

### Fluxo do Novo Usuario

```text
1. Usuario cria conta
2. Trigger cria assinatura com status 'pending_payment'
3. Usuario completa onboarding
4. Usuario e direcionado para pagina de assinatura
5. Usuario escolhe plano e realiza pagamento
6. Webhook Cakto atualiza status para 'active'
7. Usuario tem acesso completo
```

### Secoes Permitidas sem Pagamento

Usuarios sem pagamento poderao acessar apenas:
- `assinatura` (para escolher plano e pagar)
- `configuracoes` (ajustes basicos)
- `ajuda` (suporte)

---

## Arquivos que Serao Modificados

1. **Migracao SQL** (nova)
   - Alterar `create_free_trial_subscription`
   - Alterar `ensure_user_has_subscription`

2. `src/hooks/useUserSubscription.tsx`
   - Adicionar tratamento para `pending_payment`

3. `src/hooks/useSubscriptionRedirect.tsx`
   - Incluir `pending_payment` como status bloqueado

4. `src/hooks/useOnboarding.tsx`
   - Remover agendamento de webhooks `free_trial`

5. `src/components/SubscriptionBanners.tsx`
   - Adaptar mensagens para novo fluxo

6. `src/components/sections/Assinatura.tsx`
   - Remover mencoes a "7 dias"

7. `src/components/FreeTrialNotification.tsx`
   - Adaptar ou remover componente

8. `src/components/GlobalSubscriptionAlert.tsx`
   - Adaptar mensagens para novo fluxo

9. `supabase/functions/schedule-user-webhooks/index.ts`
   - Remover logica de `free_trial`

---

## Impacto nos Usuarios Existentes

**Usuarios com teste gratuito ativo:**
- Continuarao com acesso ate o teste expirar (comportamento atual)
- Apos expiracao, serao bloqueados e direcionados para pagamento

**Novos usuarios:**
- Nao terao periodo de teste
- Serao imediatamente direcionados para pagamento

**Usuarios pagantes:**
- Nenhuma alteracao no funcionamento

---

## Confirmacao Necessaria

Antes de implementar, preciso confirmar:

1. O comportamento descrito esta correto? Novos usuarios terao acesso bloqueado ate realizar pagamento?

2. Devo manter alguma mensagem de boas-vindas para novos usuarios antes de pedirem para assinar?

3. Ha algum plano especial ou promocao que deva ser considerado?
