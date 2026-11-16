'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase';
import { accessFor, eventRole } from '@/lib/events-access';
import { eventsReportSender, sendEventsReport } from '@/lib/email';
import { createPasswordToken, readPasswordToken } from '@/lib/password-link';

const ORIGIN = process.env.EIZO_EVENTS_REPORT_ORIGIN || 'https://eizo-rendezvous-api-vercel-app.vercel.app';

async function openSession(email: string, password: string) {
  const {data,error} = await getSupabaseClient().auth.signInWithPassword({email,password});
  if (error || !data.session || !await eventRole(data.session.access_token)) return false;
  (await cookies()).set('eizo-events',data.session.access_token,{
    path:'/events',httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',
    maxAge:Math.min(data.session.expires_in,3600),
  });
  return true;
}

export async function login(form: FormData) {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!await openSession(email,password)) redirect('/events?notice=connexion');
  redirect('/events');
}

export async function logout() {
  (await cookies()).set('eizo-events','',{path:'/events',maxAge:0});
  redirect('/events');
}

/** Envoie le lien « choisir mon mot de passe » aux seules personnes autorisées. */
export async function requestPassword(form: FormData) {
  const email = z.string().trim().toLowerCase().email().safeParse(form.get('email'));
  if (email.success) {
    try {
      const access = await accessFor(email.data);
      const sender = eventsReportSender(process.env.EIZO_EVENTS_REPORT_FROM)
        ?? eventsReportSender(process.env.SMTP_USER) ?? eventsReportSender(process.env.EMAIL_FROM);
      if (access && sender) {
        const link = new URL('/events/mot-de-passe',ORIGIN);
        link.searchParams.set('t',createPasswordToken(email.data));
        const href = link.href.replaceAll('&','&amp;').replaceAll('"','&quot;');
        await sendEventsReport([email.data],{
          subject:'EIZO Events · Choisissez votre mot de passe',
          html:`<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;background:#f4faff;font-family:Arial,sans-serif;color:#072446"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #d3e3ef;border-radius:14px"><tr><td style="padding:32px">
<p style="margin:0;color:#0877e6;font:bold 10px Arial;letter-spacing:3px">EIZO FRANCE / EVENTS</p>
<h1 style="margin:14px 0 10px;font:800 26px/1.15 Arial;letter-spacing:-1px;color:#071c35">Choisissez votre mot de passe<span style="color:#0877e6">.</span></h1>
<p style="margin:0 0 22px;color:#567895;font-size:14px;line-height:1.6">Ce lien vous permet de définir votre mot de passe pour le back-office des rendez-vous EIZO. Il est valable 30 minutes et ne fonctionne qu’une fois.</p>
<a href="${href}" style="display:inline-block;padding:14px 22px;background:#0877e6;color:#fff;font:bold 13px Arial;text-decoration:none;border-radius:999px">Choisir mon mot de passe ↗</a>
<p style="margin:22px 0 0;color:#9ab0c3;font-size:12px">Vous n’êtes pas à l’origine de cette demande ? Ignorez simplement cet e-mail.</p>
</td></tr></table></td></tr></table></body></html>`,
        },sender);
      }
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
