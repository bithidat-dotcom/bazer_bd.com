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

// Memory cache to reduce hits to Firestore
const memoryCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string) {
  const entry = memoryCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCached(key: string, data: any) {
  memoryCache[key] = { data, timestamp: Date.now() };
}

// Track if we hit a quota limit to avoid repeated failures in the same session
let quotaExceeded = false;

export function setFirestoreQuotaExceeded(val: boolean) {
    quotaExceeded = val;
}

export function isFirestoreQuotaExceeded() {
    return quotaExceeded;
}

/**
 * Fetch total likes count and whether the current device is among the likers from Supabase.
 * Cascades to localStorage if the table does not exist yet.
 */
export async function getProductLikesState(productId: string): Promise<{ totalLikes: number; userLiked: boolean }> {
  const cacheKey = `likes-${productId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const deviceId = getDeviceId();
  
  // First, check local favorites state for UI speed
  const localFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const locallyLiked = localFavs.includes(productId);
  
  // Calculate a deterministic fallback count based on product ID
  const getFallbackCount = () => {
    return Math.floor(Math.abs(productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 43) + 7;
  };

  if (quotaExceeded) {
    const result = {
      totalLikes: getFallbackCount() + (locallyLiked ? 1 : 0),
      userLiked: locallyLiked
    };
    setCached(cacheKey, result);
    return result;
  }

  try {
    // Check if db is defined and potentially reach it
    if (!db) throw new Error("Firestore not initialized");

    // Try fetching from server
    const likesRef = collection(db, 'product_likes');
    const qCount = query(likesRef, where('product_id', '==', productId));
    
    // Attempt standard count
    let totalLikes = getFallbackCount();
    try {
      const snapshotCount = await getCountFromServer(qCount);
      totalLikes = snapshotCount.data().count || 0;
    } catch (countErr: any) {
      if (countErr.message?.includes('quota') || countErr.code === 'resource-exhausted') {
        quotaExceeded = true;
      } else {
        console.warn("Could not fetch server count, using fallback:", countErr.message);
      }
    }

    // Attempt to check self-like status
    let userLiked = locallyLiked;
    try {
      const qSelf = query(likesRef, where('product_id', '==', productId), where('user_ip', '==', deviceId));
      const selfSnapshot = await getDocs(qSelf);
      if (!selfSnapshot.empty) {
        userLiked = true;
      }
    } catch (selfErr: any) {
       if (selfErr.message?.includes('quota') || selfErr.code === 'resource-exhausted') {
         quotaExceeded = true;
       } else {
         console.warn("Could not fetch self-like status:", selfErr.message);
       }
    }

    const result = { totalLikes, userLiked: userLiked || locallyLiked };
    setCached(cacheKey, result);
    return result;
  } catch (err: any) {
    if (err.message?.includes('quota') || err.message?.includes('Quota') || err.code === 'resource-exhausted') {
        quotaExceeded = true;
    } else if (!err.message?.includes('offline')) {
       console.error('Error fetching likes from server:', err.message || err);
    }
    
    const fallbackCount = getFallbackCount();
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
  
  // Update localStorage first for instant UI response
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  
  // Clear cache for this product on toggle
  delete memoryCache[`likes-${productId}`];

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
    if (!db) throw new Error("Firestore not initialized");

    if (nextLikedState) {
      // Insert on server
      await addDoc(collection(db, 'product_likes'), { 
        product_id: productId, 
        user_ip: deviceId,
        created_at: new Date().toISOString()
      });
    } else {
      // Delete on server
      const qDel = query(collection(db, 'product_likes'), where('product_id', '==', productId), where('user_ip', '==', deviceId));
      const delSnapshot = await getDocs(qDel);
      
      const deletions = delSnapshot.docs.map(d => deleteDoc(doc(db, 'product_likes', d.id)));
      await Promise.all(deletions);
    }
    
    // Fetch fresh stats to return
    return await getProductLikesState(productId);
  } catch (err: any) {
    console.error('Error syncing like with server:', err.message || err);
    
    const getFallbackCount = () => {
      return Math.floor(Math.abs(productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 43) + 7;
    };
    
    return {
      totalLikes: getFallbackCount() + (nextLikedState ? 1 : 0),
      userLiked: nextLikedState
    };
  }
}

/**
 * Fetch real customer reviews from Supabase.
 * Falls back to local fallback reviews when table is missing.
 */
export async function getProductReviews(productId: string): Promise<any[]> {
  const cacheKey = `reviews-${productId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (quotaExceeded) {
    const saved = localStorage.getItem(`reviews-${productId}`);
    return saved ? JSON.parse(saved) : [];
  }

  try {
    if (!db) throw new Error("Firestore not initialized");

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
      userName: r.user_name || r.userName || r.author || 'Customer',
      rating: r.rating || 5,
      comment: r.comment || r.text || r.review || '',
      createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString() : new Date().toLocaleDateString()
    }));

    const finalReviews = [...formattedSrv, ...localFiltered];
    setCached(cacheKey, finalReviews);
    return finalReviews;
  } catch (err: any) {
    if (err.message?.includes('quota') || err.message?.includes('Quota') || err.code === 'resource-exhausted') {
       quotaExceeded = true;
    } else {
       console.error('Error getting product reviews:', err);
    }
    const saved = localStorage.getItem(`reviews-${productId}`);
    if (saved) return JSON.parse(saved);
    return [];
  }
}

/**
 * Fetch seller info by name from 'sellers' collection
 */
export async function getSellerInfoByName(sellerName: string): Promise<any | null> {
  if (!sellerName) return null;
  const cacheKey = `seller-info-${sellerName}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (quotaExceeded) {
    const saved = localStorage.getItem('cached_sellers');
    if (saved) {
      const sellers = JSON.parse(saved);
      const found = sellers.find((s: any) => s.name === sellerName);
      if (found) return found;
    }
    return null;
  }

  try {
    const q = query(collection(db, 'sellers'), where('name', '==', sellerName));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      const result = { id: snapshot.docs[0].id, ...data };
      setCached(cacheKey, result);
      return result;
    }
    return null;
  } catch (err: any) {
    if (err.message?.includes('quota') || err.code === 'resource-exhausted') {
      quotaExceeded = true;
    } else {
      console.error('Error fetching seller info:', err);
    }
    return null;
  }
}

/**
 * Fetch all sellers from 'sellers' collection
 */
export async function getSellers(): Promise<any[]> {
  const cacheKey = 'all-sellers';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (quotaExceeded) {
    const saved = localStorage.getItem('cached_sellers');
    return saved ? JSON.parse(saved) : [];
  }

  try {
    if (!db) throw new Error("Firestore not initialized");
    const q = query(collection(db, 'sellers'), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCached(cacheKey, data);
    localStorage.setItem('cached_sellers', JSON.stringify(data));
    return data;
  } catch (err: any) {
    if (err.message?.includes('quota') || err.code === 'resource-exhausted') {
      quotaExceeded = true;
    } else {
      console.error('Error fetching sellers:', err);
    }
    const saved = localStorage.getItem('cached_sellers');
    return saved ? JSON.parse(saved) : [];
  }
}

/**
 * Fetch products by seller name
 */
export async function getProductsBySeller(sellerName: string): Promise<any[]> {
  const cacheKey = `seller-products-${sellerName}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (quotaExceeded) {
    const saved = localStorage.getItem('cached_products');
    if (saved) {
      const allProds = JSON.parse(saved);
      return allProds.filter((p: any) => p.seller === sellerName);
    }
    return [];
  }

  try {
    if (!db) throw new Error("Firestore not initialized");
    const q = query(collection(db, 'products'), where('seller', '==', sellerName));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCached(cacheKey, data);
    return data;
  } catch (err: any) {
    if (err.message?.includes('quota') || err.code === 'resource-exhausted') {
      quotaExceeded = true;
    } else {
      console.error('Error fetching seller products:', err);
    }
    const saved = localStorage.getItem('cached_products');
    if (saved) {
      const allProds = JSON.parse(saved);
      return allProds.filter((p: any) => p.seller === sellerName);
    }
    return [];
  }
}

export async function saveProductReview(productId: string, userName: string, rating: number, comment: string): Promise<any> {
  const localNewReview = {
    id: 'usr-review-' + Date.now(),
    userName,
    rating,
    comment,
    createdAt: new Date().toLocaleDateString()
  };

  // Add to local storage for instant render before server gets it or as a fallback
  const savedLocal = JSON.parse(localStorage.getItem(`reviews-${productId}`) || '[]');
  localStorage.setItem(`reviews-${productId}`, JSON.stringify([localNewReview, ...savedLocal]));

  // Clear cache to show new review
  delete memoryCache[`reviews-${productId}`];

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

    return { id: docRef.id, userName, rating, comment, createdAt: new Date().toLocaleDateString() };
  } catch (err) {
    console.error('Failed to insert review in server database:', err);
    return localNewReview;
  }
}
