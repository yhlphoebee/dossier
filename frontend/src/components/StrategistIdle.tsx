import styles from './StrategistIdle.module.css'

export default function StrategistIdle() {
  return (
    <div className={styles.root}>
      {/* Circle background */}
      <div className={styles.circle}>
        {/* Inline SVG so we can animate individual parts */}
        <svg
          className={styles.svg}
          viewBox="0 0 1080 1080"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Body polygon */}
          <polygon
            className={styles.body}
            points="7.52 17.08 715.2 17.08 1069.04 555.88 361.36 1062.51 715.2 1062.51 7.52 17.08"
          />

          {/* Brow arc — rotates around its own midpoint (~575, 225) */}
          <path
            className={styles.browArc}
            d="M476.24,215.84c25.14-23.32,60.06-32.6,93.4-24.82,32.53,7.58,59.46,30.62,72.04,61.62"
            fill="none"
            stroke="#111010"
            strokeWidth="33"
            strokeLinecap="round"
            style={{ transformOrigin: '575px 225px' }}
          />
          {/* Brow tick — rotates around its own midpoint (~833, 183) */}
          <line
            className={styles.browTick}
            x1="752.84" y1="230"
            x2="914.09" y2="135"
            fill="none"
            stroke="#111010"
            strokeWidth="33"
            strokeLinecap="round"
            style={{ transformOrigin: '833px 183px' }}
          />

          {/* Left eye — wrapped in g so transform is independent */}
          <g className={styles.eyeLeft}>
            <circle cx="651.01" cy="351.83" r="46.59" />
          </g>

          {/* Right eye — wrapped in g so transform is independent */}
          <g className={styles.eyeRight}>
            <circle cx="803.71" cy="351.13" r="46.59" />
          </g>

          {/* Mouth — subtle horizontal shift */}
          <path
            className={styles.mouth}
            d="M846.08,623.11h-109.75c-9.1,0-16.48-7.38-16.48-16.48s7.38-16.48,16.48-16.48h109.75c9.1,0,16.48,7.38,16.48,16.48s-7.38,16.48-16.48,16.48Z"
          />
        </svg>

        {/* Label — inside the circle, below the character */}
        <p className={styles.label}>What Problem Are You Trying To Solve?</p>
      </div>
    </div>
  )
}
