import { Component, computed, inject, signal } from '@angular/core';
import { MapComponent } from '@shared/map/map.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { LatLngExpression } from 'leaflet';
import { MapMarker, NominatimSearchResult } from '@shared/map/map.model';
import { ProblemStateService } from '@features/problem/problem-state.service';

@Component({
  selector: 'mapbox-component',
  imports: [MapComponent, ReactiveFormsModule],
  template: `
    <form class="location-controls" (submit)="onManualAddressSubmit($event)">
      <label class="location-label" for="manual-address">Address</label>
      <input
        id="manual-address"
        class="location-input"
        type="text"
        [formControl]="addressControl"
        autocomplete="street-address"
        placeholder="Enter your address"
      />
      <div class="location-actions">
        <button type="submit" class="action-button" [disabled]="isResolvingAddress()">
          Use address
        </button>
        <button
          type="button"
          class="action-button"
          [disabled]="isLocating()"
          (click)="autoDetectLocation()"
        >
          Auto-detect
        </button>
      </div>
      @if (statusMessage(); as message) {
        <p class="status-message" role="status" aria-live="polite">
          {{ message }}
        </p>
      }
    </form>

    <map-component
      class="home-map"
      [center]="center()"
      [zoom]="zoom()"
      [markers]="markers()"
    ></map-component>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100dvh;
      gap: 0.75rem;
      padding: 0.75rem;
      box-sizing: border-box;
    }

    .location-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 38rem;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      padding: 0.75rem;
    }

    .location-label {
      color: #111827;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .location-input {
      border: 1px solid #6b7280;
      border-radius: 0.375rem;
      padding: 0.625rem;
      font-size: 1rem;
      color: #111827;
    }

    .location-input:focus-visible,
    .action-button:focus-visible {
      outline: 2px solid #1d4ed8;
      outline-offset: 2px;
    }

    .location-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .action-button {
      border: 1px solid #374151;
      border-radius: 0.375rem;
      background: #f9fafb;
      color: #111827;
      font-size: 0.95rem;
      font-weight: 600;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
    }

    .action-button[disabled] {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .status-message {
      margin: 0;
      color: #1f2937;
      font-size: 0.95rem;
    }

    .home-map {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
    }
  `,
})
export class MapboxComponent {
  private readonly fallbackCenter: LatLngExpression = [51.0504, 13.7373];
  private readonly locationZoom = 15;
  private readonly problemStateService = inject(ProblemStateService);

  readonly center = signal<LatLngExpression>(this.fallbackCenter);
  readonly zoom = signal(this.locationZoom);
  readonly addressControl = new FormControl('', { nonNullable: true });
  readonly statusMessage = signal<string | null>(null);
  readonly isLocating = signal(false);
  readonly isResolvingAddress = signal(false);
  readonly markerLabel = signal('Selected location');

  readonly markers = computed<MapMarker[]>(() => {
    const userMarker: MapMarker = {
      position: this.center(),
      popupText: this.markerLabel(),
      type: 'user',
    };
    const problemMarkers: MapMarker[] = this.problemStateService.getProblems()().map(problem => ({
      position: [Number(problem.location.corLat), Number(problem.location.corLon)],
      popupText: `${problem.name}: ${problem.description}`,
      type: 'problem',
    }));

    return [userMarker, ...problemMarkers];
  });

  async autoDetectLocation(): Promise<void> {
    if (!('geolocation' in navigator)) {
      this.statusMessage.set('Geolocation is not supported by this browser.');
      return;
    }

    this.isLocating.set(true);
    this.statusMessage.set('Detecting your current location...');

    try {
      const coords = await this.resolveCurrentLocation();
      this.center.set([coords.latitude, coords.longitude]);
      this.zoom.set(this.locationZoom);
      this.markerLabel.set('Your current location');
      this.statusMessage.set('Current location detected.');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to detect your current location.';
      this.statusMessage.set(message);
    } finally {
      this.isLocating.set(false);
    }
  }

  async onManualAddressSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const address = this.addressControl.value.trim();
    if (!address) {
      this.statusMessage.set('Please enter an address first.');
      return;
    }

    this.isResolvingAddress.set(true);
    this.statusMessage.set('Finding your address on the map...');

    try {
      const match = await this.resolveAddress(address);
      this.center.set([Number(match.lat), Number(match.lon)]);
      this.zoom.set(this.locationZoom);
      this.markerLabel.set(match.display_name);
      this.statusMessage.set(`Showing: ${match.display_name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to find this address.';
      this.statusMessage.set(message);
    } finally {
      this.isResolvingAddress.set(false);
    }
  }

  private resolveCurrentLocation(): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve(coords),
        (error: GeolocationPositionError) => {
          reject(new Error(`Failed to read user location (${error.code}): ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  }

  private async resolveAddress(address: string): Promise<NominatimSearchResult> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Address lookup failed. Please try again.');
    }

    const results: unknown = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('No location found for this address.');
    }

    const firstResult = results[0];
    if (
      typeof firstResult !== 'object' ||
      firstResult === null ||
      !('lat' in firstResult) ||
      !('lon' in firstResult) ||
      !('display_name' in firstResult)
    ) {
      throw new Error('Address lookup returned an invalid response.');
    }

    const candidate = firstResult as NominatimSearchResult;
    const latitude = Number(candidate.lat);
    const longitude = Number(candidate.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Address lookup returned invalid coordinates.');
    }

    return candidate;
  }
}
