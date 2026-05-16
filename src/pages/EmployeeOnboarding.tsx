import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Label } from '@/src/components/ui/Label';
import { UserCircle, ShieldCheck, Key, CheckCircle2, Home, ArrowLeft } from 'lucide-react';
import { GrassRootsLogo } from '@/src/components/GrassRootsLogo';

export const EmployeeOnboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [validToken, setValidToken] = React.useState(false);
  const [onboardingData, setOnboardingData] = React.useState<any>(null);
  
  const [passcode, setPasscode] = React.useState('');
  const [confirmPasscode, setConfirmPasscode] = React.useState('');

  const token = searchParams.get('token');

  React.useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const tokenDoc = await getDoc(doc(db, 'invitations', token));
        if (tokenDoc.exists() && !tokenDoc.data().used && tokenDoc.data().expiresAt > Date.now()) {
          setValidToken(true);
          setOnboardingData(tokenDoc.data());
        }
      } catch (error) {
        console.error('Error verifying token');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passcode !== confirmPasscode) {
      toast.error('Passcodes do not match');
      return;
    }

    if (passcode.length < 4) {
      toast.error('Passcode must be at least 4 digits');
      return;
    }

    if (!user) {
      toast.error('Please sign in with Google first to link your account');
      return;
    }

    try {
      // 1. Create/Update user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: onboardingData.role || 'staff',
        passcode: passcode,
        setupComplete: true,
        lastActive: Date.now(),
        createdAt: Date.now()
      });

      // 2. Create Staff Profile entry for the management list
      await setDoc(doc(db, 'staff_profiles', user.uid), {
        firstName: user.displayName?.split(' ')[0] || 'Staff',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Member',
        email: user.email,
        role: onboardingData.role || 'staff',
        employmentType: 'casual',
        payType: 'hourly',
        status: 'active',
        createdAt: Date.now(),
        onboardingStatus: 'not-sent'
      });

      // 3. Mark token as used
      await updateDoc(doc(db, 'invitations', token!), {
        used: true,
        usedBy: user.uid,
        usedAt: Date.now()
      });

      toast.success('Onboarding complete! Welcome to the team.');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to complete onboarding');
      console.error('Onboarding submission failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-deep-red border-t-transparent" />
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-6">
        <Card className="max-w-md w-full border-deep-red/10 shadow-2xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 bg-deep-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="h-10 w-10 text-deep-red" />
            </div>
            <h2 className="text-2xl font-serif text-charcoal mb-2">Invalid or Expired Link</h2>
            <p className="text-sm text-charcoal/60 mb-8">
              This onboarding link is no longer valid. Please contact your administrator for a new invitation.
            </p>
            <Button onClick={() => navigate('/')} className="w-full bg-charcoal text-white">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-4 left-4 flex gap-2 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="text-ochre hover:bg-ochre/10 h-10 w-10 rounded-full border border-ochre/20 p-0 flex items-center justify-center"
          title="Go Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-ochre hover:bg-ochre/10 h-10 w-10 rounded-full border border-ochre/20 p-0 flex items-center justify-center"
          title="Home"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>
      {/* Background patterns */}
      <div className="fixed inset-0 cultural-pattern opacity-[0.03] pointer-events-none" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <GrassRootsLogo className="h-16 w-auto" />
        </div>
        <h2 className="text-center text-3xl font-serif font-bold tracking-tight text-deep-red">
          Welcome to the Team
        </h2>
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-ochre">
          Workforce Onboarding Portal
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card className="border-ochre/10 shadow-2xl bg-white/90 backdrop-blur-sm rounded-[40px] overflow-hidden">
          <CardHeader className="bg-charcoal text-white text-center py-8">
            <CardTitle className="text-lg font-serif">Employee Setup</CardTitle>
            <p className="text-[10px] text-white/60 uppercase tracking-widest mt-1">Role: {onboardingData.role || 'Staff Member'}</p>
          </CardHeader>
          <CardContent className="p-8">
            {!user ? (
              <div className="text-center space-y-6">
                <div className="p-4 bg-ochre/5 rounded-2xl border border-ochre/10">
                  <p className="text-sm text-charcoal/70 mb-4">
                    To begin, please sign in with your Google account to link it with our business system.
                  </p>
                  <Button 
                    onClick={() => navigate('/login?redirect=/onboarding?token=' + token)}
                    className="w-full bg-deep-red text-white h-12 rounded-xl font-bold"
                  >
                    <UserCircle className="mr-2 h-5 w-5" />
                    Sign In with Google
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCompleteOnboarding} className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border border-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-xs font-bold text-green-800 uppercase tracking-wider">Account Linked</p>
                    <p className="text-sm text-green-700">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="passcode" className="text-[10px] font-black uppercase tracking-widest text-ochre">Create Security Passcode</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
                      <Input 
                        id="passcode"
                        type="password"
                        placeholder="4-6 digits"
                        className="pl-10 h-12 rounded-xl border-ochre/20"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm" className="text-[10px] font-black uppercase tracking-widest text-ochre">Confirm Passcode</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
                      <Input 
                        id="confirm"
                        type="password"
                        placeholder="Repeat passcode"
                        className="pl-10 h-12 rounded-xl border-ochre/20"
                        value={confirmPasscode}
                        onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-deep-red text-white h-14 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-deep-red/20">
                  Complete Setup & Join
                </Button>
                
                <p className="text-[9px] text-charcoal/40 text-center uppercase tracking-tighter leading-tight">
                  By joining, you agree to the GrassRoots Mowing Co. workforce terms and operational guidelines.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
