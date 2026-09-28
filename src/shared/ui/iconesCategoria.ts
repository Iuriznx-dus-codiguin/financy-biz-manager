// Ícones de categoria por nome gravado no banco (kebab-case, ex.: 'shopping-cart').
// Antes: `import * as Icons from 'lucide-react'` + Icons['shopping-cart'], que nunca batia com os nomes
// exportados (ShoppingCart) — toda categoria aparecia como pasta — e trazia a biblioteca inteira no bundle.
import {
  Banknote, BookOpen, Briefcase, Building, Car, Coffee, Coins, CreditCard, Dumbbell, FileText, Folder, Fuel,
  Gamepad2, GraduationCap, Heart, HeartPulse, Home, Laptop, type LucideIcon, Megaphone, Music, Palette, Plane,
  Shirt, ShoppingBag, ShoppingCart, Smartphone, Stethoscope, TrendingUp, Users, Utensils,
} from 'lucide-react';

export const ICONES_CATEGORIA: Record<string, LucideIcon> = {
  folder: Folder,
  utensils: Utensils,
  car: Car,
  home: Home,
  heart: Heart,
  'heart-pulse': HeartPulse,
  'book-open': BookOpen,
  'gamepad-2': Gamepad2,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  'credit-card': CreditCard,
  banknote: Banknote,
  coins: Coins,
  building: Building,
  plane: Plane,
  smartphone: Smartphone,
  laptop: Laptop,
  shirt: Shirt,
  coffee: Coffee,
  fuel: Fuel,
  'graduation-cap': GraduationCap,
  stethoscope: Stethoscope,
  dumbbell: Dumbbell,
  music: Music,
  palette: Palette,
  'file-text': FileText,
  megaphone: Megaphone,
  users: Users,
};

/** Aceita kebab-case ('shopping-cart') e PascalCase ('ShoppingCart'); desconhecido vira pasta. */
export function iconeDaCategoria(nome: string | null | undefined): LucideIcon {
  if (!nome) return Folder;
  const chave = nome.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return ICONES_CATEGORIA[chave] ?? ICONES_CATEGORIA[nome] ?? Folder;
}
