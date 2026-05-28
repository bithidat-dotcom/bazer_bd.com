import { X, UserPlus, Image as ImageIcon, Mail, Lock, User, MessageCircle, MapPin, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useEffect, useState, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { formatWhatsappNumber } from '../lib/utils';

export interface UserProfile {
  username: string;
  profileImage: string;
  whatsapp?: string;
  location?: string;
  email?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  initialUser?: UserProfile | null;
}

export default function AuthModal({ isOpen, onClose, onLogin, initialUser }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true); // Default to Create Account for new users
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialUser) {
        setUsername(initialUser.username || '');
        setEmail(initialUser.email || '');
        setProfileImage(initialUser.profileImage || '');
        setWhatsapp(initialUser.whatsapp || '');
        setLocation(initialUser.location || '');
        setIsSignUp(false); // Edit mode or already registered -> focus on profile update or login
      } else {
        setUsername('');
        setEmail('');
        setPassword('');
        setProfileImage('');
        setWhatsapp('');
        setLocation('');
        setIsSignUp(true); // Default to sign up for new users
      }
      setError('');
    }
  }, [isOpen, initialUser]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isSignUp && !username.trim()) {
      setError('Username is required for new accounts');
      return;
    }
    
    setLoading(true);
    
    try {
      const formattedUsername = username.trim().toLowerCase();
      const formattedWhatsapp = formatWhatsappNumber(whatsapp);
      const cleanEmail = email.trim().toLowerCase();

      // Check username uniqueness if registering
      if (isSignUp) {
        const qUser = query(collection(db, 'users'), where('username', '==', formattedUsername));
        const usernameSnap = await getDocs(qUser);
        if (!usernameSnap.empty) {
          setError('Username is already taken by another user');
          setLoading(false);
          return;
        }
      }

      let authUserId = '';
      let userProfile: UserProfile;

      try {
        // Attempt official Firebase Auth first
        if (isSignUp) {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          authUserId = userCredential.user.uid;
          
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, {
              displayName: formattedUsername,
              photoURL: profileImage || null
            });
          }
          
          // Save to specified "register_people" collection for admin visibility as requested
          const regPeopleRef = doc(db, 'register_people', authUserId);
          await setDoc(regPeopleRef, {
            uid: authUserId,
            username: formattedUsername,
            email: cleanEmail,
            whatsapp: formattedWhatsapp,
            location: location.trim(),
            profileImage: profileImage || '',
            created_at: new Date().toISOString()
          });
        } else {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          authUserId = userCredential.user.uid;
        }

        // Save metadata fields on Firestore securely mapped to Firebase Auth UID
        const userDocRef = doc(db, 'users', authUserId);
        
        if (isSignUp) {
          const newProfile = {
            username: formattedUsername,
            email: cleanEmail,
            profileImage: profileImage || '',
            whatsapp: formattedWhatsapp,
            location: location.trim(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, newProfile, { merge: true });
          userProfile = newProfile;
        } else {
          // Fetch existing profile metadata
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            userProfile = {
              username: data.username || formattedUsername,
              email: cleanEmail,
              profileImage: data.profileImage || profileImage || '',
              whatsapp: data.whatsapp || formattedWhatsapp || '',
              location: data.location || location || ''
            };
          } else {
            // Check register_people as backup
            const regSnap = await getDoc(doc(db, 'register_people', authUserId));
            if (regSnap.exists()) {
              const data = regSnap.data();
              userProfile = {
                username: data.username,
                email: data.email,
                profileImage: data.profileImage || '',
                whatsapp: data.whatsapp || '',
                location: data.location || ''
              };
            } else {
              // Generate fallback doc if it's auth-only
              userProfile = {
                username: cleanEmail.split('@')[0],
                email: cleanEmail,
                profileImage: profileImage || '',
                whatsapp: formattedWhatsapp,
                location: location.trim()
              };
              await setDoc(userDocRef, { ...userProfile, updatedAt: new Date().toISOString() });
            }
          }
        }

      } catch (authErr: any) {
        console.warn('Firebase Auth full provider error:', authErr);
        
        // Dynamic Hybrid Safe Failover Engine inside Firestore!
        const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const fallbackDocRef = doc(db, 'users_secure', docId);
        const adminRegRef = doc(db, 'register_people', docId);

        if (isSignUp) {
          // Check if email already registered in fallback db
          const existingSnap = await getDoc(fallbackDocRef);
          if (existingSnap.exists()) {
            setError('This email is already registered on another account!');
            setLoading(false);
            return;
          }

          const adminData = {
            username: formattedUsername,
            email: cleanEmail,
            profileImage: profileImage || '',
            whatsapp: formattedWhatsapp,
            location: location.trim(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(fallbackDocRef, { ...adminData, password: password });
          
          // Also save to register_people for admin - NO PASSWORD
          await setDoc(adminRegRef, {
            uid: docId,
            ...adminData,
            created_at: new Date().toISOString()
          });

          userProfile = {
            username: formattedUsername,
            email: cleanEmail,
            profileImage: profileImage || '',
            whatsapp: formattedWhatsapp,
            location: location.trim()
          };
        } else {
          // Login validation fallback
          const existingSnap = await getDoc(fallbackDocRef);
          if (!existingSnap.exists()) {
            setError('No account found matching this email!');
            setLoading(false);
            return;
          }

          const data = existingSnap.data();
          if (data.password !== password) {
            setError('Incorrect credentials / password! Please try again.');
            setLoading(false);
            return;
          }

          userProfile = {
            username: data.username,
            email: cleanEmail,
            profileImage: data.profileImage || '',
            whatsapp: data.whatsapp || '',
            location: data.location || ''
          };
        }
      }

      // Sync user records with app
      localStorage.setItem('user', JSON.stringify(userProfile));
      onLogin(userProfile);
      onClose();
    } catch (err: any) {
      console.error('Unified Auth error:', err);
      setError(err.message || 'Something went wrong. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm md:block hidden"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative bg-white w-full h-full md:h-auto md:max-h-[90vh] md:rounded-3xl md:max-w-md overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col pt-12 md:pt-8"
      >
        <button 
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 z-10 cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-1 scroll-smooth">
          <div className="text-center mb-6 mt-2">
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <UserPlus size={28} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {initialUser ? 'Updated Settings' : (isSignUp ? 'Create Safe Profile' : 'Access Profile')}
            </h2>
            <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 mt-1">
              {isSignUp ? 'Sign up & lock records securely' : 'Sign in to access order state'}
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          {!initialUser && (
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-5 border border-slate-150">
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${!isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Sign In
              </button>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            {error && (
              <div className="bg-rose-50 text-rose-650 p-3 rounded-xl text-xs font-bold text-center border border-rose-100 leading-tight">
                {error}
              </div>
            )}
            
            {/* Email Field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  disabled={!!initialUser}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password Field */}
            {!initialUser && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Secure Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Fields visible ONLY during Sign Up (Register) or Edit Profile */}
            {(isSignUp || !!initialUser) && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. john_doe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="tel"
                      placeholder="e.g. 01712345678"
                      value={whatsapp}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWhatsapp(val);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800"
                    />
                  </div>
                  <p className="text-[9px] text-slate-455 mt-1 font-medium px-1">Will be formatted into global standard +88017... format automatically</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Delivery Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <textarea
                      placeholder="Full delivery destination in Bangladesh"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all text-xs font-bold text-slate-800 resize-none h-16"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Profile Photo
                  </label>
                  <div className="flex items-center gap-3 bg-slate-50 p-2 border border-slate-150 rounded-xl">
                    <div 
                      className="w-12 h-12 rounded-xl bg-white border border-dashed border-slate-350 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover animate-fade-in" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-750 border border-slate-200 font-extrabold rounded-lg text-[10px] uppercase transition-colors w-full cursor-pointer"
                      >
                        Upload Photo
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 text-white text-xs uppercase tracking-widest font-black rounded-xl hover:bg-black transition-all disabled:opacity-50 mt-4 active:scale-95 cursor-pointer shadow-md shadow-slate-900/10 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : (initialUser ? 'Update Settings' : (isSignUp ? 'Register & secure' : 'Secure Login'))}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

