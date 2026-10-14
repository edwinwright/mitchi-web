/**
 * The Mitchi die. One construction, expressed as SVG.
 *
 *   pip centres   0.24 / 0.50 / 0.76 x die
 *   pip diameter  0.170 x die  (faces 2-6)
 *                 0.340 x die  (the 1-pip, exactly 2x the rest)
 *   corner radius 22.9% of the die (22% on `block`)
 *   1, 4 red - 2, 3, 5, 6 blue
 *
 * The rendered box is the die PLUS its offset, so `offset` and `block` dice
 * never bleed outside their layout box. Use `size` as the die edge; read
 * `boxSize(size, variant)` when you need the full footprint.
 */

export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type DieVariant = "offset" | "flat" | "block";

const RED = "#D42B32";
const BLUE = "#2B4BC4";
const INK = "#14141A";
const WHITE = "#ffffff";

const FACES: Record<DieFace, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 1], [2, 1]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

// Fixed ids, not useId(): the component must render as a Server Component with
// no client JS. Every die defines byte-identical gradients, so repeated ids in
// one document resolve to the first match and render correctly — the same thing
// the exported SVG files do.
const CONTACT = "mitchi-drill-contact";
const DARK = "mitchi-drill-dark";
const LIGHT = "mitchi-drill-light";

const CENTRES = [0.24, 0.5, 0.76];
const OFFSET_RATIO: Record<DieVariant, number> = { offset: 0.088, flat: 0, block: 0.077 };

/** Full footprint of a die, die edge plus its offset. */
export function boxSize(size: number, variant: DieVariant = "flat") {
  return size * (1 + OFFSET_RATIO[variant]);
}

export type MitchiDieProps = {
  face: DieFace;
  /** Die edge in px. Default 48. */
  size?: number;
  /** Default "flat". */
  variant?: DieVariant;
  /** Set on dark grounds. */
  inverse?: boolean;
  /** Accessible name. Omitted, the die is decorative and hidden from AT. */
  title?: string;
  className?: string;
};

export function MitchiDie({
  face,
  size = 48,
  variant = "flat",
  inverse = false,
  title,
  className,
}: MitchiDieProps) {
  const S = size;
  const px = (n: number) => Number(n.toFixed(3));

  // outline, drawn as an inset ring so the pip grid stays pure geometry
  const outline =
    variant === "flat" && inverse ? null : inverse ? WHITE : INK;
  const weight = !outline
    ? 0
    : variant === "offset"
      ? 0.051 * S
      : variant === "block"
        ? Math.max(1.5, 0.048 * S)
        : Math.max(1, 0.032 * S);

  const radius = (variant === "block" ? 0.22 : 0.229) * S;
  const drop = OFFSET_RATIO[variant] * S;
  const pipColour = face === 1 || face === 4 ? RED : BLUE;

  // inverse: the offset takes the pip colour; block keeps a translucent drop
  const dropColour =
    variant === "block" ? (inverse ? WHITE : INK) : inverse ? pipColour : INK;
  const dropOpacity = variant === "block" ? (inverse ? 0.22 : 0.28) : 1;

  const diameter = (face === 1 ? 0.34 : 0.17) * S;
  // the drill is dropped once the pip is too small to read as anything but mud
  const drill = diameter >= 4;
  const box = px(S + drop);

  return (
    <svg
      className={className}
      width={box}
      height={box}
      viewBox={`0 0 ${box} ${box}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {drill ? (
        <defs>
          {/* The drill, the SVG answer to the CSS inset shadows: a faint contact
              ring where the wall meets the face, a dark crescent on the top-left
              rim, a lit bottom-right. The dark and light gradients move their
              whole end circle, not just the focal point, so the opposite rim
              never reaches the last stop and the two never contaminate. */}
          <radialGradient id={CONTACT}>
            <stop offset="0.82" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.13" />
          </radialGradient>
          <radialGradient id={DARK} cx="0.6" cy="0.6" r="0.72" fx="0.6" fy="0.6">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.62" />
          </radialGradient>
          <radialGradient id={LIGHT} cx="0.4" cy="0.4" r="0.72" fx="0.4" fy="0.4">
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.44" />
          </radialGradient>
        </defs>
      ) : null}

      {drop > 0 ? (
        <rect
          x={px(drop)}
          y={px(drop)}
          width={px(S)}
          height={px(S)}
          rx={px(radius)}
          fill={dropColour}
          fillOpacity={dropOpacity}
        />
      ) : null}

      <rect width={px(S)} height={px(S)} rx={px(radius)} fill={WHITE} />

      {outline ? (
        <rect
          x={px(weight / 2)}
          y={px(weight / 2)}
          width={px(S - weight)}
          height={px(S - weight)}
          rx={px(radius - weight / 2)}
          fill="none"
          stroke={outline}
          strokeWidth={px(weight)}
        />
      ) : null}

      {FACES[face].map(([col, row], i) => {
        const cx = px(CENTRES[col] * S);
        const cy = px(CENTRES[row] * S);
        const r = px(diameter / 2);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={pipColour} />
            {drill ? (
              <>
                <circle cx={cx} cy={cy} r={r} fill={`url(#${CONTACT})`} />
                <circle cx={cx} cy={cy} r={r} fill={`url(#${DARK})`} />
                <circle cx={cx} cy={cy} r={r} fill={`url(#${LIGHT})`} />
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
