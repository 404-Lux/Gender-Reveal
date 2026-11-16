'use client';

import React, { useId } from 'react';

export interface PaperBalloonProps {
  fill: string;
  shade: string;
  highlight: string;
  rim?: string;
  isHero?: boolean;
  className?: string;
  size?: number;
  badgeNumber?: number;
  animateTail?: boolean;
}

/**
 * Symmetrical, Sculptural Layered Paper-Cut Balloon with an animated waving string tail
 * and gentle buoyant body motion so it looks genuinely alive in flight.
 */
export function PaperBalloonSvg({
  fill,
  shade,
  highlight,
  rim = '#C9CEC6',
  isHero = false,
  className = '',
  size = 124,
  badgeNumber,
  animateTail = true,
}: PaperBalloonProps) {
  const uid = useId().replace(/:/g, '');
  const height = Math.round(size * 1.38);

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 160 222"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`paper-cut-shadow select-none mx-auto block ${className}`}
    >
      <defs>
        <radialGradient
          id={`balloon-grad-${uid}`}
          cx="38%"
          cy="30%"
          r="70%"
          fx="35%"
          fy="28%"
        >
          <stop offset="0%" stopColor={highlight} stopOpacity="0.96" />
          <stop offset="52%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={shade} stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* Hero outer concentric halo with gentle pulse */}
      {isHero && (
        <g>
          <circle cx="80" cy="76" r="72" fill="#E8CF92" fillOpacity="0.24">
            {animateTail && (
              <animate
                attributeName="r"
                values="69;74;69"
                dur="2.4s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          <circle
            cx="80"
            cy="76"
            r="64"
            stroke="#C98A62"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.65"
          >
            {animateTail && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 80 76"
                to="360 80 76"
                dur="24s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        </g>
      )}

      {/* Animated Waving Cotton String Tail (ripples smoothly like a real balloon string in the air) */}
      <path
        d="M80 146 C71 162, 89 178, 76 196 C70 205, 85 213, 80 220"
        stroke="#66745E"
        strokeWidth={isHero ? '2' : '1.65'}
        strokeLinecap="round"
        opacity="0.82"
      >
        {animateTail && (
          <animate
            attributeName="d"
            dur={isHero ? '1.8s' : '1.35s'}
            repeatCount="indefinite"
            values="
              M80 146 C69 162, 91 178, 74 196 C68 205, 86 213, 78 220;
              M80 146 C91 162, 69 178, 86 196 C92 205, 74 213, 82 220;
              M80 146 C69 162, 91 178, 74 196 C68 205, 86 213, 78 220
            "
          />
        )}
      </path>

      {/* Secondary ribbon streamer for Hero Balloon that also flutters */}
      {isHero && (
        <path
          d="M80 146 C92 160, 70 176, 88 194 C94 202, 76 210, 84 218"
          stroke="#C98A62"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        >
          {animateTail && (
            <animate
              attributeName="d"
              dur="1.5s"
              repeatCount="indefinite"
              values="
                M80 146 C92 160, 70 176, 88 194 C94 202, 76 210, 84 218;
                M80 146 C68 160, 90 176, 72 194 C66 202, 84 210, 76 218;
                M80 146 C92 160, 70 176, 88 194 C94 202, 76 210, 84 218
              "
            />
          )}
        </path>
      )}

      {/* Balloon Body Group with subtle buoyant tilt & breathing */}
      <g>
        {animateTail && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-2.2 80 142; 2.2 80 142; -2.2 80 142"
            dur={isHero ? '2.4s' : '1.9s'}
            repeatCount="indefinite"
          />
        )}

        {/* Symmetrical paper ribbon bow at collar */}
        <g>
          <path
            d="M80 144 C68 148, 58 156, 54 164 C63 162, 72 155, 80 147 Z"
            fill={isHero ? '#C98A62' : shade}
            opacity={isHero ? 0.95 : 0.78}
          />
          <path
            d="M80 144 C92 148, 102 156, 106 164 C97 162, 88 155, 80 147 Z"
            fill={isHero ? '#B0714A' : shade}
            opacity={isHero ? 0.95 : 0.78}
          />
        </g>

        {/* Symmetrical cut-paper mat rim (centered at x = 80) */}
        <path
          d="M80 14 C42 14, 20 42, 20 75 C20 109, 49 134, 73 141 L69 149 H91 L87 141 C111 134, 140 109, 140 75 C140 42, 118 14, 80 14 Z"
          fill="#FBF8F2"
          stroke={rim}
          strokeWidth="1.2"
        />

        {/* Main sculptural balloon body (centered at x = 80) */}
        <path
          d="M80 18 C45 18, 24 44, 24 75 C24 106, 51 130, 74 137 L71 145 H89 L86 137 C109 130, 136 106, 136 75 C136 44, 115 18, 80 18 Z"
          fill={`url(#balloon-grad-${uid})`}
        />

        {/* Subtle right-half paper-cut facet for tactile editorial depth */}
        <path
          d="M80 18 C89 44, 89 104, 80 137 L86 137 C109 130, 136 106, 136 75 C136 44, 115 18, 80 18 Z"
          fill={shade}
          opacity="0.28"
        />

        {/* Crisp inner paper-cut specular highlight crescent */}
        <path
          d="M50 34 C38 45, 33 60, 35 77 C38 61, 44 47, 57 38 C55 35, 52 34, 50 34 Z"
          fill="#FFFFFF"
          opacity="0.82"
        />
        <circle cx="40" cy="87" r="3.2" fill="#FFFFFF" opacity="0.68" />

        {/* Center Emblem (Star for Hero, or clean number medallion) */}
        {isHero ? (
          <g transform="translate(80, 74)">
            <circle
              cx="0"
              cy="0"
              r="22"
              fill="#FBF8F2"
              fillOpacity="0.92"
              stroke="#C98A62"
              strokeWidth="1"
            />
            <path
              d="M0 -13 L3.4 -3.4 L13 0 L3.4 3.4 L0 13 L-3.4 3.4 L-13 0 L-3.4 -3.4 Z"
              fill="#C98A62"
            />
          </g>
        ) : badgeNumber !== undefined ? (
          <g transform="translate(80, 76)">
            <circle cx="0" cy="0" r="15" fill="#FBF8F2" fillOpacity="0.88" />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fill="#26302B"
              fontSize="13"
              fontWeight="600"
              fontFamily="var(--font-fraunces), Georgia, serif"
            >
              {badgeNumber}
            </text>
          </g>
        ) : null}

        {/* Balloon Collar Wrap (centered at x = 80) */}
        <rect x="71" y="136" width="18" height="4.5" rx="2.2" fill={shade} />
      </g>
    </svg>
  );
}

/**
 * Layered Paper-Cut Cloud with warm linen elevation and subtle shadow rim.
 */
export function PaperCloudSvg({
  className = '',
  variant = 'left',
}: {
  className?: string;
  variant?: 'left' | 'right';
}) {
  return (
    <svg
      viewBox="0 0 260 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`paper-cut-shadow select-none ${className}`}
    >
      <path
        d={
          variant === 'left'
            ? 'M32 92H228C243 92 252 81 250 67C248 55 237 47 225 48C219 27 199 14 176 16C159 17 145 27 137 41C128 34 116 31 103 34C87 37 75 50 73 66C68 63 61 62 54 63C38 66 28 79 32 92Z'
            : 'M24 92H224C239 92 249 80 246 66C244 53 231 45 218 47C212 31 196 20 177 22C167 23 158 28 151 35C141 18 121 9 99 13C75 17 58 38 58 61C41 61 26 74 24 92Z'
        }
        fill="#E5DDD0"
        transform="translate(3, 4)"
      />
      <path
        d={
          variant === 'left'
            ? 'M32 92H228C243 92 252 81 250 67C248 55 237 47 225 48C219 27 199 14 176 16C159 17 145 27 137 41C128 34 116 31 103 34C87 37 75 50 73 66C68 63 61 62 54 63C38 66 28 79 32 92Z'
            : 'M24 92H224C239 92 249 80 246 66C244 53 231 45 218 47C212 31 196 20 177 22C167 23 158 28 151 35C141 18 121 9 99 13C75 17 58 38 58 61C41 61 26 74 24 92Z'
        }
        fill="#FBF8F2"
      />
      <path
        d="M52 84H212"
        stroke="#EAE1D3"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Faceted Paper-Folded Star (4-point or 8-point)
 */
export function PaperStarSvg({
  size = 24,
  color = '#E8CF92',
  shade = '#D4B673',
  points = 4,
  className = '',
}: {
  size?: number;
  color?: string;
  shade?: string;
  points?: 4 | 8;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
    >
      {points === 8 && (
        <path
          d="M16 4L18.5 13.5L28 16L18.5 18.5L16 28L13.5 18.5L4 16L13.5 13.5Z"
          fill={shade}
          transform="rotate(45 16 16)"
          opacity="0.75"
        />
      )}
      <path
        d="M16 1L19.4 12.6L31 16L19.4 19.4L16 31L12.6 19.4L1 16L12.6 12.6Z"
        fill={color}
      />
      <path d="M16 1L19.4 12.6L31 16L16 16Z" fill={shade} opacity="0.45" />
      <path d="M16 31L12.6 19.4L1 16L16 16Z" fill={shade} opacity="0.35" />
    </svg>
  );
}

/**
 * Hand-cut Paper Bow / Ribbon Illustration
 */
export function PaperBowSvg({
  color = '#C98A62',
  shade = '#A86D49',
  size = 64,
  className = '',
}: {
  color?: string;
  shade?: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 80 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`paper-cut-shadow select-none ${className}`}
    >
      <path d="M36 30L20 55L28 50L33 57L41 32Z" fill={shade} />
      <path d="M44 30L60 55L52 50L47 57L39 32Z" fill={color} />
      <path d="M38 26C26 12 10 12 8 24C6 36 24 39 38 30Z" fill={color} />
      <path
        d="M36 27C26 20 15 21 14 26C19 30 28 31 36 28Z"
        fill={shade}
        opacity="0.45"
      />
      <path d="M42 26C54 12 70 12 72 24C74 36 56 39 42 30Z" fill={color} />
      <path
        d="M44 27C54 20 65 21 66 26C61 30 52 31 44 28Z"
        fill={shade}
        opacity="0.45"
      />
      <rect x="35" y="22" width="10" height="11" rx="3" fill={shade} />
      <rect x="36.5" y="23" width="7" height="9" rx="2" fill={color} />
    </svg>
  );
}

/**
 * Embossed Wax Seal SVG (Strictly centered at 28,28 in 56x56 viewBox)
 */
export function WaxSealSvg({
  color = '#C98A62',
  rim = '#A66A46',
  size = 48,
  label = 'A',
  className = '',
}: {
  color?: string;
  rim?: string;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`paper-cut-shadow select-none block mx-auto ${className}`}
    >
      <circle cx="28" cy="28" r="25" fill={color} />
      <circle
        cx="28"
        cy="28"
        r="20"
        stroke={rim}
        strokeWidth="1.8"
        fill={color}
      />
      <circle
        cx="28"
        cy="28"
        r="16.5"
        stroke="#FBF8F2"
        strokeWidth="0.85"
        strokeDasharray="2.5 2.5"
        opacity="0.7"
      />
      <text
        x="28"
        y="33"
        textAnchor="middle"
        fill="#FBF8F2"
        fontSize="15"
        fontFamily="var(--font-fraunces), Georgia, serif"
        fontWeight="600"
      >
        {label}
      </text>
    </svg>
  );
}

/**
 * Artisanal, Multi-Layered Paper-Cut Sticker Illustrations for the Photobooth
 * (Used both as live UI preview icons and rendered at high resolution onto the photo canvas)
 */
export function PaperCutStickerSvg({
  sticker,
  primaryColor,
  darkColor,
  sandColor = '#EADBC0',
  size = 56,
  className = '',
}: {
  sticker: 'crown' | 'bow' | 'stars' | 'seal' | 'balloon';
  primaryColor: string;
  darkColor: string;
  sandColor?: string;
  size?: number;
  className?: string;
}) {
  if (sticker === 'crown') {
    // Heirloom Origami & Filigree Paper Crown with Star Jewels & Stitched Band
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`paper-cut-shadow select-none ${className}`}
      >
        {/* White die-cut sticker backing border */}
        <path
          d="M16 90 L10 38 L38 56 L60 18 L82 56 L110 38 L104 90 C104 96, 98 100, 90 100 H30 C22 100, 16 96, 16 90 Z"
          fill="#FBF8F2"
          stroke="#E5DDD0"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Back crown shadow spires */}
        <path
          d="M24 84 L38 42 L60 66 L82 42 L96 84 Z"
          fill="#D4B673"
          opacity="0.7"
        />
        {/* Main Butter-Gold Origami Crown Facets */}
        <path
          d="M20 84 L15 43 L41 61 L60 25 L79 61 L105 43 L100 84 H20 Z"
          fill="#E8CF92"
        />
        {/* Right-half fold shading on each spire */}
        <path d="M60 25 L79 61 L60 84 V25 Z" fill="#D4B673" opacity="0.55" />
        <path d="M105 43 L100 84 H79 L105 43 Z" fill="#D4B673" opacity="0.45" />
        {/* Stitched Velvet/Paper Base Band */}
        <rect x="20" y="78" width="80" height="14" rx="4" fill={primaryColor} />
        <line
          x1="25"
          y1="85"
          x2="95"
          y2="85"
          stroke="#FBF8F2"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        {/* Faceted Diamond Jewels on Spires */}
        <polygon points="60,46 66,55 60,64 54,55" fill={primaryColor} />
        <polygon points="60,49 64,55 60,61 56,55" fill="#FBF8F2" />
        <circle cx="35" cy="67" r="4" fill={darkColor} />
        <circle cx="85" cy="67" r="4" fill={darkColor} />
        {/* Pearl tips */}
        <circle cx="60" cy="21" r="4.5" fill={primaryColor} />
        <circle cx="15" cy="40" r="3.5" fill={primaryColor} />
        <circle cx="105" cy="40" r="3.5" fill={primaryColor} />
      </svg>
    );
  }

  if (sticker === 'bow') {
    // Couture Layered Paper & Silk Ribbon Bow with Pleats & Botanical Sprigs
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`paper-cut-shadow select-none ${className}`}
      >
        {/* Die-cut paper backing */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="#FBF8F2"
          stroke="#E5DDD0"
          strokeWidth="2.5"
        />
        <circle
          cx="60"
          cy="60"
          r="44"
          stroke={primaryColor}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.5"
        />
        {/* Fluttering Swallowtail Ribbons */}
        <path
          d="M54 58 L26 98 L39 91 L46 101 L58 62 Z"
          fill={darkColor}
          opacity="0.85"
        />
        <path
          d="M66 58 L94 98 L81 91 L74 101 L62 62 Z"
          fill={primaryColor}
        />
        {/* Left Pleated Ribbon Loop */}
        <path
          d="M56 52 C34 26, 12 32, 14 52 C16 72, 40 72, 56 58 Z"
          fill={primaryColor}
        />
        <path
          d="M54 54 C38 42, 22 44, 22 52 C26 60, 42 60, 54 56 Z"
          fill={darkColor}
          opacity="0.35"
        />
        {/* Right Pleated Ribbon Loop */}
        <path
          d="M64 52 C86 26, 108 32, 106 52 C104 72, 80 72, 64 58 Z"
          fill={primaryColor}
        />
        <path
          d="M66 54 C82 42, 98 44, 98 52 C94 60, 78 60, 66 56 Z"
          fill={darkColor}
          opacity="0.35"
        />
        {/* Center Wrapped Knot with Gold Star */}
        <rect x="51" y="44" width="18" height="22" rx="6" fill={darkColor} />
        <rect x="53.5" y="46" width="13" height="18" rx="4.5" fill={primaryColor} />
        <path
          d="M60 48 L62 53 L67 55 L62 57 L60 62 L58 57 L53 55 L58 53 Z"
          fill="#FBF8F2"
        />
      </svg>
    );
  }

  if (sticker === 'stars') {
    // Celestial Paper Moon & Layered Origami Starburst Badge
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`paper-cut-shadow select-none ${className}`}
      >
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="#FBF8F2"
          stroke="#E5DDD0"
          strokeWidth="2.5"
        />
        {/* Inner Tinted Sky Medallion */}
        <circle cx="60" cy="60" r="42" fill={sandColor} fillOpacity="0.55" />
        {/* Layered Paper Crescent Moon */}
        <path
          d="M54 26 C36 30, 26 48, 32 68 C38 86, 58 94, 76 86 C58 86, 44 72, 44 54 C44 40, 48 31, 54 26 Z"
          fill="#E8CF92"
        />
        <path
          d="M54 26 C48 31, 44 40, 44 54 C44 72, 58 86, 76 86 C64 91, 46 86, 38 72"
          stroke="#D4B673"
          strokeWidth="1.5"
        />
        {/* 8-Point Faceted Origami North Star */}
        <g transform="translate(72, 46)">
          <path
            d="M0 -22 L5 -5 L22 0 L5 5 L0 22 L-5 5 L-22 0 L-5 -5 Z"
            fill={primaryColor}
          />
          <path
            d="M0 -14 L3.5 -3.5 L14 0 L3.5 3.5 L0 14 L-3.5 3.5 L-14 0 L-3.5 -3.5 Z"
            fill="#FBF8F2"
            transform="rotate(45)"
          />
          <circle cx="0" cy="0" r="3.5" fill="#E8CF92" />
        </g>
        {/* Mini companion star */}
        <path
          d="M36 36 L38 41 L43 43 L38 45 L36 50 L34 45 L29 43 L34 41 Z"
          fill={darkColor}
        />
      </svg>
    );
  }

  if (sticker === 'seal') {
    // Embossed Botanical Wax Seal & Ribbon Rosette
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`paper-cut-shadow select-none ${className}`}
      >
        {/* Pleated Rosette Ribbons underneath */}
        <path d="M46 78 L30 110 L43 103 L50 112 L58 82 Z" fill={darkColor} />
        <path d="M74 78 L90 110 L77 103 L70 112 L62 82 Z" fill={primaryColor} />
        {/* Scalloped Outer Paper Backing */}
        <circle
          cx="60"
          cy="54"
          r="42"
          fill="#FBF8F2"
          stroke="#E5DDD0"
          strokeWidth="2.5"
        />
        {/* Embossed Wax Seal Disc */}
        <circle cx="60" cy="54" r="36" fill={primaryColor} />
        <circle
          cx="60"
          cy="54"
          r="30"
          stroke={darkColor}
          strokeWidth="2"
          fill={primaryColor}
        />
        <circle
          cx="60"
          cy="54"
          r="25"
          stroke="#FBF8F2"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.85"
        />
        {/* Botanical Olive Sprigs + Star Crest */}
        <path
          d="M45 62 C45 50, 52 42, 60 38 C68 42, 75 50, 75 62"
          stroke="#E8CF92"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M60 36 L63 44 L71 47 L63 50 L60 58 L57 50 L49 47 L57 44 Z"
          fill="#FBF8F2"
        />
        <text
          x="60"
          y="71"
          textAnchor="middle"
          fill="#FBF8F2"
          fontSize="9.5"
          fontWeight="700"
          letterSpacing="1.5"
          fontFamily="Georgia, serif"
        >
          BABY
        </text>
      </svg>
    );
  }

  // 'balloon': Vintage Paper-Cut Hot Air Balloon with Striped Canopy & Wicker Basket
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`paper-cut-shadow select-none ${className}`}
    >
      {/* Die-cut sticker backing */}
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="#FBF8F2"
        stroke="#E5DDD0"
        strokeWidth="2.5"
      />
      {/* Outer Hot Air Balloon Canopy */}
      <path
        d="M60 16 C35 16, 22 36, 26 57 C29 72, 43 81, 49 87 H71 C77 81, 91 72, 94 57 C98 36, 85 16, 60 16 Z"
        fill={primaryColor}
      />
      {/* Striped Paper Gore Panels */}
      <path
        d="M60 16 C45 16, 37 36, 40 57 C42 71, 50 81, 54 87 H66 C70 81, 78 71, 80 57 C83 36, 75 16, 60 16 Z"
        fill="#FBF8F2"
      />
      <path
        d="M60 16 C53 16, 49 36, 51 57 C52 71, 56 81, 58 87 H62 C64 81, 68 71, 69 57 C71 36, 67 16, 60 16 Z"
        fill="#E8CF92"
      />
      {/* Scalloped Paper Swag Garland Across Middle */}
      <path
        d="M26 52 Q38 60 50 52 Q60 60 70 52 Q82 60 94 52"
        stroke={darkColor}
        strokeWidth="2"
        fill="none"
      />
      {/* Rigging Ropes */}
      <line x1="52" y1="87" x2="54" y2="96" stroke={darkColor} strokeWidth="1.5" />
      <line x1="68" y1="87" x2="66" y2="96" stroke={darkColor} strokeWidth="1.5" />
      {/* Woven Wicker Paper Basket */}
      <rect
        x="50"
        y="95"
        width="20"
        height="14"
        rx="3"
        fill="#C98A62"
        stroke={darkColor}
        strokeWidth="1.2"
      />
      <line x1="50" y1="101" x2="70" y2="101" stroke="#FBF8F2" strokeWidth="1" />
    </svg>
  );
}

/**
 * Neutral, Symmetrical Paper-Cut Emblems for Team Boy vs Team Girl Cards.
 */
export function TeamPaperCardArt({
  team,
  selected,
}: {
  team: 'boy' | 'girl';
  selected: boolean;
}) {
  if (team === 'boy') {
    return (
      <svg
        viewBox="0 0 140 120"
        className="mx-auto block h-24 w-28 paper-cut-shadow"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="70"
          cy="60"
          r="46"
          fill="#F4EEE3"
          stroke={selected ? '#C98A62' : '#C9CEC6'}
          strokeWidth="1.5"
        />
        <path
          d="M70 14L72.5 21.5L80 24L72.5 26.5L70 34L67.5 26.5L60 24L67.5 21.5Z"
          fill="#E8CF92"
        />
        <path d="M70 35L46 76H70V35Z" fill="#FBF8F2" />
        <path d="M70 35L94 76H70V35Z" fill="#E6DDD0" />
        <path d="M38 79H102L90 94H50L38 79Z" fill="#C98A62" />
        <path d="M70 79H102L90 94H70V79Z" fill="#B0714A" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 140 120"
      className="mx-auto block h-24 w-28 paper-cut-shadow"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="70"
        cy="60"
        r="46"
        fill="#F4EEE3"
        stroke={selected ? '#C98A62' : '#C9CEC6'}
        strokeWidth="1.5"
      />
      <path
        d="M70 14L72.5 21.5L80 24L72.5 26.5L70 34L67.5 26.5L60 24L67.5 21.5Z"
        fill="#E8CF92"
      />
      <circle cx="70" cy="59" r="20" fill="#FBF8F2" />
      <path
        d="M70 39C76 47 84 47 89 55C84 63 84 71 70 79C56 71 56 63 51 55C56 47 64 47 70 39Z"
        fill="#E6DDD0"
      />
      <circle cx="70" cy="59" r="8" fill="#C98A62" />
      <circle cx="70" cy="59" r="3.5" fill="#FBF8F2" />
      <path d="M70 79L54 94L60 93L63 98L70 83Z" fill="#B0714A" />
      <path d="M70 79L86 94L80 93L77 98L70 83Z" fill="#C98A62" />
    </svg>
  );
}

/**
 * Floating SVG Reaction Particle (Heart, Star, Mini Balloon, Bow — ZERO Emoji)
 */
export function ReactionParticleSvg({
  kind,
  color,
  size = 28,
}: {
  kind: 'heart' | 'star' | 'balloon' | 'bow';
  color: string;
  size?: number;
}) {
  if (kind === 'heart') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className="paper-cut-shadow"
      >
        <path
          d="M16 28C16 28 4 19.8 4 11.2C4 7.2 7.2 4 11.2 4C13.6 4 15.2 5.2 16 6.8C16.8 5.2 18.4 4 20.8 4C24.8 4 28 7.2 28 11.2C28 19.8 16 28 16 28Z"
          fill={color}
        />
        <path
          d="M16 6.8C16.8 5.2 18.4 4 20.8 4C24.8 4 28 7.2 28 11.2C28 19.8 16 28 16 28V6.8Z"
          fill="#000000"
          fillOpacity="0.14"
        />
      </svg>
    );
  }
  if (kind === 'star') {
    return <PaperStarSvg size={size} color={color} points={8} />;
  }
  if (kind === 'bow') {
    return <PaperBowSvg size={size} color={color} shade={color} />;
  }
  return (
    <svg
      width={size}
      height={Math.round(size * 1.4)}
      viewBox="0 0 28 40"
      fill="none"
      className="paper-cut-shadow"
    >
      <path
        d="M14 2C7.8 2 3 6.8 3 13C3 19 8.2 24 12.6 25.4L11.8 27H16.2L15.4 25.4C19.8 24 25 19 25 13C25 6.8 20.2 2 14 2Z"
        fill={color}
      />
      <path
        d="M14 27C11 31 17 35 14 39"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        <animate
          attributeName="d"
          dur="1.2s"
          repeatCount="indefinite"
          values="M14 27C11 31 17 35 14 39; M14 27C17 31 11 35 14 39; M14 27C11 31 17 35 14 39"
        />
      </path>
    </svg>
  );
}

/**
 * Perfectly Centered Editorial Divider Ornament
 */
export function PaperOrnamentDivider({ className = '' }: { className?: string }) {
  return (
    <div
      className={`mx-auto flex w-full max-w-xs items-center justify-center gap-4 ${className}`}
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-[var(--border-hairline)]" />
      <svg
        width="24"
        height="12"
        viewBox="0 0 24 12"
        fill="none"
        className="shrink-0"
      >
        <path
          d="M12 1L14 4.6L18 6L14 7.4L12 11L10 7.4L6 6L10 4.6Z"
          fill="var(--accent-primary)"
        />
      </svg>
      <span className="h-px flex-1 bg-[var(--border-hairline)]" />
    </div>
  );
}
