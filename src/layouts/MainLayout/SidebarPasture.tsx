import styles from './SidebarPasture.module.scss'

/** Detalhe decorativo: bois pastando no rodapé do sidebar. */
export function SidebarPasture() {
  return (
    <div className={styles.pasture} aria-hidden>
      <svg
        className={styles.scene}
        viewBox="0 0 120 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className={styles.ground}
          d="M0 26.5h120"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <g className={styles.grass}>
          <path d="M8 26v-4M10 26v-3M12 26v-5" stroke="currentColor" strokeWidth="0.8" />
          <path d="M52 26v-3M54 26v-5M56 26v-3" stroke="currentColor" strokeWidth="0.8" />
          <path d="M98 26v-4M100 26v-2M102 26v-4" stroke="currentColor" strokeWidth="0.8" />
        </g>

        <g className={styles.cowBack}>
          <ellipse cx="88" cy="21" rx="7" ry="4.5" fill="currentColor" opacity="0.55" />
          <circle cx="94" cy="18.5" r="2.8" fill="currentColor" opacity="0.55" />
          <path
            d="M96.5 17.5c1.2-.4 2.2.2 2.4 1.2"
            stroke="currentColor"
            strokeWidth="0.7"
            opacity="0.55"
          />
          <path
            d="M84 24v2.5M87 24v2.5M91 24v2.5M94 24v2.5"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>

        <g className={styles.cowFront}>
          <ellipse cx="38" cy="20" rx="9" ry="5.5" fill="currentColor" />
          <circle cx="46.5" cy="16.5" r="3.5" fill="currentColor" />
          <g className={styles.cowHead}>
            <path
              d="M49 16c1.5-.6 3 .1 3.2 1.6"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            <circle cx="48.8" cy="15.2" r="0.55" fill="#fff" opacity="0.85" />
          </g>
          <path
            d="M31 25v3M35 25v3M40 25v3M44 25v3"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        <g className={styles.cowMid}>
          <ellipse cx="66" cy="22" rx="6.5" ry="4" fill="currentColor" opacity="0.72" />
          <circle cx="72" cy="19.5" r="2.5" fill="currentColor" opacity="0.72" />
          <path
            d="M62 25v2.5M65 25v2.5M68.5 25v2.5M71.5 25v2.5"
            stroke="currentColor"
            strokeWidth="0.85"
            strokeLinecap="round"
            opacity="0.72"
          />
        </g>
      </svg>
    </div>
  )
}
