'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAllProperties } from '@/lib/hooks/use-property-search';
import { PROPERTY_STATUS_META } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/theme-provider';
import { EmptyState } from '@/components/ui/empty-state';
import { MapIcon } from 'lucide-react';

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { data: properties } = useAllProperties();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);

  const geoProperties = useMemo(
    () => properties?.filter((p) => p.lat != null && p.lng != null) ?? [],
    [properties]
  );

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const styleUrl = resolvedTheme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [28.9784, 41.0082],
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => setReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme]);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (geoProperties.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    geoProperties.forEach((p) => {
      const meta = PROPERTY_STATUS_META[p.status];
      const el = document.createElement('button');
      el.style.cssText = `
        width: 14px; height: 14px; border-radius: 50%;
        background: ${meta.color}; border: 2.5px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3); cursor: pointer;
      `;

      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`
        <div style="font-family: system-ui; padding: 2px;">
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${p.title}</div>
          <div style="font-size: 13px; color: #6366f1; font-weight: 600;">${formatCurrency(p.price, p.currency)}</div>
        </div>
      `);

      el.addEventListener('click', () => router.push(`/properties/${p.id}`));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng!, p.lat!])
        .setPopup(popup)
        .addTo(mapRef.current!);

      el.addEventListener('mouseenter', () => marker.togglePopup());
      el.addEventListener('mouseleave', () => marker.togglePopup());

      markersRef.current.push(marker);
      bounds.extend([p.lng!, p.lat!]);
    });

    if (geoProperties.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 500 });
    }
  }, [geoProperties, ready, router]);

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <div ref={mapContainer} className="absolute inset-0" />
      {properties && geoProperties.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <EmptyState icon={MapIcon} title="No mapped properties" description="Add latitude/longitude to properties to see them here." />
        </div>
      )}
      <div className="absolute top-4 left-4 rounded-xl bg-surface/95 backdrop-blur-lg border border-border px-3 py-2 shadow-popover text-xs space-y-1">
        {Object.entries(PROPERTY_STATUS_META).map(([k, m]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
            {m.label}
          </div>
        ))}
      </div>
    </div>
  );
}
