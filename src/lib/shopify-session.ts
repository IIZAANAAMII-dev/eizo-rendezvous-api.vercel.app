import { getShopifyAccessToken } from './oauth';

export async function getShopFromSession(shop: string): Promise<string> {
  const token = await getShopifyAccessToken(shop);
  if (!token) {
    throw new Error('Shop not authenticated');
  }
  return shop;
}

export async function getShopifyConnectionId(shop: string): Promise<string> {
  const { getSupabaseClient } = await import('./supabase');
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('shopify_connections')
    .select('id')
    .eq('shop_domain', shop)
    .single();
  
  if (error || !data) {
    throw new Error('Shop not found in connections');
  }
  
  return data.id;
}
