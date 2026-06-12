import * as React from 'react';
import { AlertCircle, CheckCircle2, Loader2, MapPin, Search } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { LocationData } from '../types';
import { cn } from '../lib/utils';

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: LocationData | null;
  className?: string;
  autoDetect?: boolean;
}

type GooglePrediction = {
  description: string;
  place_id: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_SCRIPT_ID = 'grassroots-google-places-location-script';

function getGoogleMapsKey(): string {
  return (
    import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    ''
  );
}

function loadGooglePlaces(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('Google Maps API key missing'));
      return;
    }

    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Places failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Places failed to load'));

    document.head.appendChild(script);
  });
}

/**
 * GrassRoots LocationPicker — master safe version
 *
 * Fully automated:
 * 1. Address autocomplete while typing
 * 2. Latitude/longitude lookup after selecting a Google address
 *
 * Disabled:
 * - Auto GPS on page load
 * - Forced map popup
 * - Drag pin map
 * - Geocoding API dependency
 *
 * Safe fallback:
 * - Manual address still works if Google is unavailable
 */
export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  className,
}) => {
  const apiKey = getGoogleMapsKey();

  const [address, setAddress] = React.useState(initialLocation?.address || '');
  const [isConfirmed, setIsConfirmed] = React.useState(!!initialLocation?.verified);
  const [isLoadingGoogle, setIsLoadingGoogle] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [googleReady, setGoogleReady] = React.useState(false);
  const [googleFailed, setGoogleFailed] = React.useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState<string | null>(null);
  const [predictions, setPredictions] = React.useState<GooglePrediction[]>([]);

  const autocompleteServiceRef = React.useRef<any>(null);
  const placesServiceRef = React.useRef<any>(null);
  const hiddenPlacesDivRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (initialLocation?.address) {
      setAddress(initialLocation.address);
      setIsConfirmed(!!initialLocation.verified);
    }
  }, [initialLocation?.address, initialLocation?.verified]);

  React.useEffect(() => {
    let cancelled = false;

    if (!apiKey) {
      setGoogleReady(false);
      setGoogleFailed(true);
      return;
    }

    setIsLoadingGoogle(true);

    loadGooglePlaces(apiKey)
      .then(() => {
        if (cancelled) return;

        if (!window.google?.maps?.places) {
          setGoogleReady(false);
          setGoogleFailed(true);
          return;
        }

        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();

        if (!hiddenPlacesDivRef.current) {
          hiddenPlacesDivRef.current = document.createElement('div');
        }

        placesServiceRef.current = new window.google.maps.places.PlacesService(hiddenPlacesDivRef.current);

        setGoogleReady(true);
        setGoogleFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setGoogleReady(false);
        setGoogleFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGoogle(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  React.useEffect(() => {
    let cancelled = false;
    const cleanAddress = address.trim();

    if (!googleReady || !autocompleteServiceRef.current || cleanAddress.length < 4) {
      setPredictions([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: cleanAddress,
          componentRestrictions: { country: 'au' },
          types: ['address'],
        },
        (results: GooglePrediction[] | null, status: string) => {
          if (cancelled) return;

          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !Array.isArray(results)
          ) {
            setPredictions([]);
            return;
          }

          setPredictions(results.slice(0, 5));
        }
      );
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [address, googleReady]);

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value);
    setSelectedPlaceId(null);
    setIsConfirmed(false);
  };

  const handleSelectPrediction = (prediction: GooglePrediction) => {
    setAddress(prediction.description);
    setSelectedPlaceId(prediction.place_id);
    setPredictions([]);
    setIsConfirmed(false);
  };

  const confirmManualAddress = () => {
    const cleanAddress = address.trim();

    if (!cleanAddress) return;

    const manualLocation: LocationData = {
      latitude: initialLocation?.latitude || 0,
      longitude: initialLocation?.longitude || 0,
      accuracy: 0,
      address: cleanAddress,
      source: 'pin',
      verified: true,
    };

    setIsConfirmed(true);
    onLocationSelect(manualLocation);
  };

  const confirmGoogleAddress = () => {
    const cleanAddress = address.trim();

    if (
      !cleanAddress ||
      !selectedPlaceId ||
      !googleReady ||
      !placesServiceRef.current ||
      !window.google?.maps?.places
    ) {
      confirmManualAddress();
      return;
    }

    setIsConfirming(true);

    placesServiceRef.current.getDetails(
      {
        placeId: selectedPlaceId,
        fields: ['formatted_address', 'geometry'],
      },
      (place: any, status: string) => {
        setIsConfirming(false);

        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !place
        ) {
          confirmManualAddress();
          return;
        }

        const lat = place.geometry?.location?.lat?.() || 0;
        const lng = place.geometry?.location?.lng?.() || 0;
        const formattedAddress = place.formatted_address || cleanAddress;

        const confirmedLocation: LocationData = {
          latitude: lat,
          longitude: lng,
          accuracy: lat && lng ? 10 : 1,
          address: formattedAddress,
          source: 'pin',
          verified: true,
        };

        setAddress(formattedAddress);
        setIsConfirmed(true);
        onLocationSelect(confirmedLocation);
      }
    );
  };

  const handleConfirmLocation = () => {
    if (selectedPlaceId && googleReady) {
      confirmGoogleAddress();
      return;
    }

    confirmManualAddress();
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">
          Property Location
        </label>

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal/35" />

          <Input
            value={address}
            onChange={handleAddressChange}
            placeholder="Start typing the property address..."
            className="pl-10 pr-10 h-14 bg-white border-border rounded-xl shadow-premium focus:ring-secondary/20 text-base font-bold"
          />

          {isLoadingGoogle ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal/30 animate-spin" />
          ) : (
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal/25" />
          )}
        </div>

        {predictions.length > 0 && (
          <div className="rounded-xl border border-border bg-white shadow-lg overflow-hidden">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelectPrediction(prediction)}
                className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-border last:border-b-0 transition-colors"
              >
                <p className="text-sm font-bold text-charcoal leading-snug">
                  {prediction.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {googleReady ? (
          <p className="text-[10px] font-bold text-clay leading-relaxed">
            Address suggestions are active. Select the correct address to automatically save coordinates.
          </p>
        ) : (
          <p className="text-[10px] font-bold text-clay leading-relaxed">
            Manual address entry is active. Address suggestions are unavailable.
          </p>
        )}
      </div>

      <div className="rounded-2xl border-2 border-dashed border-border bg-stone-50 p-6 text-center">
        <MapPin className="w-10 h-10 mx-auto text-charcoal/30 mb-3" />

        <p className="text-xs font-black uppercase tracking-widest text-charcoal">
          {googleReady ? 'Address Lookup Ready' : 'Manual Location Mode'}
        </p>

        <p className="text-[11px] text-clay font-bold leading-relaxed mt-2">
          Type the property address. Select a suggestion when available, then confirm the location.
        </p>

        {googleFailed && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-left">
            <AlertCircle className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
              Google address lookup is unavailable. Manual address entry still works.
            </p>
          </div>
        )}

        {address.trim() && (
          <div className="mt-4 rounded-xl bg-white border border-border p-3 text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-secondary mb-1">
              Address entered
            </p>
            <p className="text-sm font-bold text-charcoal leading-snug">
              {address}
            </p>
            {selectedPlaceId && googleReady && (
              <p className="text-[9px] font-bold text-green-700 mt-2">
                Google address selected. Coordinates will save on confirmation.
              </p>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleConfirmLocation}
        disabled={!address.trim() || isConfirming}
        className={cn(
          'w-full h-12 rounded-full font-black uppercase tracking-[0.2em] text-[10px]',
          isConfirmed
            ? 'bg-primary hover:bg-primary-hover text-white'
            : 'bg-charcoal hover:bg-black text-white'
        )}
      >
        {isConfirming ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving Location
          </>
        ) : isConfirmed ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Location Confirmed
          </>
        ) : (
          <>
            Confirm Location
            <MapPin className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
};