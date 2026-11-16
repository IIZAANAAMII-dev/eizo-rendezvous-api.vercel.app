'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase';
import { accessFor, canSee, eventAccess, eventRole } from '@/lib/events-access';
import { readPasswordToken } from '@/lib/password-link';
import { formEvents } from '@/lib/registrations';
import { runSynthesis, setReportMode } from '@/lib/synthesis';
import { sendAccessLink } from '@/lib/team';

async function openSession(email: string, password: string) {
  const {data,error} = await getSupabaseClient().auth.signInWithPassword({email,password});
  if (error || !data.session || !await eventRole(data.session.access_token)) return false;
  const jar = await cookies();
  const options = {path:'/events',httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production'};
  jar.set('eizo-events',data.session.access_token,{...options,maxAge:data.session.expires_in});
  // Renouvelé automatiquement par src/middleware.ts : on reste connecté 14 jours.
  jar.set('eizo-events-refresh',data.session.refresh_token,{...options,maxAge:14*86_400});
  return true;
}

export async function login(form: FormData) {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!await openSession(email,password)) redirect('/events?notice=connexion');
  redirect('/events');
}

export async function logout() {
  const jar = await cookies();
  jar.set('eizo-events','',{path:'/events',maxAge:0});
  jar.set('eizo-events-refresh','',{path:'/events',maxAge:0});
  redirect('/events');
}

/** Envoie le lien « choisir mon mot de passe » aux seules personnes autorisées. */
export async function requestPassword(form: FormData) {
  const email = z.string().trim().toLowerCase().email().safeParse(form.get('email'));
  if (email.success) {
    try {
      if (await accessFor(email.data)) await sendAccessLink(email.data,'reset');
    } catch (error) {
      console.error('[events] lien mot de passe non envoyé', error);
    }
  }
  // Même réponse dans tous les cas : on ne révèle pas quelles adresses ont un accès.
  redirect('/events/mot-de-passe?envoye=1');
}

/** Définit le mot de passe à partir d'un lien valide, puis ouvre la session. */
export async function setPassword(form: FormData) {
  const token = String(form.get('t') ?? '');
  const link = readPasswordToken(token);
  if (!link) redirect('/events/mot-de-passe?erreur=lien');
  const password = String(form.get('password') ?? '');
  if (password.length < 10 || password !== String(form.get('confirm') ?? ''))
    redirect('/events/mot-de-passe?erreur=mdp&t='+encodeURIComponent(token));
  if (!await accessFor(link.email)) redirect('/events/mot-de-passe?erreur=lien');

  const client = getSupabaseClient();
  const claim = await client.from('eizo_event_password_links').insert({jti:link.jti,email:link.email});
  if (claim.error) redirect('/events/mot-de-passe?erreur=lien');

  const created = await client.auth.admin.createUser({email:link.email,password,email_confirm:true});
  if (created.error) {
    let id: string | undefined;
    for (let page = 1; !id && page < 20; page++) {
      const {data,error} = await client.auth.admin.listUsers({page,perPage:200});
      if (error || !data.users.length) break;
      id = data.users.find(user=>user.email?.toLowerCase()===link.email)?.id;
    }
    const updated = id ? await client.auth.admin.updateUserById(id,{password,email_confirm:true}) : null;
    if (!updated || updated.error) redirect('/events/mot-de-passe?erreur=compte');
  }
  if (!await openSession(link.email,password)) redirect('/events?notice=connexion');
  redirect('/events');
}

// ——— Administration (rôle admin uniquement) ———

async function admin() {
  const access = await eventAccess((await cookies()).get('eizo-events')?.value);
  if (access?.role !== 'admin') redirect('/events?notice=autorisation');
  return access;
}
function back(form: FormData, notice: string, anchor = '') {
  const event = String(form.get('event') ?? '');
  return (/^[a-z0-9-]+$/.test(event) ? '/events?event='+event : '/events?vue=global')+'&notice='+notice+anchor;
}

/** Envoie immédiatement la synthèse à l'admin connecté (éventuellement vue par une autre personne). */
export async function sendPreview(form: FormData) {
  const access = await admin();
  const viewer = z.string().email().safeParse(form.get('as')).data ?? access.email;
  let notice = 'apercu-erreur';
  try {
    const result = await runSynthesis({cadence:'2jours',test:true,viewer,deliverTo:access.email});
    notice = result.status==='sent' ? 'apercu-envoye' : result.status==='skipped' ? 'apercu-aucun' : 'apercu-erreur';
  } catch (error) { console.error('[events] aperçu', error); }
  redirect(back(form,notice,'#administration'));
}

/** Active ou coupe l'envoi de la synthèse à toute l'équipe. */
export async function changeReportMode(form: FormData) {
  const access = await admin();
  const mode = z.enum(['dev','production']).parse(form.get('mode'));
  if (mode==='production' && form.get('confirm')!=='oui') redirect(back(form,'mode-confirmer','#administration'));
  await setReportMode(mode,access.email);
  redirect(back(form,mode==='production'?'mode-equipe':'mode-test','#administration'));
}

/** Envoie (ou renvoie) l'invitation « choisir mon mot de passe » à une personne autorisée. */
export async function invite(form: FormData) {
  const access = await admin();
  const email = z.string().trim().toLowerCase().email().safeParse(form.get('email'));
  let notice = 'invitation-erreur';
  if (email.success && await accessFor(email.data)) {
    try { await sendAccessLink(email.data,'invite',access.email); notice = 'invitation-envoyee'; }
    catch (error) { console.error('[events] invitation', error); }
  }
  redirect(back(form,notice,'#administration'));
}

const registrationForm = z.object({
  first_name: z.string().trim().max(120), last_name: z.string().trim().max(120),
  company: z.string().trim().max(200), job_title: z.string().trim().max(200),
  phone: z.string().trim().max(40), slot: z.string().trim().max(120), message: z.string().trim().max(4000),
});

/** Complète une inscription existante ou en ajoute une (appel téléphonique, salon…). */
export async function saveRegistration(form: FormData) {
  const access = await admin();
  const fields = registrationForm.safeParse(Object.fromEntries(['first_name','last_name','company','job_title','phone','slot','message'].map(key=>[key,String(form.get(key) ?? '')])));
  if (!fields.success) redirect(back(form,'fiche-erreur','#rendez-vous'));
  const client = getSupabaseClient();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (id.success) {
    const current = await client.from('eizo_event_registrations').select('event_slug').eq('id',id.data).maybeSingle();
    if (!current.data || !canSee(access,{slug:current.data.event_slug})) redirect(back(form,'fiche-erreur','#rendez-vous'));
    const updated = await client.from('eizo_event_registrations').update({...fields.data,updated_at:new Date().toISOString()}).eq('id',id.data);
    redirect(back(form,updated.error?'fiche-erreur':'fiche-enregistree','#rendez-vous'));
  }
  const event = String(form.get('event') ?? '');
  const email = z.string().trim().toLowerCase().email().safeParse(form.get('email'));
  if (!email.success || !formEvents.some(item=>item.slug===event) || !canSee(access,{slug:event})) redirect(back(form,'fiche-erreur','#rendez-vous'));
  const inserted = await client.from('eizo_event_registrations').insert({...fields.data,event_slug:event,email:email.data,consent:true,source:'manuel:'+access.email});
  redirect(back(form,inserted.error?.code==='23505'?'fiche-doublon':inserted.error?'fiche-erreur':'fiche-ajoutee','#rendez-vous'));
}
