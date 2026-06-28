## Diagnóstico atual

A função `cakto-webhook` está publicada e os segredos obrigatórios existem. O teste sem autenticação retorna 401 corretamente, então o endpoint está ativo. O erro 500 informado indica que a requisição autenticada chega na função, mas alguma etapa interna está falhando e hoje o `safeHandler` mascara a causa como `Erro interno do servidor`.

Pontos frágeis encontrados no código atual:
- O plano é identificado usando o `payload` raiz, mas os dados reais do produto podem estar dentro de `payload.data`; isso pode gerar `Plano não identificado` e virar 500.
- A busca de usuário usa `.single()` em `profiles`; se o cliente pagar antes de existir perfil, se houver email com capitalização diferente ou se o email vier em outro campo do payload, o webhook falha com 500.
- O insert em `receitas` não envia `dashboard_id`; triggers não aparecem ativos na leitura atual, então a receita pode falhar se alguma regra/índice depender disso.
- A função não é idempotente: retries do Cakto podem duplicar receita/notificação ou falhar em conflitos.
- Eventos diferentes de pagamento aprovado são tratados genericamente; cancelamento, reembolso, chargeback e renovação podem não atualizar a assinatura corretamente.
- Os logs atuais não expõem um código de erro operacional seguro para saber exatamente qual etapa falhou sem depender de stack trace.

## Plano de correção

1. **Fortalecer parsing do payload Cakto**
   - Normalizar o payload para um objeto interno único com: evento, status, email, valor, transação, produto e metadados.
   - Procurar dados tanto no objeto raiz quanto em `data`, `customer`, `product`, `offer`, `payment`, `subscription` e variações comuns.
   - Normalizar email em lowercase/trim.

2. **Corrigir identificação do plano**
   - Fazer `identifyPlan` receber os dados normalizados, não apenas o payload raiz.
   - Usar `metadata.plan_id`, `product.name`, `offer.name`, `product_name` e possíveis slugs/códigos.
   - Para plano não identificado, retornar erro 422 com mensagem operacional segura, não 500.

3. **Evitar falhas quando o usuário ainda não tem perfil**
   - Buscar perfil por email normalizado.
   - Se não existir perfil, não quebrar com 500: registrar o evento como recebido/não aplicado e responder 202/200 com motivo claro, para o Cakto não considerar falha técnica.
   - Se existir mais de um perfil por email, escolher de forma determinística e registrar log de alerta.

4. **Garantir dashboard para registros financeiros**
   - Antes de inserir receita de assinatura, chamar a função `get_user_main_dashboard(user_id)` para obter/criar dashboard principal.
   - Inserir a receita com `dashboard_id` preenchido.

5. **Adicionar idempotência no processamento**
   - Usar `transaction_id`/`cakto_subscription_id` para impedir duplicidade de receita e notificação em retries.
   - Atualizar assinatura via upsert por `user_id`, mas preservar dados úteis já existentes.
   - Se o mesmo evento chegar novamente, responder sucesso sem duplicar efeitos colaterais.

6. **Tratar eventos de ciclo de assinatura**
   - Pagamento aprovado/pago: ativar assinatura e registrar receita.
   - Cancelamento/reembolso/chargeback/assinatura expirada: atualizar status da assinatura de forma segura sem apagar histórico.
   - Eventos desconhecidos: responder 200 como recebido e ignorado, com log claro.

7. **Melhorar respostas e logs**
   - Separar erros de autenticação (401), payload inválido (400), plano não identificado (422), usuário não encontrado (202/200 controlado) e erro inesperado (500).
   - Incluir nos logs somente dados não sensíveis: evento, status, email mascarado, transaction_id, etapa e código do erro.
   - Nunca logar segredo recebido no payload.

8. **Validar ponta a ponta**
   - Testar chamada sem secret: deve retornar 401.
   - Testar payload aprovado com secret: deve retornar sucesso controlado ou usuário pendente, sem 500.
   - Testar retry do mesmo transaction_id: não deve duplicar receita/notificação.
   - Testar evento ignorado/cancelado: deve responder 200 e atualizar status quando aplicável.
   - Conferir logs da Edge Function após os testes.

## Arquivos previstos

- `supabase/functions/cakto-webhook/index.ts`
  - Refatoração do parsing, autenticação, identificação de plano, idempotência, status e respostas.

Possível ajuste de banco somente se a validação mostrar ausência de índice/constraint confiável para idempotência em `payment_notifications` ou `receitas`. Se necessário, será criada uma migration pequena e segura.