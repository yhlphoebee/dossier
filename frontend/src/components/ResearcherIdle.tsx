import styles from './ResearcherIdle.module.css'

export default function ResearcherIdle() {
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
            points="14.88 14.9 389.38 14.9 724.04 532.82 22.85 1058.71 1074.63 1058.71 14.88 14.9"
          />

          {/* Glasses frame — rings + nose bridge + temples all move as one unit */}
          <g className={styles.glassesFrame}>
            {/* Left eye ring */}
            <path d="M445.04,773.4c-87.19,0-158.13-70.94-158.13-158.13s70.94-158.13,158.13-158.13,158.13,70.94,158.13,158.13-70.94,158.13-158.13,158.13ZM445.04,469.02c-80.65,0-146.26,65.61-146.26,146.25s65.61,146.25,146.26,146.25,146.25-65.61,146.25-146.25-65.61-146.25-146.25-146.25Z" />
            {/* Right eye ring */}
            <path d="M795.6,773.4c-87.19,0-158.13-70.94-158.13-158.13s70.94-158.13,158.13-158.13,158.13,70.94,158.13,158.13-70.94,158.13-158.13,158.13ZM795.6,469.02c-80.65,0-146.26,65.61-146.26,146.25s65.61,146.25,146.26,146.25,146.25-65.61,146.25-146.25-65.61-146.25-146.25-146.25Z" />
            {/* Nose bridge connecting the two rings */}
            <rect x="598.17" y="609.33" width="46.17" height="11.88" />
            {/* Left temple — inner <g> preserves the original SVG rotation */}
            <g transform="translate(-404.91 644.87) rotate(-70.35)">
              <rect x="249.12" y="566.82" width="11.88" height="85.77" />
            </g>
            {/* Right temple — inner <g> preserves the original SVG rotation */}
            <g transform="translate(44.83 1249.01) rotate(-70.35)">
              <rect x="902.6" y="549.82" width="11.88" height="85.77" />
            </g>
          </g>

          {/* Left pupil — moves independently inside the left ring */}
          <g className={styles.pupilLeft}>
            <circle cx="478.11" cy="611.98" r="54.96" />
          </g>

          {/* Right pupil — moves independently inside the right ring */}
          <g className={styles.pupilRight}>
            <circle cx="762.8" cy="611.98" r="54.96" />
          </g>

          {/* Mouth — smile path */}
          <path
            className={styles.mouth}
            d="M673.16,887.68c-22.09,0-48.04-3.24-75.05-9.54-40.05-9.34-75.31-23.79-96.74-39.66-7.25-5.37-8.77-15.6-3.4-22.85,5.37-7.25,15.6-8.77,22.85-3.4,17.71,13.11,49.38,25.86,84.71,34.1,35.64,8.31,71,10.85,92.26,6.64,8.84-1.76,17.44,4,19.2,12.85,1.75,8.85-4,17.44-12.85,19.19-9,1.78-19.46,2.66-30.97,2.66Z"
            style={{ transformOrigin: '620px 870px' }}
          />
        </svg>

        {/* Label — inside the circle, below the character */}
        <p className={styles.label}>Let's ground this in evidence</p>
      </div>
    </div>
  )
}
