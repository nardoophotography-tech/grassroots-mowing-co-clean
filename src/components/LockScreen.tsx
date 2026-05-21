import * as React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PasscodeModal } from './PasscodeModal';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Fingerprint, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { toast } from 'react-hot-toast';
import AppLogo from './AppLogo';

export const LockScreen: React.FC = () => {
  const { isLocked, unlock, logout, profile } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState('');
  const [showPasscode, setShowPasscode] = React.useState(false);

  const handleUnlock = async (passcode: string) => {
    const success = await unlock(passcode);
    if (success) {
      setError('');
      setShowPasscode(false);
      toast.success('Welcome back!');
    } else {
      setError('Incorrect passcode. Please try again.');
    }
  };

  const handleBiometric = async () => {
    // Placeholder for biometric unlock
    toast.error('Biometric unlock not configured for this device.');
  };

  if (!isLocked) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-deep-red/95 backdrop-blur-md p-6 text-white"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm text-center space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
            <div
              role="link"
              title="Visit website"
              onClick={() => navigate('/')}
              className="cursor-pointer"
            >
              <img
                src="/logo-header.webp"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.src = '/logo.png'; }}
                alt="GrassRoots Mowing Co"
                className="h-24 sm:h-32 w-auto object-contain mb-2"
              />
            </div>
            <p className="text-[11px] text-white/70">Tap logo to visit website</p>

            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
              <Lock className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold">App Locked</h1>
              <p className="text-white/70 text-sm">
                Welcome back, {profile?.displayName || 'User'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Button 
              variant="outline" 
              className="w-full h-14 bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold"
              onClick={() => {
                setError('');
                setShowPasscode(true);
              }}
            >
              OPEN APP
            </Button>
            
            {(profile as any)?.passkeyEnabled && (
              <Button 
                variant="outline" 
                className="w-full h-14 bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold"
                onClick={handleBiometric}
              >
                <Fingerprint className="mr-2 h-5 w-5" />
                Use Biometrics
              </Button>
            )}

            <Button 
              variant="ghost" 
              className="w-full text-white/50 hover:text-white hover:bg-white/5 font-bold"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out / Switch Account
            </Button>
          </div>
        </motion.div>

        <PasscodeModal
          isOpen={showPasscode}
          onClose={() => setShowPasscode(false)}
          onSuccess={handleUnlock}
          error={error}
          title="Unlock App"
          description="Enter your passcode to continue your session."
        />
      </motion.div>
    </AnimatePresence>
  );
};
