import { describe, expect, it } from 'vitest';
import { Folder, Gamepad2, ShoppingCart } from 'lucide-react';
import { ICONES_CATEGORIA, iconeDaCategoria } from './iconesCategoria';
import {
  ADDITIONAL_BUSINESS_EXPENSE_OPTIONS, ADDITIONAL_PERSONAL_EXPENSE_OPTIONS, ADDITIONAL_PERSONAL_REVENUE_OPTIONS,
  BUSINESS_EXPENSE_CATEGORIES, BUSINESS_REVENUE_CATEGORIES, PERSONAL_EXPENSE_CATEGORIES, PERSONAL_REVENUE_CATEGORIES,
} from '@/features/categorias/categories';

describe('iconeDaCategoria', () => {
  it('resolve nomes kebab-case e PascalCase', () => {
    expect(iconeDaCategoria('shopping-cart')).toBe(ShoppingCart);
    expect(iconeDaCategoria('ShoppingCart')).toBe(ShoppingCart);
    expect(iconeDaCategoria('gamepad-2')).toBe(Gamepad2);
  });

  it('usa pasta para nomes vazios ou desconhecidos', () => {
    expect(iconeDaCategoria(undefined)).toBe(Folder);
    expect(iconeDaCategoria('nao-existe')).toBe(Folder);
  });
});

describe('ícones das categorias predefinidas', () => {
  it('todos os ícones usados em constants/categories estão no mapa', () => {
    const todas = [
      ...BUSINESS_REVENUE_CATEGORIES, ...BUSINESS_EXPENSE_CATEGORIES, ...ADDITIONAL_BUSINESS_EXPENSE_OPTIONS,
      ...PERSONAL_REVENUE_CATEGORIES, ...PERSONAL_EXPENSE_CATEGORIES, ...ADDITIONAL_PERSONAL_EXPENSE_OPTIONS,
      ...ADDITIONAL_PERSONAL_REVENUE_OPTIONS,
    ];
    const faltando = todas.map((c) => c.icon).filter((icone) => icone && !ICONES_CATEGORIA[icone]);
    expect(faltando).toEqual([]);
  });
});
