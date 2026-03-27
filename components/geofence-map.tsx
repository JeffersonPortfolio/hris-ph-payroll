"use client";

import { useEffect, useRef, useState } from "react";

interface GeofenceMapProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

const TILE_URL = [
  "https:/",
  "/tile.openstreetmap.org",
  "/{z}/{x}/{y}.png",
].join("");

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L);
      return;
    }
    const cssId = "leaflet-css-cdn";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });
}

export default function GeofenceMap({ latitude, longitude, radiusKm }: GeofenceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadLeaflet().then(() => setReady(true)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const radiusMeters = radiusKm * 1000;

    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: true,
    });
    mapInstanceRef.current = map;

    L.tileLayer(TILE_URL, {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: "",
      html: '<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white" stroke="#991b1b"/></svg></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);

    const circle = L.circle([latitude, longitude], {
      radius: radiusMeters,
      color: "#dc2626",
      weight: 2,
      opacity: 0.7,
      fillColor: "#fca5a5",
      fillOpacity: 0.25,
      dashArray: "6, 4",
    }).addTo(map);

    map.fitBounds(circle.getBounds(), { padding: [30, 30] });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [ready, latitude, longitude, radiusKm]);

  return (
    <div ref={mapRef} className="w-full h-full z-0">
      {!ready && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Loading map...</p>
        </div>
      )}
    </div>
  );
}
