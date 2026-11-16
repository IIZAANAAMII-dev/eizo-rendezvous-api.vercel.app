'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase';
import { eventRole } from '@/lib/events-access';
import { ingest, slug, statuses, submission } from '@/lib/events';

export async function login(form: FormData) {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const {data,error} = await getSupabaseClient().auth.signInWithPassword({email,password});
  if (error || !data.session || !await eventRole(data.session.access_token)) redirect('/events?notice=connexion');
  (await cookies()).set('eizo-events',data.session.access_token,{
    path:'/events',httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',
    maxAge:Math.min(data.session.expires_in,3600),
  });
  redirect('/events');
}
export async function logout() {
  (await cookies()).set('eizo-events','',{path:'/events',maxAge:0});
  redirect('/events');
}
export async function change(form: FormData) {
  const role = await eventRole((await cookies()).get('eizo-events')?.value);
  if (role !== 'admin') redirect('/events?notice=autorisation');
  const event = slug.safeParse(form.get('event'));
  if (!event.success) redirect('/events?notice=invalide');
  const url = '/events?event=' + event.data;
  let notice = 'enregistre';
  try {
    const db = getSupabaseClient();
    switch (form.get('action')) {
      case 'create': {
        const title = z.string().trim().min(1).max(160).parse(form.get('title'));
        const date = form.get('date') || null;
        const {error} = await db.from('eizo_events').insert({slug:event.data,title,starts_on:date});
        if (error) throw error;
        break;
      }
      case 'update': {
        const id = z.string().uuid().parse(form.get('id'));
        const status = z.enum(statuses).parse(form.get('status'));
        const notes = z.string().max(3000).parse(form.get('notes'));
        const {error} = await db.from('eizo_event_participants').update({status,notes})
          .eq('id',id).eq('event_slug',event.data).select('id').single();
        if (error) throw error;
        break;
      }
      case 'import': {
        const file = form.get('file');
        if (!(file instanceof File) || file.size > 750_000) throw new Error();
        const rows = z.array(submission).min(1).max(1000).parse(JSON.parse((await file.text()).replace(/^\uFEFF/,'')));
        notice = 'import-' + await ingest(event.data, rows);
        break;
      }
      default: throw new Error();
    }
  } catch {
    notice = 'invalide';
  }
  redirect(url + '&notice=' + notice);
}
