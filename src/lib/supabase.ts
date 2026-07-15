import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing from environment variables.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export async function syncProductToSupabase(product: any) {
  if (!supabaseUrl || !supabaseAnonKey) return { success: false, error: 'Missing credentials' };
  try {
    const { error } = await supabase
      .from('products')
      .upsert({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description || '',
        category: product.category || '',
        image: product.image || '',
        images: product.images || [],
        stock: product.stock || 0,
        seller: product.seller || '',
        seller_id: product.seller_id || '',
        seller_whatsapp: product.seller_whatsapp || '',
        seller_logo: product.seller_logo || '',
        is_super_sale: product.is_super_sale || false,
        rating: product.rating || 0,
        order_count: product.order_count || 0,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Supabase Sync Error (Product):', err);
    return { success: false, error: err };
  }
}

export async function syncBannerToSupabase(banner: any) {
  try {
    const { error } = await supabase
      .from('banners')
      .upsert({
        id: banner.id || 'main_banner',
        image: banner.image,
        title: banner.title || '',
        link: banner.link || '',
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Supabase Sync Error (Banner):', err);
    return { success: false, error: err };
  }
}

export async function getBackupProducts() {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
    console.warn('Supabase: Invalid or missing credentials. Skipping backup fetch.');
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('Supabase: "products" table not found. Please create it in your Supabase dashboard to enable live backups.');
      } else {
        console.error('Supabase Products Error:', error.message, error.details, error.hint);
      }
      throw error;
    }
    return data;
  } catch (err) {
    // If it's a TypeError (Network error/Failed to fetch), don't spam the console too hard
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      console.warn('Supabase: Network error (Failed to fetch). Project might be paused or endpoint unreachable.');
    } else {
      console.error('Supabase Fetch Error (Products):', err);
    }
    return null;
  }
}

export async function getBackupBanners() {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) return null;
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*');
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('Supabase: "banners" table not found. Please create it in your Supabase dashboard to enable live backups.');
      } else {
        console.error('Supabase Banners Error:', error.message, error.details, error.hint);
      }
      throw error;
    }
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      console.warn('Supabase: Network error (Failed to fetch) for banners.');
    } else {
      console.error('Supabase Fetch Error (Banners):', err);
    }
    return null;
  }
}

export async function checkSupabaseStatus() {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) return false;
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation')) return true;
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
