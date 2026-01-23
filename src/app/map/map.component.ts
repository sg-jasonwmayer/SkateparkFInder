import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ChangeDetectorRef, OnInit } from '@angular/core';

declare const L: any;

type SkateparkResult = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};
type SkateparkView = SkateparkResult & {
  distanceMiles: number;
  isIndoor: boolean;
};
@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    MatSlideToggleModule,
    MatListModule, 
    MatDividerModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit {
  loading = false;
  error: string | null = null;
  results: SkateparkResult[] = [];
  displayedResults: SkateparkView[] = [];
  showIndoor = true;
  showOutdoor = true;

  private map: any;
  private userMarker: any;
  private resultMarkers = new Map<number, any>();
  private userLat: number | null = null;
  private userLon: number | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initMapAndSearch();
  }

  private initMapAndSearch(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    if (!('geolocation' in navigator)) {
      this.error = 'Geolocation is not supported by your browser.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        this.userLat = lat;
        this.userLon = lon;
        this.ensureMap(lat, lon);

        try {
          // 100 miles ≈ 160,934 meters
          const parks = await this.fetchSkateparks(lat, lon, 160934);
          this.results = parks;
          this.applyFiltersAndMarkers();
        } catch (e) {
          this.error = 'Failed to load skateparks. Please try again.';
        } finally {
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      err => {
        this.error = err?.message || 'Unable to get your location.';
        this.loading = false;
        this.cdr.markForCheck();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  private ensureMap(lat: number, lon: number): void {
    if (!this.map) {
      this.map = L.map('map').setView([lat, lon], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);
    } else {
      this.map.setView([lat, lon], 13);
    }
    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lon]);
    } else {
      this.userMarker = L.marker([lat, lon], { title: 'You are here' }).addTo(this.map);
      this.userMarker.bindPopup('You are here');
    }
  }

  private async fetchSkateparks(lat: number, lon: number, radiusMeters: number): Promise<SkateparkResult[]> {
    const query = `
      [out:json][timeout:25];
      (
        node(around:${radiusMeters},${lat},${lon})["leisure"="skatepark"];
        way(around:${radiusMeters},${lat},${lon})["leisure"="skatepark"];
        relation(around:${radiusMeters},${lat},${lon})["leisure"="skatepark"];
      );
      out center tags;
    `;
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: 'data=' + encodeURIComponent(query)
    });
    if (!resp.ok) {
      throw new Error('Overpass API error');
    }
    const data = await resp.json();
    const elements = Array.isArray(data?.elements) ? data.elements : [];
    const results: SkateparkResult[] = elements.map((el: any) => {
      const centerLat = el.lat ?? el.center?.lat;
      const centerLon = el.lon ?? el.center?.lon;
      return {
        id: el.id,
        name: el.tags?.name ?? '',
        lat: centerLat,
        lon: centerLon,
        tags: el.tags ?? {}
      };
    }).filter((r: SkateparkResult) => typeof r.lat === 'number' && typeof r.lon === 'number');

    // Deduplicate by id in case of overlaps
    const unique = new Map<number, SkateparkResult>();
    for (const r of results) unique.set(r.id, r);
    return Array.from(unique.values());
  }

  private placeResultMarkers(parks: Array<SkateparkResult | SkateparkView>): void {
    // Clear existing
    this.resultMarkers.forEach(marker => marker.remove());
    this.resultMarkers.clear();

    const bounds = L.latLngBounds([]);
    parks.forEach(p => {
      const marker = L.marker([p.lat, p.lon], { title: p.name || 'Skatepark' })
        .addTo(this.map)
        .bindPopup(`<strong>${p.name || 'Skatepark'}</strong>`);
      this.resultMarkers.set(p.id, marker);
      bounds.extend([p.lat, p.lon]);
    });
    if (parks.length > 0) {
      bounds.extend(this.userMarker.getLatLng());
      this.map.fitBounds(bounds.pad(0.2), { maxZoom: 16 });
    }
  }

  focusPark(park: SkateparkResult): void {
    const marker = this.resultMarkers.get(park.id);
    if (marker) {
      this.map.flyTo([park.lat, park.lon], 16, { duration: 0.75 });
      marker.openPopup();
    } else {
      this.map.flyTo([park.lat, park.lon], 16, { duration: 0.75 });
    }
  }

  onToggleIndoor(value: boolean): void {
    this.showIndoor = value;
    this.applyFiltersAndMarkers();
  }

  onToggleOutdoor(value: boolean): void {
    this.showOutdoor = value;
    this.applyFiltersAndMarkers();
  }

  private applyFiltersAndMarkers(): void {
    if (this.userLat == null || this.userLon == null) {
      this.displayedResults = [];
      this.placeResultMarkers([]);
      this.cdr.markForCheck();
      return;
    }
    // Enrich with distance and indoor/outdoor classification
    const enriched: SkateparkView[] = this.results.map(r => {
      const isIndoor = (r.tags?.['indoor'] ?? '').toLowerCase() === 'yes';
      const distanceMiles = this.haversineMiles(this.userLat!, this.userLon!, r.lat, r.lon);
      return { ...r, isIndoor, distanceMiles };
    });
    // Filter logic: indoor shows only isIndoor, outdoor shows not isIndoor (including missing tag)
    const filtered = enriched.filter(p => {
      if (p.isIndoor && !this.showIndoor) return false;
      if (!p.isIndoor && !this.showOutdoor) return false;
      return true;
    });
    // Sort by distance ascending
    filtered.sort((a, b) => a.distanceMiles - b.distanceMiles);
    this.displayedResults = filtered;
    this.placeResultMarkers(filtered);
    this.cdr.markForCheck();
  }

  private haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (d: number) => d * Math.PI / 180;
    const R_km = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d_km = R_km * c;
    return d_km * 0.621371; // miles
  }
}
