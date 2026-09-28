# Financy — Arquitetura-alvo, plano de migração e decisões

> Complementa [`DOMINIO.md`](./DOMINIO.md) (como é) e [`AUDITORIA.md`](./AUDITORIA.md) (o que está errado).
> "Do zero" vale para a análise e a arquitetura, **não** para dados de clientes, contratos externos (Cakto, n8n, cron)
> ou regras de negócio que funcionam.

## 1. Princípios

1. **Um domínio, um lugar.** Cada domínio tem sua API (acesso ao Supabase), hooks React Query, componentes e tipos.
2. **Estado de servidor só no React Query.** Contextos guardam apenas estado de sessão/UI (usuário, dashboard atual,
   tema). O `AppContext` deixa de ser o banco de dados em memória da aplicação.
3. **Regras puras e testadas.** Datas, dinheiro, planos, recorrência, vencimento e parser da Cakto são funções puras,
   sem React nem Supabase, cobertas por testes (Vitest). As mesmas regras rodam no front e nas functions.
4. **O banco é a última linha de defesa.** Paywall, limites de plano e posse de dados são garantidos por RLS, triggers
   e RPCs; o front só melhora a experiência.
5. **Contratos externos são imutáveis por padrão.** URL e payload do `cakto-webhook`, payloads enviados ao n8n,
   nomes/assinaturas de RPCs e tabelas usadas pelo n8n e jobs do cron só mudam com aviso e rollback documentado.
6. **Migrações novas, idempotentes, reversíveis.** Nunca editar migração antiga; toda migração nova traz a reversão
   comentada e é validada no harness (`scripts/db/apply-migrations.sh`).
7. **Datas-calendário não têm fuso.** `AAAA-MM-DD` é tratado como data local; "hoje" é sempre o de
   `America/Sao_Paulo` (front, functions e SQL).
8. **Dinheiro em centavos inteiros** para somar e comparar; `numeric(10,2)` no banco; formatação única em BRL.

## 2. Estrutura-alvo

```
src/
  App.tsx, main.tsx        # entrada (o Lovable espera estes caminhos)
  app/                     # providers, guardas (auth, admin), layout autenticado, menus, rotas, 404, carregamento lazy
  features/
    admin/                 # papel admin e auditoria de webhooks
    assinatura/            # hook único (useAssinatura), regras/catálogo, tela de planos, banners, pós-pagamento
    auth/                  # login e sessão
    categorias/            # catálogo, categorias personalizadas, seletor
    configuracoes/         # tela, preferências, tema
    dashboards/            # provider, seleção, criação (limite do plano), personalização, contexto PF/PJ
    equipe/ fechamento/ impostos/ metas/ relatorios/
    financeiro/            # AppContext (dados do dashboard atual) e cálculos agregados
    ia/                    # assistente in-app e insights
    lancamentos/           # receitas, despesas, recorrência
    onboarding/            # fluxo, etapas e tour guiado (onboarding/tour)
    painel/                # painel básico e avançado
    suporte/               # chat, botão flutuante, central de ajuda, atendimento humano
  shared/
    lib/                   # datas, dinheiro, recorrência, impostos (reexportam supabase/functions/_shared), erros,
                           # paginação, planilhas, filtros de período, logger, nomenclatura PF/PJ, telefone
    ui/                    # componentes de aplicação reutilizáveis (não-shadcn) e ícones de categoria
  components/ui/           # shadcn (mantido no lugar: components.json e o Lovable dependem dele)
  hooks/use-toast, use-mobile, lib/utils   # aliases do shadcn
  integrations/supabase/   # gerado — não editar

supabase/functions/
  _shared/
    cors.ts                # allowlist (produção, preview do Lovable, localhost, ALLOWED_ORIGINS opcional)
    http.ts                # servir(), respostas JSON e ErroHttp padronizados
    auth.ts                # usuário pelo JWT; chamador interno (cron/service role)
    acesso.ts              # exige assinatura ativa, posse do dashboard, limite de uso (falha fechada)
    supabase.ts, logger.ts, ia.ts, n8n.ts, consultas.ts (paginação)
    datas.ts, dinheiro.ts, recorrencia.ts, impostos.ts, planos.ts, assinatura.ts, cakto.ts
                           # regras puras, testadas no Vitest e importadas também pelo front
```

`src/components/ui` permanece onde está porque `components.json` (shadcn) e o editor do Lovable geram componentes
nesse caminho; mover quebraria a edição futura pelo Lovable.

## 3. Banco

| Item | Decisão |
|---|---|
| Assinatura ativa | `public.tem_assinatura_ativa(uuid)` (`SECURITY DEFINER`, `STABLE`): `status = 'active'` e (`expires_at` futuro ou tier `developer`). Mesma regra de `supabase/functions/_shared/assinatura.ts` (`assinaturaAtiva`). |
| Paywall no banco | Policies **restritivas** de `INSERT`/`UPDATE` em `receitas`, `despesas`, `impostos`, `metas`, `equipe_membros`, `categorias_personalizadas`. Leitura, exportação e exclusão continuam livres para o dono (LGPD). |
| RPCs | Guarda `p_user_id = auth.uid()` ou chamador privilegiado (`service_role`, conexão direta, cron) nas usadas pelo front; `EXECUTE` só para `service_role` nas demais. Assinaturas mantidas. |
| Limite de plano | Trigger em `user_dashboards` usando `features.max_dashboards` gravado pelo webhook. |
| Onboarding | RPC atômica `concluir_onboarding(jsonb)` — única escrita financeira permitida antes do pagamento. |
| Recorrência | `calcular_proxima_data` com mais periodicidades; processamento com "hoje" de Brasília, recuperação de ocorrências vencidas e job de cron chamando SQL direto. |
| Impostos | Colunas aditivas `valor_tipo`, `tipo_recorrencia`, `proxima_data`. |
| Exclusões | RPCs transacionais `excluir_dashboard(uuid)` e `apagar_meus_dados()`. |
| Admin | `has_role(auth.uid(), 'admin')` em tudo que é administrativo. |
| Índices | Os compostos que a migração inválida `20250918173518` nunca criou. |

Tabelas legadas (`customer_subscriptions`, `subscribers`, `usuarios_assinatura`, `free_trial_history`) **não são
apagadas**: deixam de ser lidas pelo front (exceto `subscribers` para o tier `developer`) e ficam para a decisão D-03.

## 4. Modelo financeiro proposto (decisão D-01)

Hoje existem cinco definições de lucro (A-14) e impostos/folha somados por fora do caixa (A-16). Proposta:

1. **Uma base só: lançamentos.** Receitas e despesas com `status` `paga`/`pendente` e data.
2. **Resultado do período (regime de caixa)** = receitas pagas − despesas pagas com data no período.
   Pendentes aparecem como **A receber** / **A pagar**, nunca misturados ao resultado (cumpre o texto da tela).
3. **Impostos e taxas são contas a pagar.** O cadastro gera a obrigação (valor fixo ou percentual sobre as receitas
   pagas da competência). **Marcar como pago cria uma despesa vinculada** (categoria "Impostos/Taxas", data do pagamento).
   O imposto entra no resultado **uma única vez**, pela despesa.
4. **Folha é conta a pagar recorrente.** Cada membro gera obrigações conforme a periodicidade; pagar cria a despesa
   vinculada (categoria "Salários"). Projeções usam as obrigações; o realizado usa as despesas. Pró-labore segue o mesmo
   caminho, com categoria própria (e, na feature de contas, transferência PJ→PF).
5. **Saldo de caixa** = saldo de abertura (onboarding, gravado como lançamento de abertura) + Σ receitas pagas −
   Σ despesas pagas **até hoje**, independente do filtro de período.
6. **Fluxo de caixa projetado** = saldo de caixa + a receber − a pagar + recorrências futuras + obrigações de impostos e
   folha, por dia/semana/mês.
7. **PJ — DRE simplificada**: receita bruta; (−) impostos sobre receita; (−) despesas operacionais; (−) folha;
   = resultado operacional; margem.
8. **Métricas removidas ou reescritas:** "pró-labore recomendado = 11% do lucro" sai (11% é a contribuição do INSS);
   "capital de giro" passa a ser 3 × média mensal das despesas pagas dos últimos 3 meses.

Migração de dados: nada é apagado. Impostos já marcados como pagos não geram despesa retroativa sem aprovação
(opção: gerar com data do vencimento e marcação "migrado"). Implementação: módulo puro `features/financeiro/modelo.ts`
consumido pelo Dashboard, Relatórios, Fechamento e pelos insights de IA.

## 5. Plano de migração

A reestruturação é entregue na branch `claude/financy-restructure-xavsf8` em commits atômicos agrupados por fase
(o ambiente desta sessão só pode publicar nessa branch; ver D-16). Cada commit mantém build, lint dos arquivos tocados,
typecheck e testes passando.

### Fase 0 — Documentos (este conjunto)
`docs/DOMINIO.md`, `docs/AUDITORIA.md`, `docs/ARQUITETURA-ALVO.md`, `docs/sql/inspecao-banco.sql`, `CLAUDE.md` e o
harness de banco em `scripts/db/`.

### Fase 1 — Segurança e fundação
1. Testes de caracterização (Vitest) das regras que vão mudar: tier/limites, plano e valor do webhook, vencimento,
   recorrência, datas e dinheiro — primeiro fixando o comportamento atual, depois o corrigido.
2. Utilitários compartilhados: `datas`, `dinheiro`, catálogo de planos, regra de assinatura, parser da Cakto.
3. Migração de segurança (A-01, A-02, A-03, A-06, A-09) + recorrência (A-10) + impostos (A-15) + índices, validada no
   harness com testes SQL de RLS.
4. Functions: `_shared` (CORS, auth, assinatura, IA, n8n, logger); `cakto-webhook` (A-12); crons e webhooks do n8n
   (A-04, A-21, A-29); `ai-agent` (A-18); insights (A-22); suporte (A-23).
5. Front: hook único de assinatura (A-05..A-08), guardas de rota e rotas lazy (A-32), admin por papel (A-09),
   datas (A-13), recorrência gravada (A-11), percentual de imposto (A-15), botão Atualizar (A-10), pós-pagamento (A-24).

**Estado:** entregue (commits `3cd2bbb`…`fd55d15`, status por achado em `docs/AUDITORIA.md`).

### Fase 2 — Um domínio por vez
Lançamentos e recorrências → categorias → dashboards → metas → impostos → equipe → fechamento → relatórios → IA →
suporte → assinatura → onboarding → configurações → admin. Em cada domínio: API + hooks React Query, componentes
quebrados, remoção do código morto/duplicado do domínio, testes das regras puras.

**Estado:** entregue a parte estrutural — código por domínio (`git mv`, só caminhos), órfãos, duplicatas e exports sem
uso removidos, regras puras testadas. A troca do `AppContext` por hooks React Query por domínio e a quebra de
`Configuracoes`/`DashboardAvancado` ficam como próxima etapa (o `AppContext` foi corrigido no lugar: cache, realtime,
paginação e recorrência).

### Fase 3 — Coerência de produto (sem mudar a oferta)
Nomenclatura PF/PJ em menu e telas, "Impostos e Taxas" contextual, uma entrada de suporte, "Assistente de IA" no
singular, suporte com os planos reais, textos; relatório final com decisões pendentes e novas funcionalidades.

**Estado:** entregue (`aa64af4`, `dc806c9`); relatório final em `docs/RELATORIO-FINAL.md`.

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| O n8n chamar RPCs/tabelas com a chave anon e parar ao restringir acesso. | Guardas aceitam `service_role` e conexões diretas; reversão por função documentada na migração; pré-requisito explícito no PR. |
| Front publicado antes das migrações (o preview do Lovable usa o banco de produção). | Código novo tolera colunas/RPCs ausentes (fallback com aviso) até a migração; ordem de deploy no PR. |
| Cron sem o segredo no Vault. | Functions falham fechadas (401) — lembrete/avisos param, nada vaza; passo a passo no PR. |
| Usuários acima do novo limite de dashboards. | Dashboards existentes preservados; só novas criações são barradas. |
| Edição concorrente pelo Lovable na `main` durante o merge. | Congelar edições no Lovable entre o merge e a sincronização; PR em rascunho até aprovação. |
| Fuso único (`America/Sao_Paulo`). | Cobre quase todos os clientes; D-15 registra a exceção (AC/AM/Noronha). |

## 7. Decisões pendentes

| ID | Decisão | Recomendação |
|---|---|---|
| D-01 | Adotar o modelo financeiro da §4 (muda números exibidos: lucro, saldo, impostos, folha). | Aprovar; implementar em uma entrega própria com migração de dados opcional. |
| D-02 | Receita "Pagamento de assinatura" gravada no dashboard do comprador (A-19): parar, gravar como despesa do cliente ou manter? E os registros existentes? | Parar de gravar; manter os existentes e oferecer ao cliente um botão para excluí-los. |
| D-03 | Remover functions sem chamador (`ai-financial-agent`, `ai-support-agent`, `ai-tax-agent`, `validate-developer-key`, `get-main-dashboard`), funções SQL sem uso e tabelas legadas de assinatura, após confirmar o n8n. | Remover (comandos no PR); tabelas só com plano de migração aprovado. |
| D-04 | Paywall do WhatsApp e RLS de `validacao_n8n` (A-17). | Enviar os workflows; n8n consultar `tem_assinatura_ativa` via service role. |
| D-05 | Converter para `personal` os dashboards padrão de usuários PF criados como `business` (A-26). | Converter só os sem membros de equipe e sem uso de Fechamento, com aviso. |
| D-06 | Categorias personalizadas por dashboard (escopo e unicidade por dashboard). | Aprovar; migração copia as atuais para cada dashboard do usuário. |
| D-07 | Retenção e escopo de `security_audit_logs` (hoje copia cada lançamento inteiro). | Registrar só metadados da operação; reter 180 dias. |
| D-08 | Regenerar lockfiles: sincronizar `package-lock.json`, atualizar `@supabase/supabase-js`, instalar Vitest como devDependency. | Aprovar (mudança só de ferramental). |
| D-09 | TypeScript `strict` gradual (por pasta). | Aprovar após a Fase 2. |
| D-10 | Oferta × realidade: "IA ILIMITADA" × 50 mensagens/dia; "24/7" × WhatsApp 8h–18h; features inexistentes nos tiers. | Ajustar o texto da oferta ou o limite (decisão comercial). |
| D-11 | Cancelamento (`subscription_canceled`): hoje corta o acesso na hora; manter até `expires_at`? Reembolso/chargeback cortam na hora. | Manter acesso até o fim do período pago em cancelamentos simples. |
| D-12 | Carência na renovação (atraso do webhook da Cakto bloqueia o cliente). | 3 dias de carência com banner. |
| D-13 | Lembrete diário: enviar só para assinantes ativos com telefone? | Sim. |
| D-14 | Recorrência gerada como `paga` (hoje) × `pendente` para contas a pagar. | Configurável por recorrência; padrão `pendente` para despesas futuras. |
| D-15 | Fuso da plataforma fixo em `America/Sao_Paulo`. | Manter; campo de fuso no perfil só se houver demanda. |
| D-16 | Uma branch por fase (pedido original) × uma branch com commits por fase (limite do ambiente). | Revisar por commits; separo em branches se preferir. |
| D-17 | Aviso de vencimento próximo para assinantes ativos (A-52): hoje só bloqueados veem banner; "Renovar agora" pode gerar pagamento em dobro na renovação automática. | Mostrar "sua assinatura renova em N dias" sem botão de pagamento; botão só se a Cakto indicar falha de cobrança. |
| D-18 | Cancelamento com e-mail cancela a assinatura atual mesmo se o evento for de uma assinatura antiga (A-12). Hoje: mantido e divergência registrada no log. | Enviar exemplos reais de `subscription_canceled`; cancelar só quando `cakto_subscription_id` coincidir. |
| D-19 | Checagem antecipada de telefone duplicado no onboarding (A-48). | Manter só a constraint (a RPC já devolve a mensagem); uma RPC de disponibilidade permitiria enumerar telefones. |
| D-20 | Periodicidades já suportadas pelo banco (quinzenal, bimestral, trimestral, semestral) não aparecem nos formulários. | Expor no formulário de impostos e lançamentos (baixo risco; o banco e as regras já tratam). |

## 8. Pré-requisitos de deploy (resumo; detalhes no PR)

1. Rodar `docs/sql/inspecao-banco.sql` e enviar os resultados (+ workflows do n8n exportados).
2. Confirmar que o n8n usa a chave `service_role` (ou conexão direta) para RPCs e tabelas.
3. Aplicar as migrações novas, na ordem, **antes** de publicar o front.
4. Secrets das functions: `CRON_SECRET_TOKEN` (já existe? confirmar), `N8N_WEBHOOK_SECRET` (novo);
   opcionais: `N8N_WEBHOOK_BASE_URL`, `ALLOWED_ORIGINS`.
5. Vault: `select vault.create_secret('<mesmo CRON_SECRET_TOKEN>', 'cron_secret');`.
6. n8n: validar o header `x-financy-secret` nos três webhooks.
7. Papel admin para a conta dona: `insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = '<seu e-mail>' on conflict do nothing;`.
8. Rotacionar `DEVELOPER_VALID_KEYS` se contiver alguma chave do histórico do git.
9. Deploy das functions alteradas (`supabase functions deploy <nome>`): `_shared` mudou, então todas as que o
   importam — `ai-agent`, `ai-financial-insights`, `support-agent`, `cakto-webhook`, `daily-transaction-reminder`,
   `process-scheduled-webhooks`, `process-recurring-transactions`, `schedule-user-webhooks`, `novo-usuario-webhook`,
   `ai-financial-agent`, `ai-support-agent`, `ai-tax-agent`, `get-main-dashboard`, `validate-developer-key`.
10. Só depois de aprovar o D-03 (e confirmar que o n8n não chama): `supabase functions delete ai-financial-agent`,
    `supabase functions delete ai-support-agent`, `supabase functions delete ai-tax-agent`,
    `supabase functions delete validate-developer-key`, `supabase functions delete get-main-dashboard`.
