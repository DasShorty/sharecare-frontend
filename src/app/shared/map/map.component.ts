import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import type { LatLngExpression, LayerGroup, Map as LeafletMap } from 'leaflet';
import { MapMarker } from '@shared/map/map.model';
import { PaymentType } from '@features/payment/payment.model';
import { ProblemType } from '@features/problem/problem.model';

@Component({
  selector: 'map-component',
  imports: [],
  template: `
    <div class="map-shell">
      @if (loading()) {
        <div class="map-loading" aria-hidden="true">Loading map...</div>
      }
      <div #mapHost class="map-surface" aria-label="Interactive map"></div>
    </div>
  `,
  host: {
    class: 'app-map',
  },
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 0;
      }

      .map-shell {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 0;
      }

      .map-surface {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        min-height: 0;
        touch-action: auto;
      }

      .map-loading {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: grid;
        place-items: center;
        background: #f3f4f6;
        color: #4b5563;
        font-size: 0.95rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  readonly center = input<LatLngExpression>([51.1401356, 14.8824797]);
  readonly zoom = input(13);
  readonly markers = input<MapMarker[]>([]);
  readonly tileUrl = input('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  readonly attribution = input('&copy; OpenStreetMap');
  readonly maxZoom = input(19);
  readonly minZoom = input(3);
  readonly loading = signal(true);

  @ViewChild('mapHost', { static: true })
  private readonly mapHost!: ElementRef<HTMLDivElement>;
  private readonly map = signal<LeafletMap | null>(null);
  private leafletApi: typeof import('leaflet') | null = null;
  private markerLayer: LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Effect only for updating the map view when centre/zoom change explicitly.
    effect(() => {
      const map = this.map();
      if (!map) return;
      // Only react to explicit center/zoom changes — this allows users to pan/zoom manually
      map.setView(this.center(), this.zoom());
    });

    // Separate effect for rendering markers so marker updates don't force the view
    effect(() => {
      const map = this.map();
      if (!map) return;
      // read markers to subscribe to changes, but schedule renderMarkers to avoid
      // interfering with pointer events during user interactions.
      this.markers();
      requestAnimationFrame(() => this.renderMarkers(map));
    });
  }

  async ngAfterViewInit(): Promise<void> {
    this.leafletApi = await import('leaflet');
    const host = this.mapHost.nativeElement;
    const map = this.leafletApi.map(host, {
      center: this.center(),
      zoom: this.zoom(),
      zoomControl: true,
      scrollWheelZoom: true,
      touchZoom: true,
      dragging: true,
      doubleClickZoom: true,
    });

    // Explicitly enable interaction handlers to be robust across platforms
    try {
      map.dragging?.enable();
      map.touchZoom?.enable();
      map.scrollWheelZoom?.enable();
      map.doubleClickZoom?.enable();
    } catch {
      // ignore if not supported
    }

    const tileUrl = this.tileUrl();
    const tileOptions = {
      attribution: this.attribution(),
      maxZoom: this.maxZoom(),
      minZoom: this.minZoom(),
    } as const;

    // Create the tile layer and attach handlers to deal with loading errors
    let tileLayer = this.leafletApi.tileLayer(tileUrl, tileOptions).addTo(map);
    let triedFallback = false;

    tileLayer.on('load', () => this.loading.set(false));
    tileLayer.on('tileerror', (err: unknown) => {
      console.warn('Tile error', err);
      // Try a fallback tileset once
      if (!triedFallback) {
        triedFallback = true;
        try {
          const fallback = 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png';
          map.removeLayer(tileLayer);
          tileLayer = this.leafletApi!.tileLayer(fallback, tileOptions).addTo(map);
          tileLayer.on('load', () => this.loading.set(false));
        } catch (e) {
          console.warn('Fallback tiles failed', e);
          this.loading.set(false);
        }
      } else {
        // If fallback already tried, just clear loading so overlay won't block
        this.loading.set(false);
      }
    });

    this.map.set(map);
    this.renderMarkers(map);

    this.resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    this.resizeObserver.observe(host);
    map.once('load', () => this.loading.set(false));
    requestAnimationFrame(() => map.invalidateSize());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.markerLayer?.remove();
    this.map()?.remove();
  }

  private renderMarkers(map: LeafletMap): void {
    this.markerLayer?.remove();

    const leaflet = this.leafletApi;
    if (!leaflet) {
      return;
    }

    const userIcon = leaflet.divIcon({
      className: 'custom-marker user-marker',
      html: '<span class="marker-icon"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-icon lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const productIcon = leaflet.divIcon({
      className: 'custom-marker problem-marker',
      html: '<span class="marker-icon"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const serviceIcon = leaflet.divIcon({
      className: 'custom-marker problem-marker',
      html: '<span class="marker-icon"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const layer = leaflet.layerGroup();
    for (const marker of this.markers()) {
      let icon = undefined;
      const problemType = marker.popupData
        ? (marker.popupData['type'] as ProblemType | undefined)
        : undefined;

      if (marker.type === 'problem') {
        if (problemType === ProblemType.Resource) {
          icon = productIcon;
        } else {
          icon = serviceIcon;
        }
      } else {
        icon = userIcon;
      }

      const leafletMarker = leaflet.marker(marker.position, { icon });

      if (marker.popupData && typeof marker.popupData === 'object') {
        const html = this.buildPopupHtml(marker.popupData);
        leafletMarker.bindPopup(html, { maxWidth: 320 });
      } else if (marker.popupText) {
        leafletMarker.bindPopup(String(marker.popupText));
      }

      leafletMarker.addTo(layer);
    }

    layer.addTo(map);
    this.markerLayer = layer;
  }

  private buildPopupHtml(data: Record<string, unknown>): string {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Map internal property names to end-user labels (German). Update this object to change what users see.
    const labelMap: Record<string, string> = {
      name: 'Name',
      description: 'Beschreibung',
      type: 'Typ',
      time: 'Zeit',
      payment: 'Zahlungsart',
      location: 'Ort',
      address: 'Adresse',
      corLat: 'Breitengrad',
      corLon: 'Längengrad',
      startTime: 'Start',
      endTime: 'Ende',
      moneyAmount: 'Betrag',
      customText: 'Beschreibung',
    };

    const humanizeKey = (k: string) => {
      if (labelMap[k]) return labelMap[k];
      // fallback: split camelCase or underscores and capitalize
      const parts = k
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .split(' ');
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    };

    const formatValue = (key: string, value: unknown): string => {
      if (value === null || value === undefined) return '';
      // Problem type (enum) formatting: show German names
      if (key === 'type' && (typeof value === 'number' || typeof value === 'string')) {
        const n = Number(value);
        if (n === ProblemType.Resource) return 'Ware / Produkt';
        if (n === ProblemType.Service) return 'Dienstleistung';
        return String(value);
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }

      if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;

        // Time formatting: handle fixed or range
        if ('time' in obj || ('startTime' in obj && 'endTime' in obj)) {
          try {
            if ('time' in obj) {
              const t = new Date(obj['time'] as any);
              return t.toLocaleString('de-DE');
            }
            const s = new Date(obj['startTime'] as any);
            const e = new Date(obj['endTime'] as any);
            return `${s.toLocaleString('de-DE')} — ${e.toLocaleString('de-DE')}`;
          } catch {
            return JSON.stringify(obj);
          }
        }

        // Payment formatting: show human-friendly label
        if (key === 'payment') {
          const t = obj['type'] as unknown as number | undefined;
          if (t === PaymentType.Free) return 'Kostenlos';
          if (t === PaymentType.Money && 'amount' in obj) {
            const amt = Number(obj['amount']);
            if (!Number.isNaN(amt)) return `${amt.toFixed(2)} €`;
          }
          if (t === PaymentType.Custom && 'customText' in obj) return String(obj['customText']);
          // fallback
          if ('customText' in obj) return String(obj['customText']);
          if ('amount' in obj) {
            const amt = Number(obj['amount']);
            if (!Number.isNaN(amt)) return `${amt.toFixed(2)} €`;
          }
          return '<custom>';
        }

        // Location formatting
        if ('address' in obj && 'corLat' in obj && 'corLon' in obj) {
          return String(obj['address']);
        }

        try {
          return JSON.stringify(obj, undefined, 0);
        } catch {
          return String(obj);
        }
      }

      return String(value);
    };

    const rows: string[] = [];
    for (const key of Object.keys(data)) {
      const raw = data[key];
      const value = formatValue(key, raw);
      const label = humanizeKey(key);
      rows.push(`
        <div style="display:flex;gap:0.5rem;padding:0.3rem 0;border-bottom:1px solid rgba(0,0,0,0.06);">
          <div style="flex:0 0 7.5rem;color:#374151;font-weight:700;font-size:0.9rem;">${escape(label)}</div>
          <div style="flex:1;color:#111827;font-size:0.95rem;">${escape(value)}</div>
        </div>
      `);
    }

    return `
      <div style="font-family:system-ui,Arial,sans-serif;font-size:0.95rem;min-width:240px;">
        ${rows.join('')}
      </div>
    `;
  }
}
