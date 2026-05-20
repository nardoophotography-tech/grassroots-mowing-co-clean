import React, { useEffect, useRef, useState } from 'react';
import { 
  APIProvider, 
  Map, 
  useMap, 
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Ruler, Trash2, CheckCircle2 } from 'lucide-react';

interface SatelliteMeasurementProps {
  address: string;
  onAreaMeasured: (areaSqm: number) => void;
}

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY) || '';

const MapController = ({ address }: { address: string }) => {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');

  useEffect(() => {
    if (!map || !geocodingLib || !address) return;

    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        map.setCenter(results[0].geometry.location);
        map.setZoom(20); // High zoom for satellite measurement
      }
    });
  }, [map, geocodingLib, address]);

  return null;
};

const DrawingTool = ({ onAreaMeasured }: { onAreaMeasured: (area: number) => void }) => {
  const map = useMap();
  const geometryLib = useMapsLibrary('geometry');
  const drawingLib = useMapsLibrary('drawing');
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map || !drawingLib || !geometryLib) return;

    const dm = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.POLYGON]
      },
      polygonOptions: {
        fillColor: '#ef4444',
        fillOpacity: 0.35,
        strokeWeight: 2,
        strokeColor: '#ef4444',
        clickable: true,
        editable: true,
        zIndex: 1
      }
    });

    dm.setMap(map);
    drawingManagerRef.current = dm;

    google.maps.event.addListener(dm, 'overlaycomplete', (event: any) => {
      if (event.type === google.maps.drawing.OverlayType.POLYGON) {
        if (polygonRef.current) {
          polygonRef.current.setMap(null);
        }
        
        const newPolygon = event.overlay;
        polygonRef.current = newPolygon;
        dm.setDrawingMode(null); // Stop drawing mode after one polygon

        const updateArea = () => {
          const path = newPolygon.getPath();
          const area = google.maps.geometry.spherical.computeArea(path);
          onAreaMeasured(Math.round(area));
        };

        updateArea();
        google.maps.event.addListener(newPolygon.getPath(), 'set_at', updateArea);
        google.maps.event.addListener(newPolygon.getPath(), 'insert_at', updateArea);
      }
    });

    return () => {
      dm.setMap(null);
      if (polygonRef.current) polygonRef.current.setMap(null);
    };
  }, [map, drawingLib, geometryLib]);

  return (
    <div className="absolute bottom-4 left-4 flex gap-2">
      <Button 
        variant="destructive" 
        size="sm"
        onClick={() => {
          if (polygonRef.current) {
            polygonRef.current.setMap(null);
            polygonRef.current = null;
            onAreaMeasured(0);
          }
          if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
          }
        }}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Clear Measurement
      </Button>
    </div>
  );
};

export function SatelliteMeasurement({ address, onAreaMeasured }: SatelliteMeasurementProps) {
  const [measuredArea, setMeasuredArea] = useState(0);

  const handleConfirm = () => {
    onAreaMeasured(measuredArea);
  };

  if (!API_KEY) {
    return (
      <div className="p-8 text-center bg-gray-100 rounded-xl">
        <p className="text-gray-600 mb-4">Google Maps API Key is required for satellite measurement.</p>
        <div className="text-xs text-gray-400 font-mono">VITE_GOOGLE_MAPS_PLATFORM_KEY missing</div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-orange-200">
      <CardHeader className="bg-orange-50/50">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-orange-600" />
            Satellite Property Measurement
          </div>
          {measuredArea > 0 && (
            <div className="text-orange-700 bg-orange-100 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
              {measuredArea} m² detected
            </div>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Trace the boundaries of your lawn on the map below for an 100% accurate instant quote.
        </p>
      </CardHeader>
      <CardContent className="p-0 relative">
        <div className="h-[450px] w-full relative">
          <Map
            defaultCenter={{ lat: -27.4698, lng: 153.0251 }}
            defaultZoom={15}
            mapTypeId="satellite"
            mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "SATELLITE_MEASURE_MAP"}
            tilt={0}
            heading={0}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="h-full w-full"
          >
            <MapController address={address} />
            <DrawingTool onAreaMeasured={setMeasuredArea} />
          </Map>

          {measuredArea === 0 && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-orange-200 animate-bounce">
              <p className="text-xs font-bold text-orange-800">Start clicking to trace your lawn!</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {measuredArea > 0 ? 'Measurement complete. Adjust nodes if needed.' : 'Awaiting measurement...'}
          </div>
          <Button 
            disabled={measuredArea === 0}
            onClick={handleConfirm}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Apply Measurement
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
