import { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare } from 'lucide-react';
import { useTenantBranding } from '../../context/TenantBrandingContext';
import { useAuth } from '../../context/AuthContext';
import { getSubdomain } from '../../utils/domain';

export default function PwaInstallPrompt() {
  const { tenantInfo } = useTenantBranding();
  const { isAuth, loading, user } = useAuth();
  const subdomain = getSubdomain();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      if (user?.role === 'provider') {
        manifestLink.href = '/manifest.json?force_groven=true';
      } else {
        manifestLink.href = '/manifest.json';
      }
    }
  }, [user?.role]);

  useEffect(() => {
    if (localStorage.getItem('pwaPromptDismissed') === 'true') {
      return;
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      return;
    }

    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    
    if (isIOSDevice) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwaPromptDismissed', 'true');
    setShowPrompt(false);
  };

  if (loading) return null;
  if (!isAuth || !subdomain) return null;
  if (!showPrompt) return null;

  const isClient = user?.role === 'client';
  
  const appName = isClient ? (tenantInfo?.name || 'Groven') : 'Groven';
  const brandColor = isClient ? (tenantInfo?.accent_color || '#0F6E56') : '#0F6E56';
  const logoUrl = isClient ? tenantInfo?.logo_url : null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="w-10 h-10 object-contain shrink-0" />
          ) : (
            <div 
              className="p-2.5 rounded-xl shrink-0" 
              style={{ backgroundColor: `${brandColor}1A` }}
            >
              <Download className="w-6 h-6" style={{ color: brandColor }} />
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-gray-900">Install {appName} App</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Install our app on your home screen for quick and easy access.
            </p>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-5">
        {isIOS ? (
          <div className="bg-gray-50 rounded-xl p-3.5 text-sm text-gray-600 border border-gray-100 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">1.</span> Tap the <Share className="w-5 h-5 text-blue-500 mx-0.5" /> share button below
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">2.</span> Select <PlusSquare className="w-5 h-5 text-gray-700 mx-0.5" /> <strong>Add to Home Screen</strong>
            </div>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            disabled={!deferredPrompt}
            className="w-full py-2.5 px-4 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            {deferredPrompt ? 'Install App Now' : 'Open browser menu to install'}
          </button>
        )}
      </div>
    </div>
  );
}
