import * as React from 'react';
import { 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap, 
  useMapsLibrary, 
  ControlPosition, 
  MapControl,
  useApiIsLoaded
} from '@vis.gl/react-google-maps';
import { Locate, Search, Loader2, MapPin, Navigation, AlertCircle, Info } from 'lucide-react';
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
  className,
  autoDetect = true
}) => {
  const apiIsLoaded = useApiIsLoaded();
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  
  const [center, setCenter] = React.useState<google.maps.LatLngLiteral>(
    initialLocation 
      ? { lat: initialLocation.latitude, lng: initialLocation.longitude } 
      : { lat: -27.4698, lng: 153.0251 }
  );
  const [markerPos, setMarkerPos] = React.useState<google.maps.LatLngLiteral>(center);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [address, setAddress] = React.useState(initialLocation?.address || '');
  const [accuracy, setAccuracy] = React.useState<number | null>(initialLocation?.accuracy || null);
  const [source, setSource] = React.useState<'gps' | 'places' | 'pin'>(initialLocation?.source || 'pin');
  const [placeId, setPlaceId] = React.useState(initialLocation?.placeId || '');
  
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [placesError, setPlacesError] = React.useState<string | null>(null);
  const [isLowAccuracy, setIsLowAccuracy] = React.useState(false);
  const [isConfirmed, setIsConfirmed] = React.useState(false);
  
  const autocompleteInputRef = React.useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);

  React.useEffect(() => {
    if (initialLocation && initialLocation.latitude && initialLocation.longitude) {
      const pos = { lat: initialLocation.latitude, lng: initialLocation.longitude };
      setCenter(pos);
      setMarkerPos(pos);
      setAddress(initialLocation.address);
      setSearchQuery(initialLocation.address);
      setAccuracy(initialLocation.accuracy);
      setSource(initialLocation.source);
      map?.panTo(pos);
    }
  }, [initialLocation, map]);

  React.useEffect(() => {
    if (!apiIsLoaded || !geocodingLib || initialLocation) return;
    if (autoDetect) {
       handleDetectLocation();
    }
  }, [apiIsLoaded, geocodingLib]);

  React.useEffect(() => {
    if (!placesLib || !autocompleteInputRef.current) return;

    try {
      const options = {
        fields: ['formatted_address', 'geometry', 'place_id'],
        componentRestrictions: { country: 'au' },
        types: ['address']
      };

      const ac = new placesLib.Autocomplete(autocompleteInputRef.current, options);
      
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const newPos = { lat, lng };
          
          setCenter(newPos);
          setMarkerPos(newPos);
          const formattedAddress = place.formatted_address || '';
          const pid = place.place_id || '';
          setAddress(formattedAddress);
          setSearchQuery(formattedAddress);
          setPlaceId(pid);
          setAccuracy(1); 
          setSource('places');
          setIsLowAccuracy(false);
          setIsConfirmed(false);
          
          map?.panTo(newPos);
          map?.setZoom(18);
          Mythos.log("LOCATION_PLACES_SELECT", "Success", { lat, lng, address: formattedAddress });
        }
      });
      setAutocomplete(ac);
    } catch (err: any) {
      console.error("Autocomplete init failed", err);
      setPlacesError("Location search initialization failed.");
    }
  }, [placesLib, map]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS not supported by your browser');
      return;
    }

    setIsDetecting(true);
    setIsConfirmed(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy: gpsAccuracy } = position.coords;
        console.log(`[GPS] Raw: Lat ${latitude}, Lng ${longitude}, Accuracy: ${gpsAccuracy}m`);
        
        const newPos = { lat: latitude, lng: longitude };
        setCenter(newPos);
        setMarkerPos(newPos);
        setAccuracy(gpsAccuracy);
        
        if (gpsAccuracy > 100) {
          setIsLowAccuracy(true);
          setSource('gps');
          toast.error('GPS Accuracy poor (>100m). Please refine on map or search address.', { duration: 5000 });
          Mythos.log("GPS_LOW_ACCURACY", "Rejected as final", { latitude, longitude, gpsAccuracy });
        } else {
          setIsLowAccuracy(false);
          setSource('gps');
          Mythos.log("GPS_HIGH_ACCURACY", "Locked", { latitude, longitude, gpsAccuracy });
        }

        if (geocodingLib) {
          await reverseGeocode(latitude, longitude, 'gps', gpsAccuracy);
        }
        
        setIsDetecting(false);
        map?.panTo(newPos);
        map?.setZoom(18);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setIsDetecting(false);
        setSource('pin');
        toast.error('GPS detection failed. Use address search or move pin manually.');
        Mythos.error("GPS_SYNC_FAILED", error.message);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number, sourceLabel: 'gps' | 'pin', accuracyVal: number) => {
    if (!geocodingLib) return;

    setIsGeocoding(true);
    try {
      const geocoder = new geocodingLib.Geocoder();
      const response = await geocoder.geocode({ 
        location: { lat, lng },
        region: 'au'
      });

      if (response.results[0]) {
        const result = response.results[0];
        const addr = result.formatted_address;
        const locType = result.geometry.location_type;
        const placeId = result.place_id;
        
        console.log(`[GEO] Resolved: ${addr} (${locType})`);
        
        if (locType === 'APPROXIMATE' && accuracyVal > 50) {
          setIsLowAccuracy(true);
          toast.error('Address is vague. Please move pin to the exact property entrance.');
          Mythos.log("VAGUE_GEOCODE", "Low confidence", { addr, locType, lat, lng });
        }

        setAddress(addr);
        setSearchQuery(addr);
        setSource(sourceLabel);
        setPlaceId(placeId || '');
        setAccuracy(accuracyVal);
        setIsConfirmed(false);
        
        Mythos.log("LOCATION_GEO_SYNC", "Success", { 
          lat, 
          lng, 
          address: addr, 
          locationType: locType,
          placeId,
          accuracy: accuracyVal
        });
      }
    } catch (error: any) {
      console.error('Geocoding error:', error);
      if (error?.message?.includes('REQUEST_DENIED') || error?.toString()?.includes('REQUEST_DENIED')) {
        toast.error('Geocoding API denied request. Please ensure "Geocoding API" is enabled in your Google Cloud Console for this key.');
      } else {
        toast.error('Failed to resolve address. Please move pin or search.');
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPos({ lat, lng });
      setAccuracy(5);
      setSource('pin');
      setIsLowAccuracy(false);
      setIsConfirmed(false);
      reverseGeocode(lat, lng, 'pin', 5);
      Mythos.log("PIN_DRAG", "Relocated", { lat, lng });
    }
  };

  const handleConfirmLocation = () => {
    if (isLowAccuracy && source === 'gps') {
      toast.error('Accuracy too low. Please search for specific address or adjust pin.');
      return;
    }

    if (!address) {
      toast.error('Please wait for address sync or search for one.');
      return;
    }

    setIsConfirmed(true);
    onLocationSelect({
      latitude: markerPos.lat,
      longitude: markerPos.lng,
      address: address,
      accuracy: accuracy || 0,
      source: source,
      placeId: placeId,
      verified: true
    });
    
    toast.success('Location confirmed and validated.');
    Mythos.log("LOCATION_CONFIRMED", "Success", { lat: markerPos.lat, lng: markerPos.lng, address, source, accuracy });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">
          Property Lookup / Search
        </label>
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30 group-focus-within:text-secondary transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <Input
            ref={autocompleteInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placesError || "Enter property address..."}
            disabled={!placesLib}
            className={cn(
              "pl-10 h-14 bg-white border-border rounded-xl shadow-premium focus:ring-secondary/20 text-base font-bold",
              placesError && "border-red-200 bg-red-50 text-red-500",
              isLowAccuracy && "border-orange-200 ring-2 ring-orange-500/20"
            )}
          />
          {(isDetecting || isGeocoding) && (
             <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] uppercase font-black text-secondary">
               <Loader2 className="w-3 h-3 animate-spin" />
               <span className="animate-pulse">Locking...</span>
             </div>
          )}
        </div>
      </div>

      <div className="relative h-[400px] rounded-2xl overflow-hidden border-2 border-border shadow-premium group/map">
        {!apiIsLoaded ? (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
          </div>
        ) : (
          <Map
            center={center}
            zoom={18}
            onCenterChanged={(e) => setCenter(e.detail.center)}
            mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "LOCATION_PICKER_MASTER_MAP"}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            className="w-full h-full"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            <AdvancedMarker
              position={markerPos}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
            >
              <Pin background={isLowAccuracy ? "#F59E0B" : (isConfirmed ? "#22C55E" : "#C1352A")} borderColor="white" glyphColor="#fff" scale={1.4}>
                {isLowAccuracy ? <AlertCircle className="w-5 h-5 text-white" /> : <MapPin className="w-5 h-5 text-white" />}
              </Pin>
            </AdvancedMarker>

            <MapControl position={ControlPosition.TOP_RIGHT}>
              <div className="p-4 flex flex-col gap-2">
                <Button
                  type="button"
                  variant="white"
                  className="shadow-premium h-12 w-12 p-0 rounded-xl bg-white/95 backdrop-blur-md border hover:bg-white active:scale-95 transition-all"
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  title="Detect My Location"
                >
                  <Navigation className={cn("w-6 h-6 text-secondary", isDetecting && "animate-pulse")} />
                </Button>
              </div>
            </MapControl>
          </Map>
        )}

        <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-3">
          <div className={cn(
            "bg-white/95 backdrop-blur-md px-5 py-4 rounded-2xl border-2 shadow-premium flex items-center gap-4 transition-all",
            isLowAccuracy ? "border-orange-500 shadow-orange-500/20" : 
            isConfirmed ? "border-green-500 shadow-green-500/20" : "border-border"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              isLowAccuracy ? "bg-orange-100" : isConfirmed ? "bg-green-100" : "bg-primary/10"
            )}>
               <Locate className={cn(
                 "w-5 h-5",
                 isLowAccuracy ? "text-orange-600" : isConfirmed ? "text-green-600" : "text-primary",
                 (isDetecting || isGeocoding) && "animate-spin"
               )} />
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">
                  {source === 'gps' ? `GPS LOCK (${Math.round(accuracy || 0)}m)` : source === 'places' ? 'Verified Address' : 'Manual Pin'}
                </span>
                {(isDetecting || isGeocoding) && <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />}
              </div>
              <p className={cn(
                "text-sm font-black truncate leading-tight",
                isLowAccuracy ? "text-orange-700" : "text-charcoal"
              )}>
                {isDetecting ? "Authenticating position..." : 
                 isGeocoding ? "Standardizing address..." : 
                 isLowAccuracy ? "Low Accuracy (Refine Pin)" :
                 address || "Searching for target..."}
              </p>
            </div>
          </div>

          {!isConfirmed && !isDetecting && !isGeocoding && address && (
            <Button
              type="button"
              onClick={handleConfirmLocation}
              disabled={isLowAccuracy}
              className={cn(
                "h-14 w-full rounded-2xl font-black text-base uppercase tracking-widest shadow-premium transition-all",
                isLowAccuracy ? "bg-orange-500 hover:bg-orange-600 animate-pulse" : "bg-charcoal hover:bg-black"
              )}
            >
              {isLowAccuracy ? "Inaccurate: Adjust Map Pin" : "Confirm Job Location"}
            </Button>
          )}
        </div>

        {placesError && (
          <div className="absolute inset-0 bg-red-50/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-50">
             <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
             <h3 className="text-lg font-black text-charcoal uppercase tracking-tighter mb-2">Protocol Error</h3>
             <p className="text-sm text-charcoal/60 font-bold max-w-xs">{placesError}</p>
             <Button 
               variant="outline" 
               className="mt-6 border-red-200 text-red-500 hover:bg-red-50"
               onClick={() => window.location.reload()}
             >
               Restart Interface
             </Button>
          </div>
        )}
      </div>

      <div className="bg-surface p-4 rounded-xl border border-secondary/20 flex items-start gap-3 shadow-sm">
        <div className="bg-secondary/10 p-2 rounded-lg shrink-0">
          <Navigation className="w-4 h-4 text-secondary" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-black leading-tight tracking-tight text-secondary uppercase">
            Location Integrity Protocol
          </p>
          <p className="text-[10px] font-bold leading-relaxed text-clay">
            High-accuracy GPS required (&lt;100m). Rural properties may require manual pin placement or address lookups for better accuracy. <span className="text-secondary">All bookings require a confirmed pin.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
