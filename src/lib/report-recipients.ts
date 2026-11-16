/** Pendant le développement, seule cette adresse reçoit la synthèse. */
export const DEV_RECIPIENT = 'klegarrec@feeder.fr';

/**
 * Mode « production » uniquement si EIZO_EVENTS_REPORT_MODE=production ET déploiement de
 * production Vercel. Les destinataires sont alors les lignes de eizo_event_access avec
 * weekly_report = true, chacun recevant une synthèse limitée à ses événements.
 * Dans tous les autres cas : mode dev, envoi au seul développeur.
 */
export function reportMode(env: NodeJS.ProcessEnv = process.env) {
  const production = env.EIZO_EVENTS_REPORT_MODE === 'production' && env.VERCEL_ENV === 'production';
  const dev = (env.EIZO_EVENTS_REPORT_DEV_TO || DEV_RECIPIENT).trim().toLowerCase();
  return { production, dev };
}
