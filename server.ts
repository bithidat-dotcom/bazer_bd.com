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

  // User Signup - Custom Database Auth
  app.post("/api/auth/user/signup", async (req, res) => {
    try {
      const { email, password, username, whatsapp, location, profileImage } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const docId = email.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
      const userAuthRef = doc(db, "users_secure", docId);
      const existing = await getDoc(userAuthRef);
      
      if (existing.exists()) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userData = {
        uid: docId,
        username: username || email.split('@')[0],
        email: email.toLowerCase(),
        whatsapp: whatsapp || "",
        location: location || "",
        profileImage: profileImage || "",
        password: hashedPassword,
        created_at: new Date().toISOString()
      };

      await setDoc(userAuthRef, userData);

      // Also register to register_people for admin views (without password)
      const { password: _, ...publicData } = userData;
      await setDoc(doc(db, "register_people", docId), publicData);

      const token = jwt.sign({ uid: docId, email: userData.email }, JWT_SECRET, { expiresIn: "30d" });
      res.status(201).json({ user: publicData, token });
    } catch (error: any) {
      console.error("User signup error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // User Signin
  app.post("/api/auth/user/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const docId = email.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
      const userRef = doc(db, "users_secure", docId);
      const snap = await getDoc(userRef);
      
      if (!snap.exists()) {
        return res.status(404).json({ error: "Account not found" });
      }

      const userData = snap.data();
      const isMatch = await bcrypt.compare(password, userData.password);
      
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ uid: docId, email: userData.email }, JWT_SECRET, { expiresIn: "30d" });
      
      const { password: _, ...userToSend } = userData;
      res.json({ user: userToSend, token });
    } catch (error: any) {
      console.error("User signin error:", error);
      res.status(500).json({ error: "Authentication failed" });
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
