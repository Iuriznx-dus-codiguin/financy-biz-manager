import {
  Banknote,
  BookOpen,
  Briefcase,
  Building,
  Car,
  Coffee,
  Coins,
  CreditCard,
  Dumbbell,
  FileText,
  Folder,
  Fuel,
  Gamepad2,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  Megaphone,
  Music,
  Palette,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  TrendingUp,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

/**
 * Registro dos ícones de categoria, indexado pelos nomes em kebab-case que a
 * aplicação usa em `iconOptions` e em `constants/categories.ts`.
 *
 * Substitui o padrão `import * as Icons from 'lucide-react'` seguido de
 * `Icons[iconName]`, que tinha dois problemas:
 *
 * 1. **O ícone escolhido nunca aparecia.** O lucide-react exporta em
 *    PascalCase (`BookOpen`), então `Icons['book-open']` era `undefined` e
 *    todas as categorias caíam no fallback `Folder` — o seletor de ícone
 *    funcionava na aparência, mas o resultado era sempre a mesma pasta.
 *
 * 2. **O bundler não conseguia fazer tree-shaking.** Indexar o namespace com
 *    uma chave dinâmica obriga a incluir a biblioteca inteira: eram ~1.500
 *    ícones, 742 kB (132 kB gzip) num chunk compartilhado pelas telas de
 *    Categorias, Receitas e Despesas.
 *
 * Ao adicionar uma opção nova em `iconOptions`, importe o componente aqui e
 * registre a chave — `CATEGORY_ICON_NAMES` mantém as duas listas em sincronia.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  banknote: Banknote,
  'book-open': BookOpen,
  briefcase: Briefcase,
  building: Building,
  car: Car,
  coffee: Coffee,
  coins: Coins,
  'credit-card': CreditCard,
  dumbbell: Dumbbell,
  'file-text': FileText,
  folder: Folder,
  fuel: Fuel,
  'gamepad-2': Gamepad2,
  'graduation-cap': GraduationCap,
  heart: Heart,
  'heart-pulse': HeartPulse,
  home: Home,
  laptop: Laptop,
  megaphone: Megaphone,
  music: Music,
  palette: Palette,
  plane: Plane,
  shirt: Shirt,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  smartphone: Smartphone,
  stethoscope: Stethoscope,
  'trending-up': TrendingUp,
  users: Users,
  utensils: Utensils,
};

/** Ícone usado quando a categoria não tem ícone ou o nome é desconhecido. */
export const DEFAULT_CATEGORY_ICON: LucideIcon = Folder;

/**
 * Resolve o componente de ícone a partir do nome gravado na categoria.
 *
 * Aceita também PascalCase, para o caso de já existirem registros gravados
 * nesse formato no banco.
 */
export const getCategoryIcon = (iconName?: string | null): LucideIcon => {
  if (!iconName) return DEFAULT_CATEGORY_ICON;

  const direct = CATEGORY_ICONS[iconName];
  if (direct) return direct;

  // PascalCase -> kebab-case ("BookOpen" -> "book-open", "Gamepad2" -> "gamepad-2")
  const kebab = iconName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .toLowerCase();

  return CATEGORY_ICONS[kebab] ?? DEFAULT_CATEGORY_ICON;
};

/** Nomes disponíveis no seletor de ícone, em ordem alfabética estável. */
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);
