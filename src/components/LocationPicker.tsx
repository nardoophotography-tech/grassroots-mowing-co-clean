import * as React from 'react';
import { Locate, Search, Loader2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { LocationData } from '../types';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { Mythos } from '../lib/mythos';

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: LocationData | null;
  className?: string;
  autoDetect?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  className
}) => {
  const [address, setAddress] = React.useState(initialLocation?.address || '');
  const [latitude, setLatitude] = React.useState<number | null>(initialLocation?.latitude ?? null);
  const [longitude, setLongitude] = React.useState<number | null>(initialLocation?.longitude ?? null);
  const [accuracy, setAccuracy] = React.useState<number | null>(initialLocation?.accuracy ?? null);
  const [source, setSource] = React.useState<'manual' | 'gps'>(
    initialLocation?.source === 'gps' ? 'gps' : 'manual'
  );

  const [isConfirmed, setIsConfirmed] = React.useState(Boolean(initialLocation?.verified));
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [warning, setWarning] = React.useState<string | null>(null);

  const mountIsaSuggestions = [
    'Mount Isa QLD 4825',
    'Happy Valley QLD 4825',
    'Healy QLD 4825',
    'Winston QLD 4825',
    'Menzies QLD 4825',
    'Parkside QLD 4825',
    'Pioneer QLD 4825',
    'Mornington QLD 4825',
    'Soldiers Hill QLD 4825',
    'Townview QLD 4825',
    'The Gap QLD 4825',
    'Sunset QLD 4825',
    'Miles End QLD 4825',
    'Barkly QLD 4825',
    'Breakaway QLD 4825'
  ];

  const hasGpsPosition = latitude !== null && longitude !== null;

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      const msg = 'GPS is not supported on this device. Please type the address manually.';
      setWarning(msg);
      toast.error(msg);
      return;
    }

    setIsDetecting(true);
    setIsConfirmed(false);
    setWarning(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const gpsAccuracy = position.coords.accuracy;

        setLatitude(lat);
        setLongitude(lng);
        setAccuracy(gpsAccuracy);
        setSource('gps');

        setWarning('GPS location captured. GrassRoots Mowing Co. will verify the location before attending.');
        setIsDetecting(false);

        Mythos.log('GPS_CAPTURED', 'Success', {
          latitude: lat,
          longitude: lng,
          accuracy: gpsAccuracy
        });
      },
      (error) => {
        console.error('GPS failed:', error);
        setIsDetecting(false);
        setSource('manual');

        const msg = 'GPS failed. Please type the property address manually.';
        setWarning(msg);
        toast.error(msg);

        Mythos.error('GPS_FAILED', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const confirmAddress = () => {
    const cleanAddress = address.trim();

    if (!cleanAddress && !hasGpsPosition) {
      toast.error('Please type the property address or use GPS first.');
      return;
    }

    const finalAddress =
      cleanAddress ||
      `GPS Location: ${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`;

    const locationPayload = {
      latitude: source === 'gps' ? latitude : null,
      longitude: source === 'gps' ? longitude : null,
      address: finalAddress,
      accuracy: source === 'gps' ? accuracy : null,
      source,
      placeId: null,
      verified: true
    };

    setIsConfirmed(true);
    onLocationSelect(locationPayload as any);

    toast.success('Location confirmed.');
    Mythos.log('LOCATION_CONFIRMED', 'Success', locationPayload);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">
          Property Address
        </label>

        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30 group-focus-within:text-secondary transition-colors">
            <Search className="w-4 h-4" />
          </div>

          <Input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setIsConfirmed(false);
              setSource(hasGpsPosition ? 'gps' : 'manual');
            }}
            list="mount-isa-location-suggestions"
            placeholder="Start typing property address..."
            className={cn(
              'pl-10 h-14 bg-white border-border rounded-xl shadow-premium focus:ring-secondary/20 text-base font-bold',
              isConfirmed && 'border-green-500 ring-2 ring-green-500/20'
            )}
          />

          <datalist id="mount-isa-location-suggestions">
            {mountIsaSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <p className="text-[10px] font-bold text-clay px-1">
          Type the property address or use GPS. Google Maps lookup is disabled so clients are not blocked.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          type="button"
          onClick={handleUseGps}
          disabled={isDetecting}
          className="h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-primary hover:bg-primary-hover text-white"
        >
          {isDetecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Finding Location
            </>
          ) : (
            <>
              <Locate className="w-4 h-4 mr-2" />
              Use My GPS Location
            </>
          )}
        </Button>

        <Button
          type="button"
          onClick={confirmAddress}
          variant="outline"
          className="h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest border-secondary/30 text-secondary bg-white/90 hover:bg-secondary/10"
        >
          Use Typed Address
        </Button>
      </div>

      <div className="rounded-2xl border-2 border-border bg-white/90 shadow-premium p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              isConfirmed ? 'bg-green-100' : 'bg-secondary/10'
            )}
          >
            {isConfirmed ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <MapPin className="w-6 h-6 text-secondary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-1">
              {isConfirmed ? 'Location Confirmed' : 'Location Confirmation'}
            </p>

            <p
              className={cn(
                'text-sm font-black leading-tight',
                isConfirmed ? 'text-green-700' : 'text-charcoal'
              )}
            >
              {address ||
                (hasGpsPosition
                  ? `GPS Location: ${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`
                  : 'Type address or use GPS')}
            </p>

            {hasGpsPosition && (
              <p className="text-[10px] font-bold text-clay mt-2 leading-relaxed">
                GPS captured: {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
                {accuracy ? ` — accuracy ${Math.round(accuracy)}m` : ''}
              </p>
            )}

            {warning && (
              <p className="text-[10px] font-bold text-orange-700 mt-2 leading-relaxed">
                {warning}
              </p>
            )}

            <p className="text-[10px] font-bold text-clay mt-2 leading-relaxed">
              Admin can verify the final address before attending.
            </p>
          </div>
        </div>

        {!isConfirmed && (
          <Button
            type="button"
            onClick={confirmAddress}
            className="mt-5 h-14 w-full rounded-2xl font-black text-base uppercase tracking-widest shadow-premium bg-charcoal hover:bg-black text-white"
          >
            Confirm Location
          </Button>
        )}

        {isConfirmed && (
          <div className="mt-5 h-12 w-full rounded-2xl bg-green-600 text-white flex items-center justify-center font-black text-[11px] uppercase tracking-widest shadow-premium">
            Location Confirmed
          </div>
        )}
      </div>

      <div className="bg-surface p-4 rounded-xl border border-secondary/20 flex items-start gap-3 shadow-sm">
        <div className="bg-secondary/10 p-2 rounded-lg shrink-0">
          <AlertCircle className="w-4 h-4 text-secondary" />
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-black leading-tight tracking-tight text-secondary uppercase">
            Location Confirmation
          </p>

          <p className="text-[10px] font-bold leading-relaxed text-clay">
            Use GPS when available or type the address manually.
            <span className="text-secondary"> All bookings require a confirmed location.</span>
          </p>
        </div>
      </div>
    </div>
  );
};