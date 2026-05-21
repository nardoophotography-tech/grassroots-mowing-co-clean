import * as React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../hooks/useFirebase';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Mail, Lock, UserPlus, ShieldCheck, Home, ArrowLeft } from 'lucide-react';
import { GrassRootsLogo } from '../components/GrassRootsLogo';
import { GrassRootsGuardian } from '../components/GrassRootsGuardian';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { PasscodeModal } from '../components/PasscodeModal';
import { UserRole } from '../types';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export const Login = () => {
  const { signIn, signUp, logout, user, profile, setupPasscode, updateProfile } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const intendedRole = searchParams.get('intendedRole') as UserRole | null;
  const redirect = searchParams.get('redirect');

  const [isSignUp, setIsSignUp] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPasscodeSetup, setShowPasscodeSetup] = React.useState(false);
  const [unauthorized, setUnauthorized] = React.useState(false);

  const themeVariants: Record<string, {
    bg: string;
    accent: string;
    hoverAccent: string;
    border: string;
    text: string;
    heading: string;
    subheading: string;
    iconColor: string;
    cardBg?: string;
  }> = {
    admin: {
      bg: 'bg-red-50',
      accent: 'bg-deep-red',
      hoverAccent: 'hover:bg-deep-red/90',
      border: 'border-deep-red',
      text: 'text-deep-red',
      heading: 'Management Console',
      subheading: 'Select your gateway to the GrassRoots system',
      iconColor: 'text-deep-red'
    },
    staff: {
      bg: 'bg-amber-50',
      accent: 'bg-ochre',
      hoverAccent: 'hover:bg-ochre/90',
      border: 'border-ochre',
      text: 'text-ochre',
      heading: 'Staff Portal',
      subheading: `${settings?.serviceLocation || 'Mount Isa'} Region • Workforce Access`,
      iconColor: 'text-ochre'
    },
    client: {
      bg: 'bg-charcoal',
      accent: 'bg-black',
      hoverAccent: 'hover:bg-stone-900',
      border: 'border-stone-800',
      text: 'text-white',
      heading: 'Client Portal',
      subheading: 'Premium Property Owner Access',
      iconColor: 'text-stone-400',
      cardBg: 'bg-stone-900/95'
    },
    default: {
      bg: 'bg-cream',
      accent: 'bg-deep-red',
      hoverAccent: 'hover:bg-deep-red/90',
      border: 'border-deep-red',
      text: 'text-deep-red',
      heading: 'GrassRoots Portal',
      subheading: `${settings?.serviceLocation || 'Mount Isa'} Region • Mowing Co.`,
      iconColor: 'text-ochre'
    }
  };

  const currentTheme =
    (intendedRole && themeVariants[intendedRole as keyof typeof themeVariants]) ||
    themeVariants.default;

  React.useEffect(() => {
    const handleRoleRedirect = async () => {
      if (!user) return;

      if (profile?.setupComplete) {
        if (intendedRole && profile.role !== intendedRole) {
          try {
            await updateProfile({ role: intendedRole });
            toast.success(`Accessing ${intendedRole} portal...`);
          } catch (error) {
            console.error('Failed to switch role:', error);
          }
        }

        navigate('/dashboard');
        return;
      }

      if (!profile && redirect && redirect.includes('/onboarding')) {
        navigate(redirect);
      }
    };

    handleRoleRedirect();
  }, [user, profile, navigate, intendedRole, updateProfile, redirect]);

  React.useEffect(() => {
    if (user && !profile && !isLoading) {
      setUnauthorized(true);
    } else {
      setUnauthorized(false);
    }
  }, [user, profile, isLoading]);

  React.useEffect(() => {
    if (user && profile && !profile.setupComplete) {
      setShowPasscodeSetup(true);
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.toString().trim();
    const cleanPassword = password.toString();
    const cleanDisplayName = displayName.toString().trim();

    if (!cleanEmail || !cleanPassword) {
      toast.error('Directives required: Email and Access Key cannot be empty.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!cleanDisplayName) {
          toast.error('Identity key / name is required for registration.');
          setIsLoading(false);
          return;
        }

        await signUp(cleanEmail, cleanPassword, cleanDisplayName, intendedRole || 'staff');
        toast.success('Access node initialized. Please set up your passcode.');
      } else {
        await signIn(cleanEmail, cleanPassword);
        toast.success('Authentication pattern matched. Welcome back.');
      }
    } catch (error: any) {
      console.error('Authentication Error:', error);

      let message = 'Access Denied: Terminal response error.';

      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        message = 'Authentication failed. Please verify credentials.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network connection lost. Please check your uplink.';
      } else if (error.message) {
        message = error.message;
      }

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasscodeSetup = async (passcode: string) => {
    try {
      await setupPasscode(passcode);
      toast.success('Passcode set up successfully!');
      setShowPasscodeSetup(false);
    } catch (error) {
      toast.error('Failed to set up passcode');
    }
  };

  if (showPasscodeSetup) {
    return (
      <PasscodeModal
        isOpen={true}
        onSuccess={handlePasscodeSetup}
        onClose={() => setShowPasscodeSetup(false)}
        title="Set Up Your Passcode"
        description="Create a 4-6 digit PIN for quick access in the field."
      />
    );
  }

  return (
    <div
      className={`min-h-dvh w-full max-w-[100vw] overflow-x-hidden ${currentTheme.bg} transition-colors duration-500`}
    >
      <div className="relative min-h-dvh w-full max-w-[100vw] overflow-x-hidden flex flex-col items-center justify-start sm:justify-center px-4 py-6 sm:p-6">
        <div className="absolute top-3 left-3 flex gap-2 z-20">
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
            className={`${currentTheme.text} bg-white/70 hover:bg-white h-10 w-10 rounded-full border border-black/10 p-0 flex items-center justify-center shadow-sm`}
            title="Go Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className={`${currentTheme.text} bg-white/70 hover:bg-white h-10 w-10 rounded-full border border-black/10 p-0 flex items-center justify-center shadow-sm`}
            title="Home"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        <div className="absolute inset-0 cultural-pattern opacity-10 pointer-events-none" />

        <div className="hidden lg:flex absolute inset-0 pointer-events-none items-center justify-center opacity-[0.03] grayscale z-0 overflow-hidden">
          <GrassRootsGuardian size={800} />
        </div>

        <div className="hidden sm:block w-full max-w-md mb-6 relative z-10 opacity-80">
          <ImagePlaceholder
            id={8}
            seed={`grassroots-login-${intendedRole || 'default'}`}
            height={120}
            label={currentTheme.heading}
            className={`shadow-lg rounded-2xl border-2 ${currentTheme.border}`}
          />
        </div>

        <div className="w-full max-w-md text-center mb-5 mt-14 sm:mt-0 relative z-10">
          <GrassRootsLogo className="h-14 sm:h-16 w-auto mx-auto mb-3" />

          <h1 className={`text-2xl sm:text-3xl font-serif font-black ${currentTheme.text} uppercase tracking-tighter leading-tight`}>
            {currentTheme.heading}
          </h1>

          <p
            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] ${
              intendedRole === 'client' ? 'text-stone-400' : 'text-ochre'
            }`}
          >
            {currentTheme.subheading}
          </p>
        </div>

        <Card
          className={`w-full max-w-md shadow-2xl border-t-8 ${currentTheme.border} relative z-10 ${
            intendedRole === 'client' ? currentTheme.cardBg : 'bg-white/95 backdrop-blur-sm'
          } rounded-[28px] sm:rounded-[40px] overflow-hidden transition-all border-x border-b border-white/10`}
        >
          <CardHeader className="text-center pt-7 sm:pt-8">
            <CardTitle className={`text-lg sm:text-xl font-serif ${currentTheme.text} flex items-center justify-center gap-2 italic`}>
              Secure Gateway
            </CardTitle>
          </CardHeader>

          <CardContent className="pb-8 sm:pb-10 pt-2">
            {unauthorized ? (
              <div className="space-y-6">
                <div
                  className={`p-6 rounded-[30px] ${
                    intendedRole === 'client'
                      ? 'bg-stone-800 border-stone-700'
                      : 'bg-amber-50 border-amber-200'
                  } border text-center`}
                >
                  <div
                    className={`w-12 h-12 ${
                      intendedRole === 'client' ? 'bg-stone-700' : 'bg-amber-100'
                    } rounded-full flex items-center justify-center mx-auto mb-4`}
                  >
                    <ShieldCheck
                      className={`h-6 w-6 ${
                        intendedRole === 'client' ? 'text-stone-300' : 'text-amber-600'
                      }`}
                    />
                  </div>

                  <h3 className={`font-bold ${intendedRole === 'client' ? 'text-white' : 'text-amber-900'} mb-2`}>
                    Entry Restricted
                  </h3>

                  <p
                    className={`text-xs ${
                      intendedRole === 'client' ? 'text-stone-400' : 'text-amber-800'
                    } leading-relaxed`}
                  >
                    Authentication successful, but you are not registered in the{' '}
                    <strong>{currentTheme.heading}</strong>{' '}
                    {intendedRole === 'client' ? 'service' : 'workforce'} database.
                  </p>

                  <p
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      intendedRole === 'client' ? 'text-stone-500' : 'text-amber-700'
                    } mt-4`}
                  >
                    Please contact regional management for access nodes.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => logout()}
                  className={`w-full ${
                    intendedRole === 'client'
                      ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                      : 'border-charcoal/10 text-charcoal'
                  } font-bold rounded-2xl h-12`}
                >
                  Sign Out & Retry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 px-1 sm:px-2">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="displayName"
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        intendedRole === 'client' ? 'text-stone-500' : 'text-charcoal/60'
                      }`}
                    >
                      Identity Key
                    </Label>

                    <div className="relative">
                      <UserPlus
                        className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${currentTheme.iconColor}`}
                      />

                      <Input
                        id="displayName"
                        placeholder="Full Name"
                        className={`pl-10 h-13 sm:h-14 rounded-2xl ${
                          intendedRole === 'client'
                            ? 'bg-stone-800 border-stone-700 text-white placeholder:text-stone-600'
                            : 'bg-white border-ochre/10'
                        } focus:ring-ochre`}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      intendedRole === 'client' ? 'text-stone-500' : 'text-charcoal/60'
                    }`}
                  >
                    Email Node
                  </Label>

                  <div className="relative">
                    <Mail
                      className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${currentTheme.iconColor}`}
                    />

                    <Input
                      id="email"
                      type="email"
                      placeholder="name@grassroots.com"
                      className={`pl-10 h-13 sm:h-14 rounded-2xl ${
                        intendedRole === 'client'
                          ? 'bg-stone-800 border-stone-700 text-white placeholder:text-stone-600'
                          : 'bg-white border-ochre/10'
                      } focus:ring-ochre`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      intendedRole === 'client' ? 'text-stone-500' : 'text-charcoal/60'
                    }`}
                  >
                    Access Key
                  </Label>

                  <div className="relative">
                    <Lock
                      className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${currentTheme.iconColor}`}
                    />

                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className={`pl-10 h-13 sm:h-14 rounded-2xl ${
                        intendedRole === 'client'
                          ? 'bg-stone-800 border-stone-700 text-white placeholder:text-stone-600'
                          : 'bg-white border-ochre/10'
                      } focus:ring-ochre`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className={`w-full py-6 sm:py-7 text-base sm:text-lg font-bold ${currentTheme.accent} ${currentTheme.hoverAccent} text-white rounded-2xl shadow-xl mt-6 relative overflow-hidden group`}
                  isLoading={isLoading}
                >
                  <span className="relative z-10">
                    {isSignUp ? 'Generate Access' : 'Authenticate Entry'}
                  </span>

                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Button>

                <div className="relative py-5 sm:py-6">
                  <div className="absolute inset-0 flex items-center">
                    <span
                      className={`w-full border-t ${
                        intendedRole === 'client' ? 'border-stone-800' : 'border-ochre/10'
                      }`}
                    />
                  </div>

                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                    <span
                      className={`${
                        intendedRole === 'client'
                          ? 'bg-stone-900 border border-stone-800'
                          : 'bg-white border-ochre/20'
                      } px-4 py-1 rounded-full ${
                        intendedRole === 'client' ? 'text-stone-500' : 'text-ochre'
                      }`}
                    >
                      Secure Logic
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className={`w-full h-13 sm:h-14 rounded-2xl font-bold ${
                    intendedRole === 'client'
                      ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                      : 'border-ochre/20 text-charcoal hover:bg-ochre/5'
                  }`}
                  onClick={() => signIn()}
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    className="w-5 h-5 mr-3"
                    alt="Google"
                  />
                  Company Workspace ID
                </Button>

                <div className="text-center pt-6 sm:pt-8">
                  <button
                    type="button"
                    className={`text-xs ${
                      intendedRole === 'client'
                        ? 'text-stone-400 hover:text-white'
                        : 'text-deep-red hover:underline'
                    } font-bold transition-colors`}
                    onClick={() => setIsSignUp(!isSignUp)}
                  >
                    {isSignUp ? 'Existing Terminal? Sign In' : 'New Node? Initialize Link'}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="hidden sm:grid w-full max-w-md mt-8 sm:mt-10 relative z-10 grid-cols-2 gap-4 pb-10">
          <ImagePlaceholder
            id={9}
            seed={`login-footer-1-${intendedRole}`}
            height={80}
            label="Encrypted Access"
            className="grayscale opacity-50 contrast-125"
          />

          <ImagePlaceholder
            id={10}
            seed={`login-footer-2-${intendedRole}`}
            height={80}
            label="Regional Network"
            className="grayscale opacity-50 contrast-125"
          />
        </div>
      </div>
    </div>
  );
};