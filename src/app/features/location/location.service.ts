import { Injectable } from '@angular/core';
import { NominatimSearchResult } from '@shared/map/map.model';

export interface SavedUserLocation {
  lat: number;
  lon: number;
  display_name?: string | null;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly STORAGE_KEY = 'share-care-user-location';

  async getCurrentLocation(): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve(coords),
        (error: GeolocationPositionError) =>
          reject(new Error(`Failed to read location (${error.code}): ${error.message}`)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }

  async geocodeAddress(address: string): Promise<NominatimSearchResult> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new Error('Address lookup failed');
    }

    const results: unknown = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('No location found for address');
    }

    const first = results[0];
    if (
      typeof first !== 'object' ||
      first === null ||
      !('lat' in first) ||
      !('lon' in first) ||
      !('display_name' in first)
    ) {
      throw new Error('Invalid address lookup response');
    }

    return first as NominatimSearchResult;
  }

  async reverseGeocode(lat: number, lon: number): Promise<NominatimSearchResult> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        String(lat),
      )}&lon=${encodeURIComponent(String(lon))}`,
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const result: unknown = await response.json();
    if (typeof result !== 'object' || result === null || !('display_name' in result)) {
      throw new Error('Invalid reverse geocoding response');
    }

    const display_name = (result as any).display_name as string;
    return { lat: String(lat), lon: String(lon), display_name } as NominatimSearchResult;
  }

  saveUserLocation(lat: number, lon: number, display_name?: string | null): void {
    try {
      const payload: SavedUserLocation = {
        lat,
        lon,
        display_name: display_name ?? null,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to save user location', err);
    }
  }

  loadSavedLocation(): SavedUserLocation | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedUserLocation | null;
      if (!parsed) return null;
      if (!Number.isFinite(Number(parsed.lat)) || !Number.isFinite(Number(parsed.lon))) return null;
      return parsed;
    } catch (err) {
      console.error('Failed to load saved user location', err);
      return null;
    }
  }

  clearSavedLocation(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear saved user location', err);
    }
  }
}
