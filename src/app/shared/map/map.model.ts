import { LatLngExpression } from 'leaflet';

export interface NominatimSearchResult {
  readonly lat: string;
  readonly lon: string;
  readonly display_name: string;
}

export interface MapMarker {
  position: LatLngExpression;
  popupText?: string;
  popupData?: Record<string, unknown>;
  type?: 'user' | 'problem';
}
