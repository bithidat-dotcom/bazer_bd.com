import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Home, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Error404PageProps {
  mode?: 'offline' | '404';
  errorMessage?: string | null;
}

export default function Error404Page({ mode = '404', errorMessage }: Error404PageProps) {
  const navigate = useNavigate();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        
        {/* Beautiful Banner Image */}
        <div className="w-full h-48 sm:h-56 relative overflow-hidden bg-slate-900">
          <img 
            src="https://i.pinimg.com/1200x/73/cd/5a/73cd5ad2380a1a131f07f4b49793b111.jpg" 
            alt="Server Down Banner" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Paid License Stamp */}
          <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-md text-white border border-blue-400/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest">Paid License Server</span>
          </div>
          
          {/* Badge indicator */}
          <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
            <p className="text-[10px] font-black uppercase tracking-widest text-white">
              {mode === 'offline' ? 'System Check' : 'Page Error'}
            </p>
          </div>
        </div>

        {/* Brand Logo & Content Area */}
        <div className="px-6 pb-8 pt-10 sm:px-10 relative flex flex-col items-center text-center">
          
          {/* Logo Frame overlapping the banner */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-full p-2.5 shadow-xl border border-slate-100 flex items-center justify-center">
            <img 
              src="https://i.postimg.cc/KvqR53hq/download-(1).png" 
              alt="pbazar Logo" 
              className="w-full h-full object-contain rounded-full bg-white"
            />
          </div>

          {/* Titles & Messages */}
          <div className="space-y-3 mt-4 w-full">
            <div className="flex items-center justify-center gap-2 text-rose-500">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic text-slate-950">
                {mode === 'offline' ? 'Connection Lost' : '404 - Page Lost'}
              </h1>
            </div>
            
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              {mode === 'offline' ? 'Server Temporarily Offline' : 'The page you requested does not exist'}
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left space-y-2 mt-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Error Report Details:</p>
              <p className="text-xs font-bold text-slate-700 leading-relaxed font-mono break-all">
                {errorMessage || (mode === 'offline' 
                  ? 'Firestore connection timed out or database free quota exceeded. Backup servers are initiating synclink.' 
                  : 'Requested path was not matched on pbazar routing rules. State validation failed.')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 w-full mt-8">
            <button
              onClick={handleRetry}
              className="bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              Retry Sync
            </button>
            <button
              onClick={handleGoHome}
              className="bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          </div>

          {/* Support Footer */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-8">
            pbazar &copy; {new Date().getFullYear()} &middot; Secured High Performance Node
          </p>
        </div>

      </div>
    </div>
  );
}
