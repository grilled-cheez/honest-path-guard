import { useEffect, useRef } from "react";
import { Waypoint } from "@/lib/waypoint-engine";

interface GISMapProps {
  waypoints: Waypoint[];
}

const GISMap = ({ waypoints }: GISMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [23.0225, 72.5714],
        zoom: 12,
        zoomControl: false,
      });

      // Dark tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add waypoints
      waypoints.forEach((wp) => {
        const color = wp.status === "verified" ? "#22C55E" : wp.status === "rejected" ? "#EF4444" : "#EAB308";

        L.circleMarker([wp.lat, wp.lng], {
          radius: 8,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4,
        })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:monospace;font-size:11px;color:#000">
              <strong>WP-${wp.id}</strong><br/>
              Status: ${wp.status.toUpperCase()}<br/>
              ${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}
            </div>`
          );
      });

      // Connect waypoints with a line
      const coords = waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]);
      L.polyline(coords, { color: "#22C55E", weight: 1, opacity: 0.3, dashArray: "5,10" }).addTo(map);

      // Fit bounds
      if (coords.length > 0) {
        map.fitBounds(L.latLngBounds(coords).pad(0.2));
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when waypoint status changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      // Remove existing circle markers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.CircleMarker) {
          map.removeLayer(layer);
        }
      });

      waypoints.forEach((wp) => {
        const color = wp.status === "verified" ? "#22C55E" : wp.status === "rejected" ? "#EF4444" : "#EAB308";
        L.circleMarker([wp.lat, wp.lng], {
          radius: 8,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4,
        })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:monospace;font-size:11px;color:#000">
              <strong>WP-${wp.id}</strong><br/>
              Status: ${wp.status.toUpperCase()}<br/>
              ${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}
            </div>`
          );
      });
    });
  }, [waypoints.map((w) => w.status).join(",")]);

  return (
    <div className="relative">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div ref={mapRef} className="h-[350px] lg:h-[400px] w-full" />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-card/90 border border-border rounded p-2 z-[1000]">
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-verified" />
            <span>VERIFIED</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-rejected" />
            <span>REJECTED</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pending" />
            <span>PENDING</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GISMap;
