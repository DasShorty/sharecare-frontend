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
  readonly center = input<LatLngExpression>([51.0504, 13.7373]);
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
    effect(() => {
      const map = this.map();
      if (!map) {
        return;
      }

      const markers = this.markers();
      if (markers.length > 1 && this.leafletApi) {
        const bounds = this.leafletApi.latLngBounds(markers.map((marker) => marker.position));
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.2), {
            maxZoom: this.zoom(),
          });
        } else {
          map.setView(this.center(), this.zoom());
        }
      } else {
        map.setView(this.center(), this.zoom());
      }

      this.renderMarkers(map);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    this.leafletApi = await import('leaflet');
    const host = this.mapHost.nativeElement;
    const map = this.leafletApi.map(host, {
      center: this.center(),
      zoom: this.zoom(),
      zoomControl: true,
    });

    this.leafletApi
      .tileLayer(this.tileUrl(), {
        attribution: this.attribution(),
        maxZoom: this.maxZoom(),
        minZoom: this.minZoom(),
      })
      .addTo(map);

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

    const problemIcon = leaflet.divIcon({
      className: 'custom-marker problem-marker',
      html: '<span class="marker-icon"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const layer = leaflet.layerGroup();
    for (const marker of this.markers()) {
      const icon = marker.type === 'problem' ? problemIcon : userIcon;
      const leafletMarker = leaflet.marker(marker.position, { icon });
      if (marker.popupText) {
        leafletMarker.bindPopup(marker.popupText);
      }

      leafletMarker.addTo(layer);
    }

    layer.addTo(map);
    this.markerLayer = layer;
  }
}
