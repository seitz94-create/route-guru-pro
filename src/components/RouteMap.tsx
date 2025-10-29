import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths so markers render correctly in Vite builds
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface RouteMapProps {
  lat: number;
  lng: number;
  path?: Array<{
    lat: number;
    lng: number;
  }>;
}

const RouteMap: React.FC<RouteMapProps> = ({ lat, lng, path }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map only once
    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 13,
        scrollWheelZoom: false,
      });

      // Use Thunderforest Outdoors map for better cycling route visibility
      // Get your free API key at: https://www.thunderforest.com/
      const apiKey = 'YOUR_THUNDERFOREST_API_KEY_HERE'; // Replace with your actual API key
      
      if (!apiKey || apiKey === 'YOUR_THUNDERFOREST_API_KEY_HERE') {
        // Fallback to OpenStreetMap if no API key
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(leafletMapRef.current);
      } else {
        L.tileLayer(`https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${apiKey}`, {
          attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 22,
        }).addTo(leafletMapRef.current);
      }

      L.marker([lat, lng]).addTo(leafletMapRef.current).bindPopup('Startpunkt');
    } else {
      leafletMapRef.current.setView([lat, lng], 13);
    }

    // Remove existing route if any
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    // Draw route path if provided
    if (path && path.length > 0 && leafletMapRef.current) {
      const latLngs: [number, number][] = path.map(p => [p.lat, p.lng]);
      
      routeLayerRef.current = L.polyline(latLngs, {
        color: 'hsl(var(--primary))',
        weight: 4,
        opacity: 0.8,
      }).addTo(leafletMapRef.current);

      // Fit map to show entire route
      leafletMapRef.current.fitBounds(routeLayerRef.current.getBounds(), {
        padding: [20, 20],
      });
    }

    return () => {
      // Cleanup when component unmounts
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [lat, lng, path]);

  return <div ref={mapRef} className="w-full h-48 rounded-md overflow-hidden" />;
};

export default RouteMap;
