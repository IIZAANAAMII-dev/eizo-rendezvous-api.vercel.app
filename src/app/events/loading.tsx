import styles from './events.module.css';

/** Affiché par Next.js pendant que le serveur prépare la page (connexion, onglets, filtres). */
export default function Loading() {
  return <div className={styles.shell}>
    <div className={styles.loading} role="status" aria-live="polite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/EIZO-Logo_RGB.avif" alt="" width="180" height="72" />
      <span className={styles.loadingBar}><i /></span>
      <p>Chargement des rendez-vous…</p>
      <div className={styles.skeleton} aria-hidden="true">
        <span className={styles.skelTitle} />
        <span className={styles.skelRow} />
        <div><span /><span /><span /><span /></div>
      </div>
    </div>
  </div>;
}
