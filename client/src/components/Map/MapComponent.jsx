import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

// Fix for Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to handle view changes
const MapViewHandler = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom || 13, { animate: false });
        }
    }, [center, zoom, map]);
    return null;
};

const MapComponent = ({ onAreaSelected, selectedArea, baseAOI, mapCenter, mapZoom, analysisResults }) => {
    const featureGroupRef = useRef();

    // World polygon coordinates (outer ring)
    const worldCoords = [
        [90, -180],
        [90, 180],
        [-90, 180],
        [-90, -180]
    ];

    const _onCreate = (e) => {
        const { layer } = e;

        // Validation: Check if the drawn shape is strictly within the AOI
        if (baseAOI && Array.isArray(baseAOI)) {
            const bounds = layer.getBounds();
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const nw = L.latLng(ne.lat, sw.lng);
            const se = L.latLng(sw.lat, ne.lng);

            // Convert baseAOI [{lat, lng}] to [[lat, lng]] for the helper
            const aoiPolygon = baseAOI.map(p => [p.lat, p.lng]);

            // Check all 4 corners
            const corners = [
                [ne.lat, ne.lng],
                [nw.lat, nw.lng],
                [se.lat, se.lng],
                [sw.lat, sw.lng]
            ];

            const isInside = corners.every(point => isPointInPolygon(point, aoiPolygon));

            if (!isInside) {
                // Remove the invalid layer
                if (featureGroupRef.current) {
                    featureGroupRef.current.removeLayer(layer);
                }
                alert("Selection must be strictly within the highlighted Area of Interest.");
                return;
            }
        }

        // Remove all other layers to enforce single polygon
        if (featureGroupRef.current) {
            featureGroupRef.current.clearLayers();
            featureGroupRef.current.addLayer(layer);
        }

        const bounds = layer.getBounds();
        const coordinates = {
            ne: bounds.getNorthEast(),
            sw: bounds.getSouthWest()
        };

        onAreaSelected(coordinates);
    };

    const _onEdited = (e) => {
        // Handle edits if needed, getting the first layer
        e.layers.eachLayer(layer => {
            const bounds = layer.getBounds();
            onAreaSelected({
                ne: bounds.getNorthEast(),
                sw: bounds.getSouthWest()
            });
        });
    };

    // Calculate mask polygon using BASE AOI (Always highlight the main AOI)
    const getMaskPositions = () => {
        if (!baseAOI) return null;

        let hole = [];

        // Base AOI is likely an array of [{lat, lng}]
        if (Array.isArray(baseAOI)) {
            hole = baseAOI.map(p => [p.lat, p.lng]);
        } else {
            return null;
        }

        return [worldCoords, hole];
    };

    const maskPositions = getMaskPositions();

    // Helper to get positions for the Green AOI Polygon display
    const getAOIPositions = () => {
        if (Array.isArray(baseAOI)) {
            return baseAOI.map(p => [p.lat, p.lng]);
        }
        return null;
    };

    const aoiPositions = getAOIPositions();

    // Helper to get selected area positions (The dynamic user drawing)
    const getSelectedPositions = () => {
        if (!selectedArea) return null;
        // If selectedArea is the same as baseAOI (initial state), don't draw it twice
        if (selectedArea === baseAOI) return null;

        if (Array.isArray(selectedArea)) {
            return selectedArea.map(p => [p.lat, p.lng]);
        }
        // If it's a rectangle object, we let the FeatureGroup handle it? 
        // No, FeatureGroup handles the EDITABLE shape. 
        // We just need to ensure `selectedArea` stays highlighted if it's passed back.
        // Actually, FeatureGroup will contain the layer if we are drawing.
        // But if we persist the state, we might want to show it.
        // For now, let's trust the FeatureGroup EditControl for the DRAWN shape, 
        // and just use this logic for the AOI.
        return null;
    };

    // Calculate maxBounds based on selectedArea
    const getMaxBounds = () => {
        if (!selectedArea) return null;

        let bounds;
        if (Array.isArray(selectedArea)) {
            // Polygon - calculate bounds
            if (selectedArea.length > 0) {
                const lats = selectedArea.map(p => p.lat);
                const lngs = selectedArea.map(p => p.lng);
                const minLat = Math.min(...lats);
                const maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs);
                const maxLng = Math.max(...lngs);

                // Add 50% buffer
                const latBuffer = (maxLat - minLat) * 0.5;
                const lngBuffer = (maxLng - minLng) * 0.5;

                bounds = [
                    [minLat - latBuffer, minLng - lngBuffer],
                    [maxLat + latBuffer, maxLng + lngBuffer]
                ];
            }
        } else if (selectedArea.ne && selectedArea.sw) {
            // Rectangle
            const minLat = Math.min(selectedArea.sw.lat, selectedArea.ne.lat);
            const maxLat = Math.max(selectedArea.sw.lat, selectedArea.ne.lat);
            const minLng = Math.min(selectedArea.sw.lng, selectedArea.ne.lng);
            const maxLng = Math.max(selectedArea.sw.lng, selectedArea.ne.lng);

            const latBuffer = (maxLat - minLat) * 0.5;
            const lngBuffer = (maxLng - minLng) * 0.5;

            bounds = [
                [minLat - latBuffer, minLng - lngBuffer],
                [maxLat + latBuffer, maxLng + lngBuffer]
            ];
        }

        return bounds || [[-90, -180], [90, 180]];
    };

    const maxBounds = getMaxBounds();

    return (
        <div className="h-full w-full z-0">
            <MapContainer
                center={[20, 0]}
                zoom={2}
                minZoom={2}
                scrollWheelZoom={true}
                className="h-full w-full"
                maxBounds={maxBounds}
                maxBoundsViscosity={1.0}
                zoomAnimation={false}
                fadeAnimation={false}
                markerZoomAnimation={false}
            >
                <MapViewHandler center={mapCenter} zoom={mapZoom} />

                {/* Satellite Tile Layer - fadeAnimation disabled */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    keepBuffer={2}
                    updateWhenIdle={false}
                />

                {/* Mask Overlay - Dims the non-selected area */}
                {maskPositions && (
                    <Polygon
                        positions={maskPositions}
                        pathOptions={{
                            color: 'transparent',
                            fillColor: '#000',
                            fillOpacity: 0.7
                        }}
                    />
                )}

                {/* AOI Outline - Show the green border for hardcoded area */}
                {aoiPositions && (
                    <Polygon
                        positions={aoiPositions}
                        pathOptions={{
                            color: '#22c55e',
                            weight: 2,
                            fillOpacity: 0.1
                        }}
                    />
                )}

                <FeatureGroup ref={featureGroupRef}>
                    <EditControl
                        position="topright"
                        onCreated={_onCreate}
                        onEdited={_onEdited}
                        draw={{
                            rectangle: {
                                shapeOptions: {
                                    color: "#22c55e",
                                    weight: 2,
                                    fillOpacity: 0.1
                                },
                                showArea: false
                            },
                            polyline: false,
                            polygon: false,
                            circle: false,
                            circlemarker: false,
                            marker: false
                        }}
                    />
                </FeatureGroup>

                {analysisResults?.deforestation_geojson?.features?.length > 0 && (
                    <GeoJSON
                        key={JSON.stringify(analysisResults.deforestation_geojson)}
                        data={analysisResults.deforestation_geojson}
                        style={{
                            color: '#dc2626',
                            weight: 2,
                            fillColor: '#dc2626',
                            fillOpacity: 0.4
                        }}
                    />
                )}
            </MapContainer>
        </div>
    );
};

// Ray-casting algorithm to check if point is in polygon
// point: [lat, lng], vs: [[lat, lng], ...]
function isPointInPolygon(point, vs) {
    var x = point[0], y = point[1];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

export default MapComponent;

// feat(map): add polygon drawing with react-leaflet-draw

// fix(map): correct tile layer URL for Satellite view

// feat(map): add satellite/street view toggle

// fix(map): prevent draw tool double-initialization

// feat(map): add measurement tool for drawn polygons

// polygon drawing with react-leaflet-draw

// fix tile URL Satellite view

// satellite/street view toggle
