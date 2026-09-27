// Envia ao n8n os dados de boas-vindas de um usuário recém-cadastrado. O front chama com o JWT do
// próprio usuário (o userId do corpo, se vier, precisa ser o mesmo); o backend pode chamar para
// qualquer usuário. Antes: qualquer pessoa disparava para qualquer userId, e a leitura do perfil
// com a chave anon (sem o JWT) era barrada pela RLS.
import { ehChamadorInterno, usuarioDaRequisicao } from '../_shared/auth.ts';
import { json, lerJson, proibido, requisicaoInvalida, servir } from '../_shared/http.ts';
import { log } from '../_shared/logger.ts';
import { enviarParaN8n, urlN8n } from '../_shared/n8n.ts';
import { clienteServico } from '../_shared/supabase.ts';

servir('novo-usuario-webhook', async (req) => {
  const corpo = await lerJson<{ userId?: string }>(req).catch(() => ({} as { userId?: string }));

  let userId: string;
  if (ehChamadorInterno(req)) {
    if (!corpo.userId) throw requisicaoInvalida('userId é obrigatório');
    userId = corpo.userId;
  } else {
    const usuario = await usuarioDaRequisicao(req);
    if (corpo.userId && corpo.userId !== usuario.id) throw proibido();
    userId = usuario.id;
  }

  const { data: profile, error } = await clienteServico()
    .from('profiles')
    .select('nome_completo, email, telefone')
    .eq('id', userId)
    .maybeSingle();
  if (error || !profile) throw requisicaoInvalida('Perfil não encontrado');

  await enviarParaN8n(urlN8n('Novo-Usúario'), {
    nome: profile.nome_completo || 'Usuário',
    email: profile.email,
    telefone: profile.telefone || null,
    data_cadastro: new Date().toISOString(),
    user_id: userId,
  });

  log('info', 'boas_vindas.enviado', { user_id: userId, tem_telefone: !!profile.telefone });
  return json(req, { success: true, message: 'Dados de boas-vindas enviados com sucesso' });
});
