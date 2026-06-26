import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection } from "firebase/firestore";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Firebase config for server-side usage
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const JWT_SECRET = process.env.JWT_SECRET || "pbazar-partner-secret-key-2024";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Pbazar Partner Server is live" });
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
      const { orderId, customerName, whatsapp, items, totalAmount } = req.body;
      
      console.log(`[ADMIN NOTIFICATION] New Order #${orderId} from ${customerName} (${whatsapp}) for ${totalAmount} TK`);
      
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
