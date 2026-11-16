import { z } from 'zod';

/** Destinataires de la synthèse hebdomadaire une fois passée en production. */
export const TEAM_RECIPIENTS = [
  'ldesnos@feeder.fr', 'sboll@feeder.fr', 'glouis@feeder.fr', 'fred.rol@feeder.fr',
  'eevain@feeder.fr', 'direction@feeder.fr', 'ctissier@feeder.fr', 'klegarrec@feeder.fr',
];
/** Pendant le développement, seule cette adresse reçoit la synthèse. */
export const DEV_RECIPIENT = 'klegarrec@feeder.fr';

function list(value: string | undefined) {
  return [...new Set((value ?? '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean))];
}

/**
 * Mode « production » uniquement si EIZO_EVENTS_REPORT_MODE=production ET déploiement de
 * production Vercel. Dans tous les autres cas : mode dev, envoi au seul développeur.
 */
export function reportRecipients(env: NodeJS.ProcessEnv = process.env) {
  const production = env.EIZO_EVENTS_REPORT_MODE === 'production' && env.VERCEL_ENV === 'production';
  const wanted = production
    ? (list(env.EIZO_EVENTS_REPORT_TO).length ? list(env.EIZO_EVENTS_REPORT_TO) : TEAM_RECIPIENTS)
    : (list(env.EIZO_EVENTS_REPORT_DEV_TO).length ? list(env.EIZO_EVENTS_REPORT_DEV_TO) : [DEV_RECIPIENT]);
  const parsed = z.array(z.string().email()).min(1).max(30).safeParse(wanted);
  return { production, recipients: parsed.success ? parsed.data : null };
}
