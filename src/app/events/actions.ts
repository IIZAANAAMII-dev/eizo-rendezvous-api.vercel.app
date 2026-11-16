'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase';
import { eventRole } from '@/lib/events-access';
import { bookingStatuses } from '@/lib/rdv';

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
  const back = form.get('event') ? '/events?event='+String(form.get('event')) : '/events?vue=global';
  try {
    const id = z.string().uuid().parse(form.get('id'));
    const status = z.enum(bookingStatuses).parse(form.get('status'));
    const {data,error} = await getSupabaseClient().from('bookings')
      .update({status}).eq('id',id).select('id').single();
    if (error || !data) throw error ?? new Error();
  } catch {
    redirect(back+'&notice=invalide');
  }
  redirect(back+'&notice=enregistre');
}
