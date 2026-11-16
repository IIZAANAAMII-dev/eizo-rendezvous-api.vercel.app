import { getSupabaseClient } from './supabase';
import { ORIGIN, reportSender } from './synthesis';
import { sendEventsReport } from './email';
import { createPasswordToken } from './password-link';
import type { Access } from './events-access';

export type Member = Access & { account: boolean; lastSignIn: string | null };

/** Équipe autorisée (eizo_event_access) avec l'état de son compte de connexion. */
export async function team(): Promise<Member[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('eizo_event_access').select('email,role,events,weekly_report').order('role').order('email');
  if (error) throw error;
  const users = new Map<string, string | null>();
  for (let page = 1; page < 20; page++) {
    const { data: list, error: listError } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (listError || !list.users.length) break;
    for (const user of list.users) if (user.email) users.set(user.email.toLowerCase(), user.last_sign_in_at ?? null);
    if (list.users.length < 200) break;
  }
  return (data as { email: string; role: 'admin'|'reader'; events: string[]; weekly_report: boolean }[]).map(row => ({
    email: row.email, role: row.role, weeklyReport: row.weekly_report,
    events: row.events.includes('*') ? '*' : row.events,
    account: users.has(row.email), lastSignIn: users.get(row.email) ?? null,
  }));
}

const escape = (value: string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

/** E-mail avec un lien signé (30 min, usage unique) pour choisir son mot de passe. */
export async function sendAccessLink(email: string, kind: 'invite' | 'reset', invitedBy?: string) {
  const sender = reportSender();
  if (!sender) throw new Error('Expéditeur non configuré');
  const link = new URL('/events/mot-de-passe', ORIGIN);
  const invite = kind === 'invite';
  link.searchParams.set('t', createPasswordToken(email, invite ? 7*86_400_000 : 30*60_000));
  const title = invite ? 'Votre accès au suivi des Rencontres EIZO' : 'Choisissez votre mot de passe';
  const intro = invite
    ? `${invitedBy ? escape(invitedBy) + ' vous donne' : 'Vous avez'} accès au back-office des rendez-vous EIZO : inscriptions, fiches détaillées, statistiques et exports. Choisissez votre mot de passe pour vous connecter.`
    : 'Ce lien vous permet de définir votre mot de passe pour le back-office des rendez-vous EIZO.';
  await sendEventsReport([email], {
    subject: 'EIZO Events · ' + title,
    html: `<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;background:#f4faff;font-family:Arial,sans-serif;color:#072446"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #d3e3ef;border-radius:14px"><tr><td style="padding:32px">
<p style="margin:0;color:#0877e6;font:bold 10px Arial;letter-spacing:3px">EIZO FRANCE / EVENTS</p>
<h1 style="margin:14px 0 10px;font:800 26px/1.15 Arial;letter-spacing:-1px;color:#071c35">${title}<span style="color:#0877e6">.</span></h1>
<p style="margin:0 0 22px;color:#567895;font-size:14px;line-height:1.6">${intro} Le lien est valable ${invite ? '7 jours' : '30 minutes'} et ne fonctionne qu’une fois ; vous pourrez en redemander un depuis la page de connexion (« Première connexion ou mot de passe oublié ? »).</p>
<a href="${escape(link.href)}" style="display:inline-block;padding:14px 22px;background:#0877e6;color:#fff;font:bold 13px Arial;text-decoration:none;border-radius:999px">Choisir mon mot de passe ↗</a>
<p style="margin:22px 0 0;color:#9ab0c3;font-size:12px">Adresse du back-office : ${escape(new URL('/events', ORIGIN).href)}</p>
</td></tr></table></td></tr></table></body></html>`,
  }, sender);
}
