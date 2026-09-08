"use client";

import { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const defaultCenter = {
  lat: 11.6643,
  lng: 78.146,
};

const ClickToSelect = ({ onSelect, setMarker, disabled = false }) => {
  useMapEvents({
    click(event) {
      if (disabled) return;
      const coords = {
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      };
      setMarker(coords);
      onSelect?.(coords);
    },
  });

  return null;
};

const SyncMapView = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }, [center.lat, center.lng, map, zoom]);

  return null;
};

export default function MapPicker({
  onSelect,
  initialMarker = null,
  zoom = 12,
  selectedZoom = 14,
  radiusMeters = 0,
  allowSelection = true,
  height = 400,
}) {
  const [marker, setMarker] = useState(initialMarker);

  useEffect(() => {
    setMarker(initialMarker || null);
  }, [initialMarker?.lat, initialMarker?.lng]);

  const center = useMemo(() => marker || defaultCenter, [marker]);
  const mapZoom = marker ? selectedZoom : zoom;
  const containerStyle = useMemo(() => ({
    width: '100%',
    height: typeof height === 'number' ? `${height}px` : height,
  }), [height]);

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={mapZoom} style={containerStyle}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      <SyncMapView center={center} zoom={mapZoom} />
      <ClickToSelect onSelect={onSelect} setMarker={setMarker} disabled={!allowSelection} />
      {marker && radiusMeters > 0 && (
        <Circle
          center={[marker.lat, marker.lng]}
          radius={radiusMeters}
          pathOptions={{
            color: '#2563eb',
            weight: 2,
            fillColor: '#60a5fa',
            fillOpacity: 0.12,
          }}
        />
      )}
      {marker && <Marker position={[marker.lat, marker.lng]} />}
    </MapContainer>
  );
}
