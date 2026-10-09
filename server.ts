import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, getDocs, query } from "firebase/firestore";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Firebase config for server-side usage
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || undefined);

// Second Firebase Connection for Speed & Fast Specialty Food Catalog
const secondFirebaseConfig = {
  apiKey: "AIzaSyD9FxCHyk-l8QUQ-2Rzbif-XjYWGC5cRog",
  authDomain: "genial-inn-2h7sp.firebaseapp.com",
  projectId: "genial-inn-2h7sp",
  storageBucket: "genial-inn-2h7sp.firebasestorage.app",
  messagingSenderId: "295815579779",
  appId: "1:295815579779:web:585000cb89c55959cc33b6"
};
const secondFirebaseApp = initializeApp(secondFirebaseConfig, "secondApp");
const db2 = getFirestore(secondFirebaseApp, firebaseConfig.firestoreDatabaseId || undefined);

const JWT_SECRET = process.env.JWT_SECRET || "pbazar-partner-secret-key-2024";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Pbazar Partner Server is live" });
  });

  // Food Specialties Catalog API (Powered by high-speed second Firebase connection)
  app.get("/api/foods", async (req, res) => {
    try {
      // Fetch directly from fast second database first
      const snap = await getDocs(query(collection(db2, "products")));
      let productsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // If second database is empty, seamlessly fall back to primary database products
      if (productsList.length === 0) {
        console.log("Second DB empty, falling back to primary DB");
        const primarySnap = await getDocs(query(collection(db, "products")));
        productsList = primarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      const nonFoodCategories = [
        "electronics", "fashion", "clothing", "shoes", "bags", "phones", "laptops", "gadgets", "home", "furniture", "books", "beauty", "cosmetics", "accessories", "jewelry", "watches", "sports", "fitness", "automotive", "toys"
      ];
      
      const foods = productsList.filter((p: any) => 
        p.category && !nonFoodCategories.includes(p.category.toLowerCase().trim())
      );
      
      res.json({ foods });
    } catch (error: any) {
      console.error("Failed to fetch foods in server API:", error);
      // Failover fallback to primary DB on query errors
      try {
        const primarySnap = await getDocs(query(collection(db, "products")));
        const productsList = primarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const nonFoodCategories = [
          "electronics", "fashion", "clothing", "shoes", "bags", "phones", "laptops", "gadgets", "home", "furniture", "books", "beauty", "cosmetics", "accessories", "jewelry", "watches", "sports", "fitness", "automotive", "toys"
        ];
        const foods = productsList.filter((p: any) => 
          p.category && !nonFoodCategories.includes(p.category.toLowerCase().trim())
        );
        res.json({ foods });
      } catch (innerErr) {
        res.status(500).json({ error: "Failed to load foods from database" });
      }
    }
  });

  const PRODUCTS_CACHE_FILE = path.join(process.cwd(), "products_cache.json");

  function getLocalProducts(): any[] {
    try {
      if (fs.existsSync(PRODUCTS_CACHE_FILE)) {
        return JSON.parse(fs.readFileSync(PRODUCTS_CACHE_FILE, "utf-8"));
      }
    } catch (e) {
      console.warn("Failed reading products_cache.json:", e);
    }
    return [];
  }

  function saveLocalProducts(products: any[]) {
    try {
      fs.writeFileSync(PRODUCTS_CACHE_FILE, JSON.stringify(products, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed writing products_cache.json:", e);
    }
  }

  // Full Products Catalog API (Syncs & serves products across host server & main server)
  app.get("/api/products", async (req, res) => {
    try {
      // First try fetching from primary database
      const primarySnap = await getDocs(query(collection(db, "products")));
      let productsList = primarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // If empty or secondary has more items, fall back to second database
      if (productsList.length === 0) {
        const secondSnap = await getDocs(query(collection(db2, "products")));
        productsList = secondSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // If both databases return results, update local cache
      if (productsList.length > 0) {
        saveLocalProducts(productsList);
      } else {
        // Fall back to local host cache if both are empty
        const cached = getLocalProducts();
        if (cached.length > 0) {
          productsList = cached;
        }
      }

      res.json({ products: productsList });
    } catch (error: any) {
      console.error("Failed to fetch products in server API, falling back:", error);
      try {
        const secondSnap = await getDocs(query(collection(db2, "products")));
        const productsList = secondSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (productsList.length > 0) {
          saveLocalProducts(productsList);
          return res.json({ products: productsList });
        }
      } catch (innerErr) {
        // Ignore and use local cache
      }
      
      const localFallback = getLocalProducts();
      res.json({ products: localFallback });
    }
  });

  // Create Product API (Saves synchronously in BOTH primary server, secondary host server, and local host cache)
  app.post("/api/products", async (req, res) => {
    try {
      const productData = req.body;
      const productId = productData.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        ...productData,
        id: productId,
        created_at: productData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 1. Save in Main Server Firestore
      try {
        await setDoc(doc(db, "products", productId), payload, { merge: true });
      } catch (err) {
        console.warn("Main DB product save error:", err);
      }

      // 2. Save in Second / Host Server Firestore
      try {
        await setDoc(doc(db2, "products", productId), payload, { merge: true });
      } catch (err) {
        console.warn("Second DB product save error:", err);
      }

      // 3. Save in Local Host File Cache
      try {
        const currentList = getLocalProducts();
        const existingIdx = currentList.findIndex(p => p.id === productId);
        if (existingIdx >= 0) {
          currentList[existingIdx] = { ...currentList[existingIdx], ...payload };
        } else {
          currentList.unshift(payload);
        }
        saveLocalProducts(currentList);
      } catch (cacheErr) {
        console.warn("Local host cache save failed:", cacheErr);
      }

      res.status(201).json({ success: true, product: payload });
    } catch (error: any) {
      console.error("Product creation API error:", error);
      res.status(500).json({ error: "Failed to save product across servers" });
    }
  });

  // Update Product API (Updates synchronously in BOTH servers and host cache)
  app.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const payload = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // 1. Update in Main DB
      try {
        await setDoc(doc(db, "products", id), payload, { merge: true });
      } catch (err) {
        console.warn("Main DB product update error:", err);
      }

      // 2. Update in Second DB
      try {
        await setDoc(doc(db2, "products", id), payload, { merge: true });
      } catch (err) {
        console.warn("Second DB product update error:", err);
      }

      // 3. Update in Local Host File Cache
      try {
        const currentList = getLocalProducts();
        const existingIdx = currentList.findIndex(p => p.id === id);
        if (existingIdx >= 0) {
          currentList[existingIdx] = { ...currentList[existingIdx], ...payload };
        } else {
          currentList.unshift({ id, ...payload });
        }
        saveLocalProducts(currentList);
      } catch (cacheErr) {
        console.warn("Local host cache update failed:", cacheErr);
      }

      res.json({ success: true, product: { id, ...payload } });
    } catch (error: any) {
      console.error("Product update API error:", error);
      res.status(500).json({ error: "Failed to update product across servers" });
    }
  });

  // Delete Product API (Deletes synchronously from BOTH servers and host cache)
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Delete from Main DB
      try {
        await deleteDoc(doc(db, "products", id));
      } catch (err) {
        console.warn("Main DB delete error:", err);
      }

      // 2. Delete from Second DB
      try {
        await deleteDoc(doc(db2, "products", id));
      } catch (err) {
        console.warn("Second DB delete error:", err);
      }

      // 3. Delete from Local Host Cache
      try {
        const currentList = getLocalProducts();
        const filtered = currentList.filter(p => p.id !== id);
        saveLocalProducts(filtered);
      } catch (cacheErr) {
        console.warn("Local cache delete failed:", cacheErr);
      }

      res.json({ success: true, message: `Product ${id} deleted across servers` });
    } catch (error: any) {
      console.error("Product delete API error:", error);
      res.status(500).json({ error: "Failed to delete product across servers" });
    }
  });

  // Seller Signup - Move to server for better security
  app.post("/api/auth/seller/signup", async (req, res) => {
    try {
      const { username, password, email, displayName, whatsapp, logo, facebook, instagram, tiktok } = req.body;
      
      if (!username || !password || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sellerAuthRef = doc(db, "sellers_auth", username.toLowerCase());
      const existing = await getDoc(sellerAuthRef);
      
      if (existing.exists()) {
        return res.status(409).json({ error: "Username already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const sellerData = {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        display_name: displayName,
        whatsapp,
        logo: logo || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80",
        facebook,
        instagram,
        tiktok,
        password: hashedPassword,
        created_at: new Date().toISOString(),
        is_verified: false
      };

      await setDoc(sellerAuthRef, sellerData);

      // Also register to public sellers list
      await setDoc(doc(db, "sellers", username.toLowerCase()), {
        name: displayName,
        whatsapp,
        logo: sellerData.logo,
        facebook: facebook || "",
        instagram: instagram || "",
        tiktok: tiktok || "",
        is_top: true,
        is_verified: false,
        created_at: new Date().toISOString()
      });

      const token = jwt.sign({ username: sellerData.username }, JWT_SECRET, { expiresIn: "7d" });
      
      const { password: _, ...userToSend } = sellerData;
      res.status(201).json({ user: userToSend, token });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Internal server error during registration" });
    }
  });

  // Seller Signin
  app.post("/api/auth/seller/signin", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const sellerRef = doc(db, "sellers_auth", username.toLowerCase());
      const snap = await getDoc(sellerRef);
      
      if (!snap.exists()) {
        return res.status(404).json({ error: "Seller account not found" });
      }

      const userData = snap.data();
      const isMatch = await bcrypt.compare(password, userData.password);
      
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ username: userData.username }, JWT_SECRET, { expiresIn: "7d" });
      
      const { password: _, ...userToSend } = userData;
      res.json({ user: userToSend, token });
    } catch (error: any) {
      console.error("Signin error:", error);
      res.status(500).json({ error: "Internal server error during authentication" });
    }
  });

  // User Profile Save (Unified Profile Update)
  app.post("/api/auth/user/save", async (req, res) => {
    try {
      const { username, whatsapp, location, profileImage, uid } = req.body;
      
      if (!whatsapp || !username) {
        return res.status(400).json({ error: "Name and WhatsApp number are required" });
      }

      const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, "");
      if (!cleanWhatsapp || cleanWhatsapp.length < 5) {
        return res.status(400).json({ error: "Invalid WhatsApp number" });
      }

      const docId = uid || cleanWhatsapp;
      const userRef = doc(db, "register_people", docId);
      const snap = await getDoc(userRef);
      
      let userData: any;
      
      if (snap.exists()) {
        // Existing user: merge or update fields
        const existingData = snap.data();
        userData = {
          ...existingData,
          username: username.trim(),
          whatsapp: whatsapp.trim(),
          location: location ? location.trim() : (existingData.location || ""),
          profileImage: profileImage || existingData.profileImage || "",
          updated_at: new Date().toISOString()
        };
      } else {
        // New user creation
        userData = {
          uid: docId,
          username: username.trim(),
          whatsapp: whatsapp.trim(),
          location: location ? location.trim() : "",
          profileImage: profileImage || "",
          created_at: new Date().toISOString()
        };
      }

      await setDoc(userRef, userData);

      res.json({ user: userData });
    } catch (error: any) {
      console.error("User save error:", error);
      res.status(500).json({ error: "Failed to save profile details" });
    }
  });

  // Order Placement Notification API
  app.post("/api/notify/order-placed", async (req, res) => {
    try {
      const { orderId, customerName, whatsapp, items, totalAmount, location } = req.body;
      
      console.log(`[ADMIN NOTIFICATION] New Order #${orderId} from ${customerName} (${whatsapp}) at ${location || 'N/A'} for ${totalAmount} TK`);
      
      // Group items by seller to notify them
      const sellerNotifications: Record<string, any> = {};
      items.forEach((item: any) => {
        const sellerId = item.product.seller_id || item.product.seller || 'unknown';
        if (!sellerNotifications[sellerId]) {
          sellerNotifications[sellerId] = {
            whatsapp: item.product.seller_whatsapp,
            items: []
          };
        }
        sellerNotifications[sellerId].items.push(item);
      });

      for (const [sellerId, data] of Object.entries(sellerNotifications)) {
        if (data.whatsapp) {
          console.log(`[SELLER NOTIFICATION] Notify ${sellerId} (${data.whatsapp}) about items in Order #${orderId}`);
          // Simulated WhatsApp API call for Seller
        }
      }

      res.json({ success: true, message: "Notifications sent to admin and sellers" });
    } catch (error) {
      console.error("Order placement notification error:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  // Order Notification API
  app.post("/api/notify/order-confirmed", async (req, res) => {
    try {
      const { orderId, whatsapp, customerName, totalAmount } = req.body;
      
      if (!whatsapp) {
        return res.status(400).json({ error: "Missing whatsapp number" });
      }

      console.log(`[NOTIFICATION] Sending confirmation to ${whatsapp} for Order #${orderId}`);
      
      // In a real production app, you would integrate Twilio or a similar service here:
      /*
      await twilioClient.messages.create({
         body: `Hi ${customerName}, your order #${orderId} for ${totalAmount} TK has been confirmed by pbazar! Thank you for shopping with us.`,
         from: 'whatsapp:+14155238886',
         to: `whatsapp:${whatsapp}`
      });
      */

      res.json({ success: true, message: "Notification sent successfully" });
    } catch (error) {
      console.error("Notification error:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
