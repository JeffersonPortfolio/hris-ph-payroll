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
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Coerce to numbers and validate — invalid coords must never reach Leaflet,
  // otherwise it throws and crashes the whole page.
  const lat = Number(latitude);
  const lng = Number(longitude);
  const radius = Number(radiusKm);
  const validCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;
  const radiusMeters = (Number.isFinite(radius) && radius > 0 ? radius : 0.1) * 1000;

  useEffect(() => {
    loadLeaflet().then(() => setReady(true)).catch(console.error);
  }, []);

  // Initialize the map exactly ONCE (never destroy/recreate on coord changes).
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    try {
      // Guard against a container that still holds a stale Leaflet id
      // (can happen with React strict-mode double effects / fast refresh).
      if ((mapRef.current as any)._leaflet_id) {
        (mapRef.current as any)._leaflet_id = null;
      }

      const map = L.map(mapRef.current, {
        center: validCoords ? [lat, lng] : [12.8797, 121.774], // default: PH center
        zoom: 15,
        scrollWheelZoom: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer(TILE_URL, {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
    } catch (err) {
      console.error("[GeofenceMap] init error:", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          /* noop */
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Update marker, circle and view whenever coords/radius change.
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!ready || !L || !map || !validCoords) return;

    try {
      const markerIcon = L.divIcon({
        className: "",
        html: '<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white" stroke="#991b1b"/></svg></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      }

      if (circleRef.current) {
        circleRef.current.setLatLng([lat, lng]);
        circleRef.current.setRadius(radiusMeters);
      } else {
        circleRef.current = L.circle([lat, lng], {
          radius: radiusMeters,
          color: "#dc2626",
          weight: 2,
          opacity: 0.7,
          fillColor: "#fca5a5",
          fillOpacity: 0.25,
          dashArray: "6, 4",
        }).addTo(map);
      }

      map.fitBounds(circleRef.current.getBounds(), { padding: [30, 30] });
    } catch (err) {
      console.error("[GeofenceMap] update error:", err);
    }
  }, [ready, lat, lng, radiusMeters, validCoords]);

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
