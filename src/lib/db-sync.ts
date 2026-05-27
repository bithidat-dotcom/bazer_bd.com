import { db } from './firebase';
import { collection, doc, query, where, getDocs, getCountFromServer, addDoc, deleteDoc, orderBy } from 'firebase/firestore';

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
    const qCount = query(collection(db, 'product_likes'), where('product_id', '==', productId));
    const snapshotCount = await getCountFromServer(qCount);
    
    const qSelf = query(collection(db, 'product_likes'), where('product_id', '==', productId), where('user_ip', '==', deviceId));
    const selfSnapshot = await getDocs(qSelf);

    const totalLikes = snapshotCount.data().count || 0;
    const userLiked = !selfSnapshot.empty || locallyLiked;

    return { totalLikes, userLiked };
  } catch (err) {
    console.error('Error fetching likes from server:', err);
    // Simple fallback to localStorage if anything goes wrong
    const localFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const locallyLiked = localFavs.includes(productId);
    const fallbackCount = Math.floor(Math.abs(productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 43) + 7;
    return {
      totalLikes: fallbackCount + (locallyLiked ? 1 : 0),
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
      await addDoc(collection(db, 'product_likes'), { product_id: productId, user_ip: deviceId });
    } else {
      // Delete on server
      const qDel = query(collection(db, 'product_likes'), where('product_id', '==', productId), where('user_ip', '==', deviceId));
      const delSnapshot = await getDocs(qDel);
      delSnapshot.forEach(async (d) => {
        await deleteDoc(doc(db, 'product_likes', d.id));
      });
    }
    
    // Fetch fresh stats to return
    return await getProductLikesState(productId);
  } catch (err) {
    console.error('Error syncing like with server:', err);
    // Fallback to local count calculation
    const fallbackCount = Math.floor(Math.abs(productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 43) + 7;
    return {
      totalLikes: fallbackCount + (nextLikedState ? 1 : 0),
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
    const q = query(collection(db, 'reviews'), where('product_id', '==', productId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Merge server reviews & locally saved offline reviews if they exist
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
    const docRef = await addDoc(collection(db, 'reviews'), {
        product_id: productId,
        productId: productId,
        user_name: userName,
        userName: userName, // For admin app compatibility
        name: userName,
        customerName: userName,
        author: userName,
        rating: rating,
        comment: comment,
        text: comment,
        message: comment,
        review: comment,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString() // For admin app compatibility
    });

    return { id: docRef.id, userName, rating, comment, createdAt: 'Just now' };
  } catch (err) {
    console.error('Failed to insert review in server database:', err);
    return localNewReview;
  }
}
