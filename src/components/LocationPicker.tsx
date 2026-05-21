import * as React from 'react';
import { Locate, Loader2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
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
  className,
  autoDetect = true
}) => {
  const [latitude, setLatitude] = React.useState<number | null>(initialLocation?.latitude ?? null);
  const [longitude, setLongitude] = React.useState<number | null>(initialLocation?.longitude ?? null);
  const [accuracy, setAccuracy] = React.useState<number | null>(initialLocation?.accuracy ?? null);
  const [isConfirmed, setIsConfirmed] = React.useState(Boolean(initialLocation?.verified));
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [warning, setWarning] = React.useState<string | null>(null);

  const hasGpsPosition = latitude !== null && longitude !== null;

  React.useEffect(() => {
    if (autoDetect && !initialLocation?.verified) {
      handleUseGps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGpsAddressLabel = (lat: number | null, lng: number | null) => {
    if (lat === null || lng === null) return 'GPS location pending';
    return `GPS Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      const msg = 'GPS is not supported on this device. Please call GrassRoots Mowing Co to book.';
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

        if (gpsAccuracy > 100) {
          setWarning('GPS found your location, but accuracy is low. You can still confirm it, and admin can verify before attending.');
        } else {
          setWarning('GPS location captured. Please confirm to continue.');
        }

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

        const msg = 'GPS permission was denied or failed. Please allow location access and try again.';
        setWarning(msg);
        toast.error(msg);

        Mythos.error('GPS_FAILED', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const confirmGpsLocation = () => {
    if (!hasGpsPosition) {
      toast.error('Please click “Use My Current GPS Location” first.');
      return;
    }

    const gpsAddress = getGpsAddressLabel(latitude, longitude);

    const locationPayload = {
      latitude,
      longitude,
      address: gpsAddress,
      accuracy,
      source: 'gps',
      placeId: null,
      verified: true
    };

    setIsConfirmed(true);

    onLocationSelect(locationPayload as any);

    toast.success('GPS location confirmed.');
    Mythos.log('GPS_LOCATION_CONFIRMED', 'Success', locationPayload);
  };

  return (
    <div className={cn('space-y-4', className)}>
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
              {isConfirmed ? 'GPS Location Confirmed' : 'GPS Location Required'}
            </p>

            <p
              className={cn(
                'text-sm font-black leading-tight',
                isConfirmed ? 'text-green-700' : 'text-charcoal'
              )}
            >
              {hasGpsPosition ? getGpsAddressLabel(latitude, longitude) : 'Click the GPS button to capture your current location'}
            </p>

            {hasGpsPosition && (
              <p className="text-[10px] font-bold text-clay mt-2 leading-relaxed">
                Accuracy: {accuracy ? `${Math.round(accuracy)}m` : 'unknown'}
              </p>
            )}

            {warning && (
              <p className="text-[10px] font-bold text-orange-700 mt-2 leading-relaxed">
                {warning}
              </p>
            )}

            <p className="text-[10px] font-bold text-clay mt-2 leading-relaxed">
              This booking uses your current GPS location. Make sure you are at the property or close to the property when booking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 mt-5">
          <Button
            type="button"
            onClick={handleUseGps}
            disabled={isDetecting}
            className="h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-primary hover:bg-primary-hover text-white shadow-premium"
          >
            {isDetecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding GPS Location
              </>
            ) : (
              <>
                <Locate className="w-4 h-4 mr-2" />
                Use My Current GPS Location
              </>
            )}
          </Button>

          {!isConfirmed && hasGpsPosition && (
            <Button
              type="button"
              onClick={confirmGpsLocation}
              className="h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-premium bg-charcoal hover:bg-black text-white"
            >
              Confirm GPS Location
            </Button>
          )}

          {isConfirmed && (
            <div className="h-12 w-full rounded-2xl bg-green-600 text-white flex items-center justify-center font-black text-[11px] uppercase tracking-widest shadow-premium">
              GPS Location Confirmed
            </div>
          )}
        </div>
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
            Location is captured by GPS only. The customer should be at the property when booking.
            <span className="text-secondary"> Admin can verify before attending.</span>
          </p>
        </div>
      </div>
    </div>
  );
};