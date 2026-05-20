import * as React from 'react';
import { Button } from './ui/Button';
import { X, Delete } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (passcode: string) => void;
  title?: string;
  description?: string;
  error?: string;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Enter Passcode",
  description = "Please enter your 4-6 digit passcode to continue.",
  error
}) => {
  const [passcode, setPasscode] = React.useState('');

  const handleNumberClick = (num: string) => {
    if (passcode.length < 6) {
      const newPasscode = passcode + num;
      setPasscode(newPasscode);
      if (newPasscode.length >= 4 && newPasscode.length <= 6) {
        // We don't auto-submit because it could be 4, 5, or 6 digits
      }
    }
  };

  const handleDelete = () => {
    setPasscode(passcode.slice(0, -1));
  };

  const handleSubmit = () => {
    if (passcode.length >= 4) {
      onSuccess(passcode);
      setPasscode('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          <div className="p-6 text-center space-y-4">
            <div className="flex justify-between items-center">
              <div className="w-8" />
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              {onClose ? (
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              ) : (
                <div className="w-8" />
              )}
            </div>
            
            <p className="text-sm text-gray-500">{description}</p>

            <div className="flex justify-center gap-3 py-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    i < passcode.length
                      ? 'bg-green-600 border-green-600 scale-110'
                      : 'border-gray-300'
                  }`}
                />
              ))}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600 font-medium"
              >
                {error}
              </motion.p>
            )}

            <div className="grid grid-cols-3 gap-4 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num.toString())}
                  className="w-16 h-16 rounded-full bg-gray-50 text-2xl font-semibold text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center border border-gray-100 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPasscode('')}
                className="w-16 h-16 rounded-full bg-red-50 text-[10px] font-bold text-red-600 hover:bg-red-100 active:bg-red-200 transition-colors flex items-center justify-center uppercase tracking-widest border border-red-100 shadow-sm"
                title="Reset"
              >
                Reset
              </button>
              <button
                onClick={() => handleNumberClick('0')}
                className="w-16 h-16 rounded-full bg-gray-50 text-2xl font-semibold text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center border border-gray-100 shadow-sm"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="w-16 h-16 rounded-full bg-gray-50 text-xl font-semibold text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center border border-gray-100 shadow-sm"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>

            <Button
              className="w-full mt-6"
              disabled={passcode.length < 4}
              onClick={handleSubmit}
            >
              Continue
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
