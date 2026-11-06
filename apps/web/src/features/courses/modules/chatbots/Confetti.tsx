// ============================================================
// Les confettis du passage de niveau.
//
// Écrits à la main plutôt qu'ajoutés en dépendance : une soixantaine de
// pastilles animées ne justifient pas un paquet de plus dans un bundle qui
// dépasse déjà 6 Mo, et le rendu reste ici entièrement déclaratif — des
// éléments React animés par keyframes CSS, aucun canvas, aucune boucle
// d'animation à piloter à la main.
//
// `prefers-reduced-motion` supprime le mouvement : un TD se projette parfois
// en amphi, et certains étudiants ne supportent pas les animations.
// ============================================================

/** Palette du TD, strictement — pas de rose ni de violet festif. */
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b']

const COUNT = 60

interface Piece {
  left: number
  delay: number
  duration: number
  color: string
  size: number
  drift: number
  spin: number
}

/**
 * Générateur pseudo-aléatoire à graine fixe.
 *
 * `Math.random()` appelé pendant le rendu est impur : React peut rejouer un
 * rendu, et les pastilles sauteraient en pleine chute. Une suite déterministe
 * donne le même désordre à chaque fois — visuellement identique à du hasard,
 * et calculable une fois pour toutes au chargement du module.
 */
function mulberry(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Calculé au chargement, hors de tout rendu : constant et pur. */
const PIECES: Piece[] = (() => {
  const rnd = mulberry(0x5eed)
  return Array.from({ length: COUNT }, () => ({
    left: rnd() * 100,
    delay: rnd() * 0.6,
    duration: 2.4 + rnd() * 1.6,
    color: COLORS[Math.floor(rnd() * COLORS.length)],
    size: 5 + rnd() * 6,
    drift: (rnd() - 0.5) * 160,
    spin: 360 + rnd() * 720,
  }))
})()

/** Pluie de confettis, le temps d'une animation. */
export function Confetti() {
  const pieces = PIECES

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden motion-reduce:hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block animate-[td-confetti_var(--d)_linear_var(--delay)_forwards]"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              backgroundColor: p.color,
              borderRadius: 1,
              '--d': `${p.duration}s`,
              '--delay': `${p.delay}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
