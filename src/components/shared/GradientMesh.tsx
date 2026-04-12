/**
 * GradientMesh -- Animated gradient mesh background.
 *
 * Renders an absolutely-positioned SVG with soft, blurred blobs that
 * drift slowly on looping CSS keyframe paths. Designed to sit behind
 * hero sections as an ambient, living background layer.
 *
 * Colors are drawn from the design-system chip palette at very low
 * opacity so the effect is subtle and non-distracting.
 */

const KEYFRAMES = `
@keyframes gm-blob-1 {
  0%, 100% { transform: translate(0%, 0%) scale(1); }
  25%      { transform: translate(12%, -8%) scale(1.1); }
  50%      { transform: translate(-6%, 10%) scale(0.9); }
  75%      { transform: translate(-10%, -4%) scale(1.15); }
}
@keyframes gm-blob-2 {
  0%, 100% { transform: translate(0%, 0%) scale(1); }
  25%      { transform: translate(-10%, 6%) scale(0.85); }
  50%      { transform: translate(8%, -10%) scale(1.12); }
  75%      { transform: translate(5%, 8%) scale(0.92); }
}
@keyframes gm-blob-3 {
  0%, 100% { transform: translate(0%, 0%) scale(1.05); }
  33%      { transform: translate(10%, 6%) scale(0.85); }
  66%      { transform: translate(-8%, -8%) scale(1.18); }
}
@keyframes gm-blob-4 {
  0%, 100% { transform: translate(0%, 0%) scale(0.9); }
  20%      { transform: translate(-6%, -10%) scale(1.1); }
  50%      { transform: translate(10%, 4%) scale(0.82); }
  80%      { transform: translate(-4%, 8%) scale(1.2); }
}
`;

interface GradientMeshProps {
  className?: string;
}

export function GradientMesh({ className }: GradientMeshProps) {
  return (
    <>
      {/* Inject keyframes once */}
      <style>{KEYFRAMES}</style>

      <svg
        className={className}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="gm-blur">
            <feGaussianBlur stdDeviation="70" />
          </filter>
        </defs>

        {/* Blob 1 -- Blue (#2563EB) */}
        <ellipse
          cx="200"
          cy="160"
          rx="180"
          ry="140"
          fill="#2563EB"
          opacity="0.12"
          filter="url(#gm-blur)"
          style={{ animation: 'gm-blob-1 28s ease-in-out infinite' }}
        />

        {/* Blob 2 -- Violet (#7C3AED) */}
        <ellipse
          cx="550"
          cy="120"
          rx="160"
          ry="130"
          fill="#7C3AED"
          opacity="0.10"
          filter="url(#gm-blur)"
          style={{ animation: 'gm-blob-2 34s ease-in-out infinite' }}
        />

        {/* Blob 3 -- Teal (#0D9488) */}
        <ellipse
          cx="650"
          cy="300"
          rx="200"
          ry="120"
          fill="#0D9488"
          opacity="0.09"
          filter="url(#gm-blur)"
          style={{ animation: 'gm-blob-3 24s ease-in-out infinite' }}
        />

        {/* Blob 4 -- Indigo (#4F46E5) */}
        <ellipse
          cx="120"
          cy="320"
          rx="170"
          ry="110"
          fill="#4F46E5"
          opacity="0.08"
          filter="url(#gm-blur)"
          style={{ animation: 'gm-blob-4 38s ease-in-out infinite' }}
        />
      </svg>
    </>
  );
}
