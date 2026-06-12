"use client";

import React from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Card, Spin } from 'antd';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629
};

const MapComponent = ({ 
  apiKey, 
  center = defaultCenter, 
  markers = [], 
  zoom = 5,
  title = "Location Map" 
}) => {
  
  if (!apiKey) {
    return (
      <Card title={title}>
        <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
          <p>Please provide a valid Google Maps API Key to view the map.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title={title}>
      <LoadScript googleMapsApiKey={apiKey}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={zoom}
        >
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={marker.position}
              title={marker.title}
              onClick={() => marker.onClick && marker.onClick()}
            />
          ))}
        </GoogleMap>
      </LoadScript>
    </Card>
  );
};

export default MapComponent;
