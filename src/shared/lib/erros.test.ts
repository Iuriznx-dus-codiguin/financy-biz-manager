import { describe, expect, it } from 'vitest';
import { ehColunaAusente, ehFuncaoAusente, erroDaFunction, mensagemDeErro } from './erros';

describe('erros', () => {
  it('reconhece RPC e coluna ausentes', () => {
    expect(ehFuncaoAusente({ code: 'PGRST202', message: 'Could not find the function public.x' })).toBe(true);
    expect(ehColunaAusente({ code: 'PGRST204', message: "Could not find the 'valor_tipo' column of 'impostos'" })).toBe(true);
    expect(ehFuncaoAusente({ code: '42501' })).toBe(false);
  });

  it('traduz os erros do paywall e do limite de dashboards', () => {
    expect(mensagemDeErro({ code: 'P0001', message: 'Seu plano permite 1 perfil(is)/empresa(s).', hint: 'LIMITE_DASHBOARDS' }))
      .toBe('Seu plano permite 1 perfil(is)/empresa(s). Faça upgrade para criar mais.');
    expect(mensagemDeErro({ code: '42501', message: 'new row violates row-level security policy for table "receitas"' }))
      .toMatch(/assinatura não está ativa/);
    expect(mensagemDeErro({ code: '23505', message: 'Este número de telefone já está cadastrado' }))
      .toBe('Este número de telefone já está cadastrado');
    expect(mensagemDeErro(new Error('x'), 'padrão')).toBe('padrão');
  });

  it('lê o corpo de erro das edge functions', async () => {
    const context = new Response(JSON.stringify({ error: 'Este recurso exige uma assinatura ativa.', code: 'ASSINATURA_INATIVA' }), { status: 402 });
    expect(await erroDaFunction({ context })).toEqual({
      mensagem: 'Este recurso exige uma assinatura ativa.', codigo: 'ASSINATURA_INATIVA', status: 402,
    });
    expect(await erroDaFunction(new Error('rede'), 'padrão')).toEqual({ mensagem: 'padrão', codigo: null, status: null });
  });
});
