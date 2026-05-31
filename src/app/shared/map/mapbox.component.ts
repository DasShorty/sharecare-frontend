import { Component, computed, inject, signal } from '@angular/core';
import { MapComponent } from '@shared/map/map.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { LatLngExpression } from 'leaflet';
import { MapMarker } from '@shared/map/map.model';
import { LocationService } from '@features/location/location.service';
import { LucideMapPinHouse, LucideSearch } from '@lucide/angular';
import { ProblemService } from '@features/problem/problem.service';

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
    <button
      class="center-button"
      type="button"
      aria-label="Zentriere Karte auf meinen Standort"
      (click)="autoDetectLocation()"
      [disabled]="isLocating()"
    >
      <svg lucideMapPinHouse></svg>
    </button>
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
      top: 3rem;
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

    .center-button {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 1000;
      width: 3rem;
      height: 3rem;
      border-radius: 0.5rem;
      border: 1px solid #d1d5db;
      background: #ffffff;
      display: grid;
      place-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      cursor: pointer;
    }

    .center-button[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
})
export class MapboxComponent {
  private readonly fallbackCenter: LatLngExpression = [51.0504, 13.7373];
  private readonly locationZoom = 15;
  private readonly problemService = inject(ProblemService);
  private readonly locationService = inject(LocationService);

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
    const problemMarkers: MapMarker[] = this.problemService
      .getProblems()()
      .map((problem) => ({
        position: [Number(problem.location.corLat), Number(problem.location.corLon)],
        popupText: `${problem.name}: ${problem.description}`,
        // provide structured data for richer popups
        popupData: {
          name: problem.name,
          description: problem.description,
          type: problem.type,
          time: problem.time,
          payment: problem.payment,
          location: problem.location,
        },
        type: 'problem',
      }));

    return [userMarker, ...problemMarkers];
  });

  constructor() {
    const saved = this.locationService.loadSavedLocation();
    if (saved) {
      this.center.set([Number(saved.lat), Number(saved.lon)]);
      this.zoom.set(this.locationZoom);
      const label = saved.display_name ?? `${saved.lat}, ${saved.lon}`;
      this.markerLabel.set(label);
      this.addressControl.setValue(label);
    }
  }

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
      const coords = await this.locationService.getCurrentLocation();
      this.center.set([coords.latitude, coords.longitude]);
      this.zoom.set(this.locationZoom);

      try {
        const rev = await this.locationService.reverseGeocode(coords.latitude, coords.longitude);
        this.markerLabel.set(rev.display_name ?? 'Dein aktueller Standort');
        this.addressControl.setValue(rev.display_name ?? `${coords.latitude}, ${coords.longitude}`);
        this.locationService.saveUserLocation(
          coords.latitude,
          coords.longitude,
          rev.display_name ?? null,
        );
      } catch {
        this.markerLabel.set('Dein aktueller Standort');
        const coordStr = `${coords.latitude}, ${coords.longitude}`;
        this.addressControl.setValue(coordStr);
        this.locationService.saveUserLocation(coords.latitude, coords.longitude, coordStr);
      }

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
      const match = await this.locationService.geocodeAddress(address);
      this.center.set([Number(match.lat), Number(match.lon)]);
      this.zoom.set(this.locationZoom);
      this.markerLabel.set(match.display_name);
      // Ensure the manual search input reflects the canonical display name
      this.addressControl.setValue(match.display_name);
      this.locationService.saveUserLocation(
        Number(match.lat),
        Number(match.lon),
        match.display_name,
      );
      this.statusMessage.set(`Showing: ${match.display_name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unmöglich die Adresse zu laden!';
      this.statusMessage.set(message);
    } finally {
      this.isResolvingAddress.set(false);
    }
  }

  // Location operations are handled by LocationService
}
