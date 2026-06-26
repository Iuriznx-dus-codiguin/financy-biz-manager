/**
 * Confetes equilibrados para celebrar eventos importantes.
 *
 * Características:
 * - Duas rajadas laterais simétricas (mesmo volume dos dois lados).
 * - 3 ondas escalonadas (~180ms entre elas) — sensação fluida sem "loop frenético".
 * - Deduplicação opcional via `dedupeKey` (sessionStorage) — garante 1 disparo por evento.
 *
 * Use em: conclusão de onboarding, confirmação de pagamento, confirmação de e-mail,
 * criação de dashboard e outros marcos relevantes.
 */
import confetti from 'canvas-confetti';

const FIRED_KEY_PREFIX = 'fx-celebration:';
const inMemoryFired = new Set<string>();

interface CelebrateOptions {
  /** Se passado, garante que esse evento só dispare uma vez por sessão. */
  dedupeKey?: string;
  /** Atraso antes da primeira rajada (ms). Default 120 — permite a página pintar primeiro. */
  delay?: number;
  /** Paleta personalizada. */
  colors?: string[];
}

const DEFAULT_COLORS = ['#22c55e', '#10b981', '#14b8a6', '#facc15', '#3b82f6'];

export function celebrate(opts: CelebrateOptions = {}): void {
  if (typeof window === 'undefined') return;

  const { dedupeKey, delay = 120, colors = DEFAULT_COLORS } = opts;

  if (dedupeKey) {
    if (inMemoryFired.has(dedupeKey)) return;
    try {
      const storageKey = FIRED_KEY_PREFIX + dedupeKey;
      if (sessionStorage.getItem(storageKey)) {
        inMemoryFired.add(dedupeKey);
        return;
      }
      sessionStorage.setItem(storageKey, '1');
    } catch {
      /* sessionStorage indisponível — segue só com guarda em memória */
    }
    inMemoryFired.add(dedupeKey);
  }

  const burst = (originX: number, angle: number) => {
    confetti({
      particleCount: 55,
      angle,
      spread: 75,
      startVelocity: 55,
      gravity: 0.95,
      ticks: 220,
      origin: { x: originX, y: 0.72 },
      colors,
      scalar: 0.95,
      disableForReducedMotion: true,
    });
  };

  const waves = [0, 180, 360];
  window.setTimeout(() => {
    waves.forEach((offset) => {
      window.setTimeout(() => {
        burst(0.08, 60);
        burst(0.92, 120);
      }, offset);
    });
  }, delay);
}

/** Limpa a marca de deduplicação para permitir um novo disparo no mesmo evento. */
export function resetCelebration(dedupeKey: string): void {
  inMemoryFired.delete(dedupeKey);
  try {
    sessionStorage.removeItem(FIRED_KEY_PREFIX + dedupeKey);
  } catch {
    /* ignore */
  }
}
