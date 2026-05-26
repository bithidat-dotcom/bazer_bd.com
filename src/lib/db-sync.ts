import { supabase } from './supabase';

interface DBReview {
  id: string;
  product_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

// Generate or fetch a unique client device ID to identify unique likes without user login
export function getDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = 'usr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('device_id', id);
  }
  return id;
}

/**
 * Fetch total likes count and whether the current device is among the likers from Supabase.
 * Cascades to localStorage if the table does not exist yet.
 */
export async function getProductLikesState(productId: string): Promise<{ totalLikes: number; userLiked: boolean }> {
  try {
    const deviceId = getDeviceId();
    
    // First, check local favorites state for UI speed
    const localFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const locallyLiked = localFavs.includes(productId);

    // Try fetching from server
    const { data, count, error } = await supabase
      .from('product_likes')
      .select('id, user_ip', { count: 'exact' })
      .eq('product_id', productId);

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, fallback to localStorage
        console.warn('product_likes table does not exist in Supabase yet. Run the SQL script in Supabase dashboard to enable it.');
        return {
          totalLikes: locallyLiked ? 1 : 0,
          userLiked: locallyLiked
        };
      }
      throw error;
    }

    const totalLikes = count || 0;
    const userLiked = data?.some(item => item.user_ip === deviceId) || locallyLiked;

    return { totalLikes, userLiked };
  } catch (err) {
    console.error('Error fetching likes from server:', err);
    // Simple fallback to localStorage if anything goes wrong
    const localFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const locallyLiked = localFavs.includes(productId);
    return {
      totalLikes: locallyLiked ? 1 : 0,
      userLiked: locallyLiked
    };
  }
}

/**
 * Toggles a product like state on the server.
 */
export async function toggleProductLike(productId: string): Promise<{ totalLikes: number; userLiked: boolean }> {
  const deviceId = getDeviceId();
  
  // Update localStorage first
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  let nextLikedState = false;
  let updatedFavs = [];

  if (favs.includes(productId)) {
    updatedFavs = favs.filter((id: string) => id !== productId);
    nextLikedState = false;
  } else {
    updatedFavs = [...favs, productId];
    nextLikedState = true;
  }
  localStorage.setItem('favorites', JSON.stringify(updatedFavs));
  window.dispatchEvent(new Event('favorites-updated'));

  try {
    if (nextLikedState) {
      // Insert on server
      const { error } = await supabase
        .from('product_likes')
        .insert({ product_id: productId, user_ip: deviceId });
        
      if (error && error.code !== '42P01') {
        throw error;
      }
    } else {
      // Delete on server
      const { error } = await supabase
        .from('product_likes')
        .delete()
        .eq('product_id', productId)
        .eq('user_ip', deviceId);

      if (error && error.code !== '42P01') {
        throw error;
      }
    }
    
    // Fetch fresh stats to return
    return await getProductLikesState(productId);
  } catch (err) {
    console.error('Error syncing like with server:', err);
    // Fallback to local count calculation
    return {
      totalLikes: nextLikedState ? 1 : 0,
      userLiked: nextLikedState
    };
  }
}

/**
 * Fetch real customer reviews from Supabase.
 * Falls back to local fallback reviews when table is missing.
 */
export async function getProductReviews(productId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, return localStorage values or fallback defaults
        console.warn('product_reviews table does not exist in Supabase yet.');
        const saved = localStorage.getItem(`reviews-${productId}`);
        if (saved) return JSON.parse(saved);
        return [];
      }
      throw error;
    }

    // Merge Supabase reviews & locally saved offline reviews if they exist
    const savedLocal = JSON.parse(localStorage.getItem(`reviews-${productId}`) || '[]');
    const results = [...(data || [])];
    
    // Filter local reviews to avoid duplicates with downloaded ones
    const localFiltered = savedLocal.filter((localR: any) => 
      !results.some((srvR: any) => srvR.user_name === localR.userName && srvR.comment === localR.comment)
    );

    // Adapt database-snake-case into frontend-camel-case or keep as is
    const formattedSrv = results.map((r: any) => ({
      id: r.id.toString(),
      userName: r.user_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: new Date(r.created_at).toLocaleDateString() || 'Recently'
    }));

    return [...formattedSrv, ...localFiltered];
  } catch (err) {
    console.error('Error getting product reviews:', err);
    const saved = localStorage.getItem(`reviews-${productId}`);
    if (saved) return JSON.parse(saved);
    return [];
  }
}

/**
 * Inserts a verified customer review to Supabase and browser cache.
 */
export async function saveProductReview(productId: string, userName: string, rating: number, comment: string): Promise<any> {
  const localNewReview = {
    id: 'usr-review-' + Date.now(),
    userName,
    rating,
    comment,
    createdAt: 'Just now'
  };

  // Add to local storage for instant render before server gets it or as a fallback
  const savedLocal = JSON.parse(localStorage.getItem(`reviews-${productId}`) || '[]');
  localStorage.setItem(`reviews-${productId}`, JSON.stringify([localNewReview, ...savedLocal]));

  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: productId,
        user_name: userName,
        rating: rating,
        comment: comment
      })
      .select();

    if (error) {
      if (error.code === '42P01') {
        console.warn('product_reviews database table is missing on Supabase. Saving comment locally instead!');
        return localNewReview;
      }
      throw error;
    }

    return data ? data[0] : localNewReview;
  } catch (err) {
    console.error('Failed to insert review in server database:', err);
    return localNewReview;
  }
}
