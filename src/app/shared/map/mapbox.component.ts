import { Component, computed, inject, signal } from '@angular/core';
import { MapComponent } from '@shared/map/map.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { LatLngExpression } from 'leaflet';
import { MapMarker, NominatimSearchResult } from '@shared/map/map.model';
import { ProblemStateService } from '@features/problem/problem-state.service';
import { LucideMapPinHouse, LucideSearch } from '@lucide/angular';

@Component({
  selector: 'mapbox-component',
  imports: [MapComponent, ReactiveFormsModule, LucideSearch, LucideMapPinHouse],
  template: `
    <form class="location-controls" (submit)="onManualAddressSubmit($event)">
      <div style="display: flex; flex-direction: column; gap: 0.25rem">
        <label class="location-label" for="manual-address">Adresse</label>
        <input
          id="manual-address"
          class="location-input"
          type="text"
          [formControl]="addressControl"
          autocomplete="street-address"
          placeholder="Gebe deine Adresse ein"
        />
        @if (statusMessage(); as message) {
          <p class="status-message" role="status" aria-live="polite">
            {{ message }}
          </p>
        }
      </div>
      <div class="location-actions">
        <button type="submit" class="action-button" [disabled]="isResolvingAddress()">
          <svg lucideSearch></svg>
        </button>
        <button
          type="button"
          class="action-button"
          [disabled]="isLocating()"
          (click)="autoDetectLocation()"
        >
          <svg lucideMapPinHouse></svg>
        </button>
      </div>
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
      box-sizing: border-box;
    }

    .location-controls {
      position: absolute;
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      max-width: 38rem;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      padding: 0.75rem;
      z-index: 999;
      bottom: 3rem;
      left: 2rem;
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
  readonly markerLabel = signal('Gebe deinen aktuellen Standort ein!');

  readonly markers = computed<MapMarker[]>(() => {
    const userMarker: MapMarker = {
      position: this.center(),
      popupText: this.markerLabel(),
      type: 'user',
    };
    const problemMarkers: MapMarker[] = this.problemStateService
      .getProblems()()
      .map((problem) => ({
        position: [Number(problem.location.corLat), Number(problem.location.corLon)],
        popupText: `${problem.name}: ${problem.description}`,
        type: 'problem',
      }));

    return [userMarker, ...problemMarkers];
  });

  async autoDetectLocation(): Promise<void> {
    if (!('geolocation' in navigator)) {
      this.statusMessage.set(
        'Die automatische Erkennung deines Standorts, ist von deinem Browser nicht ünterstüzt',
      );
      return;
    }

    this.isLocating.set(true);
    this.statusMessage.set('Erkenne deinen Standort...');

    try {
      const coords = await this.resolveCurrentLocation();
      this.center.set([coords.latitude, coords.longitude]);
      this.zoom.set(this.locationZoom);
      this.markerLabel.set('Dein aktueller Standort');
      this.statusMessage.set('Deinen aktuellen Standort gefunden!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Dein Standort ist unbekannt!';
      this.statusMessage.set(message);
    } finally {
      this.isLocating.set(false);
    }
  }

  async onManualAddressSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const address = this.addressControl.value.trim();
    if (!address) {
      this.statusMessage.set('Bitte gebe deine Adresse vorher ein!');
      return;
    }

    this.isResolvingAddress.set(true);
    this.statusMessage.set('Suche deine Adresse auf der Karte...');

    try {
      const match = await this.resolveAddress(address);
      this.center.set([Number(match.lat), Number(match.lon)]);
      this.zoom.set(this.locationZoom);
      this.markerLabel.set(match.display_name);
      this.statusMessage.set(`Showing: ${match.display_name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unmöglich die Adresse zu laden!';
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
          reject(
            new Error(`Unmöglich deinen Standort zu lesen! (${error.code}): ${error.message}`),
          );
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
      throw new Error('Adressenaufruf fehlgeschlagen! Bitte versuche es erneut.');
    }

    const results: unknown = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('Keinen Standort gefunden!');
    }

    const firstResult = results[0];
    if (
      typeof firstResult !== 'object' ||
      firstResult === null ||
      !('lat' in firstResult) ||
      !('lon' in firstResult) ||
      !('display_name' in firstResult)
    ) {
      throw new Error('Adressenabruf hat ungültige Daten zurückgegeben.');
    }

    const candidate = firstResult as NominatimSearchResult;
    const latitude = Number(candidate.lat);
    const longitude = Number(candidate.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Adressenabruf hat ungültige Koordinaten zurückgegeben!');
    }

    return candidate;
  }
}
