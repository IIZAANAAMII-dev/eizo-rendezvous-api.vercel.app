import { getSupabaseClient } from './supabase';

export async function eventRole(token: string | undefined) {
  if (!token || !process.env.EIZO_EVENTS_USERS) return null;
  const { data, error } = await getSupabaseClient().auth.getUser(token);
  if (error || !data.user?.email_confirmed_at) return null;
  const account = data.user.email?.toLowerCase();
  for (const entry of process.env.EIZO_EVENTS_USERS.split(',')) {
    const [email, role] = entry.trim().split('=');
    if (email.toLowerCase() === account && (role === 'admin' || role === 'reader')) return role;
  }
  return null;
}
