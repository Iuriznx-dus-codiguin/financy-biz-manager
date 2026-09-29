import { describe, expect, it } from 'vitest';
import { listaEmPortugues, planoPorNomeAproximado, planosComRecurso } from './planos';

describe('planosComRecurso', () => {
  it('dashboard avançado: Pro Pessoal e todos os empresariais (Plus Pessoal não)', () => {
    expect(planosComRecurso('dashboard_avancado')).toEqual(['Pro Pessoal', 'Plus Empresarial', 'PRO Empresarial', 'Super Company']);
  });

  it('inteligência básica: todos os planos', () => {
    expect(planosComRecurso('inteligencia_basica')).toHaveLength(5);
  });
});

describe('listaEmPortugues', () => {
  it('junta com vírgulas e "e"', () => {
    expect(listaEmPortugues([])).toBe('');
    expect(listaEmPortugues(['A'])).toBe('A');
    expect(listaEmPortugues(['A', 'B', 'C'])).toBe('A, B e C');
  });
});

describe('planoPorNomeAproximado', () => {
  it('reconhece acentos e caixa', () => {
    expect(planoPorNomeAproximado('PLANO PRO EMPRESARIAL ANUAL')?.id).toBe('business_pro_yearly');
    expect(planoPorNomeAproximado('Financy Plus pessoal')?.id).toBe('personal_plus_monthly');
    expect(planoPorNomeAproximado('Super Company - Anual')?.id).toBe('business_enterprise_yearly');
    expect(planoPorNomeAproximado('')).toBeNull();
  });
});
