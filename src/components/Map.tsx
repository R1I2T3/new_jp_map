/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import jpData from "../assets/data.json";
import { Plus, Minus } from "lucide-react";
import { Button } from "./ui/button";
import { UserLocation } from "./user-location";
import { useMap, useMapEvents } from "react-leaflet";
import MarkerInfo from "./MarkerInfo";

import FirstAidStation from "../assets/map-icons/mapicon_aidstation.png";
import ATMIcon from "../assets/map-icons/mapicon_atm.png";
import MapIconAttraction from "../assets/map-icons/mapicon_attraction.png";
import BicyclePark from "../assets/map-icons/mapicon_bicycleparking.png";
import CoinLockers from "../assets/map-icons/mapicon_coinlocker.png";
import MapEvent from "../assets/map-icons/mapicon_event.png";
import MapGate from "../assets/map-icons/mapicon_gate.png";
import ToiletIcon from "../assets/map-icons/mapicon_multipurposetoilet.png";
import NursingHome from "../assets/map-icons/mapicon_nursingroom.png";
import RestRoom from "../assets/map-icons/mapicon_restroom.png";
import SeatGuide from "../assets/map-icons/mapicon_smokingarea.png";
import TaxiArea from "../assets/map-icons/mapicon_taxi.png";
import TicketCounter from "../assets/map-icons/mapicon_ticket.png";
import WaterStation from "../assets/map-icons/mapicon_waterstation.png";
import WestCourseShuttle from "../assets/map-icons/mapicon_westcourceshuttlestop.png";
import MapIcon from "../assets/map-icons/mapicon_.png";
import MapIconCar from "../assets/map-icons/mapicon_car.png";
import MapIconSmoking from "../assets/map-icons/mapicon_smokingarea.png";

const ICONS = {
  Ticket: TicketCounter,
  Attraction: MapIconAttraction,
  Gate: MapGate,
  Taxi: TaxiArea,
  Car: MapIconCar,
  Bus: WestCourseShuttle,
  Event: MapEvent,
  Information: MapIconAttraction,
  "Seating Area": SeatGuide,
  "First Aid": FirstAidStation,
  Smoking: MapIconSmoking,
  Restaurant: MapIconAttraction,
  ATM: ATMIcon,
  "Bicycle Parking": BicyclePark,
  "Nursing Room": NursingHome,
  "Multi-purpose Toilet": RestRoom,
  "Coin Lockers": CoinLockers,
  "Water Station": WaterStation,
  Toilet: ToiletIcon,
  "West Course Shuttle": WestCourseShuttle,
  Parking: MapIconCar,
  "Official Goods": MapIconAttraction,
};

interface MapItem {
  "Icon Category": string;
  "Article Format": string;
  "Zoom Level": "Low" | "Medium" | "High";
  Title: string;
  "Sub Title": string;
  "Article Content": string;
  "Line Button Text (If Area Introduction format)": string;
  "Line Button URL": string;
  "Top Image": string;
  Locations: string;
  "Is Location Check Done?": string;
  Remarks: string;
}

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const LoadJSONAndProcess = (): MapItem[] => {
  const data = jpData as MapItem[];
  return data;
};

const ZoomControl = () => {
  const map = useMap();
  const ZOOM_LEVELS = [13, 15, 19];

  const zoomIn = () => {
    const currentZoom = map.getZoom();
    const currentIndex = ZOOM_LEVELS.indexOf(currentZoom);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    map.setZoom(ZOOM_LEVELS[nextIndex]);
  };

  const zoomOut = () => {
    const currentZoom = map.getZoom();
    const currentIndex = ZOOM_LEVELS.indexOf(currentZoom);
    const prevIndex = Math.max(currentIndex - 1, 0);
    map.setZoom(ZOOM_LEVELS[prevIndex]);
  };

  return (
    <div className="flex flex-col gap-2 absolute bottom-[13rem] right-10 z-[1000]">
      <Button onClick={zoomIn} aria-label="Zoom in">
        <Plus size={15} />
      </Button>
      <Button onClick={zoomOut} aria-label="Zoom out">
        <Minus size={15} />
      </Button>
    </div>
  );
};

const CurrentLocationButton = ({
  userPosition,
}: {
  userPosition: [number, number] | null;
}) => {
  const map = useMap();

  const centerOnUser = () => {
    if (!userPosition) {
      alert("Location not yet available. Please wait or enable tracking.");
      return;
    }
    map.setView(userPosition, 16);
  };

  return (
    <div
      onClick={centerOnUser}
      className="absolute bottom-[18rem] right-10 z-[1000] bg-white p-2 rounded-full shadow-md cursor-pointer text-black hover:bg-black hover:text-white active:bg-black active:text-white"
      title="Center on my current location"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
  );
};

const Map: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null
  );
  const [selectedMarker, setSelectedMarker] = useState<MapItem | null>(null);
  const processedData: MapItem[] = LoadJSONAndProcess();

  useEffect(() => {
    setIsClient(true);

    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserPosition([latitude, longitude]);
        setShowUserLocation(true);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Unable to track your location: ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Permission denied.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "The request timed out.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
        }
        console.warn(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const getMarkerIcon = (category: string) => {
    const iconSrc = ICONS[category as keyof typeof ICONS] || MapIcon;
    return new L.Icon({
      iconUrl: iconSrc.src,
      iconSize: [25, 40],
      iconAnchor: [12.5, 40],
      popupAnchor: [0, -40],
    });
  };

  const handleMarkerClick = (item: MapItem) => {
    if (item["Article Format"] !== "Pin" && item["Article Content"] !== "-") {
      setSelectedMarker(item);
    }
  };
  const handleBack = () => {
    setSelectedMarker(null);
  };

  const MapEvents = () => {
    const map = useMapEvents({
      zoomend: () => {
        const newZoom = map.getZoom();
        setZoomLevel(newZoom);
        console.log(`Zoom level changed to: ${newZoom}`);
      },
    });
    return null;
  };

  if (!isClient) return <div>Loading map...</div>;

  return (
    <div className="relative w-full h-screen">
      {/* Map Container */}
      <div
        className={`w-full h-full transition-opacity duration-300 ${
          selectedMarker ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <MapContainer
          center={[34.8468125, 136.5383125]}
          zoom={15}
          minZoom={13}
          maxZoom={19}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          {processedData.map((item: MapItem, index: number) => {
            if (!item.Locations || typeof item.Locations !== "string") {
              console.warn(
                `${item.Title} has missing or invalid coordinates: ${item.Locations}`
              );
              return null;
            }

            const [lat, lng] = item.Locations.replace(/[()]/g, "")
              .split(",")
              .map(Number);

            if (isNaN(lat) || isNaN(lng)) {
              console.warn(
                `${item.Title} has invalid coordinate format: ${item.Locations}`
              );
              return null;
            }

            if (zoomLevel < 15) {
              console.log(
                `Filtered out ${item.Title} at zoom ${zoomLevel} (< 15)`
              );
              return null;
            } else if (zoomLevel >= 15 && zoomLevel < 19) {
              if (item["Zoom Level"] !== "Medium") {
                console.log(
                  `Filtered out ${item.Title} at zoom ${zoomLevel} (not Medium)`
                );
                return null;
              }
            }

            return (
              <Marker
                key={`${item.Title}-${index}`}
                position={[lat, lng]}
                icon={getMarkerIcon(item["Icon Category"])}
                eventHandlers={{
                  click: () => handleMarkerClick(item),
                }}
              />
            );
          })}
          <UserLocation
            mapWidth={1770}
            mapHeight={2400}
            isVisible={showUserLocation}
            position={userPosition}
          />
          <ZoomControl />
          <CurrentLocationButton userPosition={userPosition} />
          <MapEvents />
        </MapContainer>
      </div>

      {/* Marker Info Overlay */}
      {selectedMarker && (
        <div className="absolute inset-0 z-[2000] overflow-auto">
          <MarkerInfo item={selectedMarker} onBack={handleBack} />
        </div>
      )}

      <style jsx global>{`
        .leaflet-container {
          z-index: 0 !important;
        }
        .leaflet-pane,
        .leaflet-top,
        .leaflet-bottom {
          z-index: 0 !important;
        }
      `}</style>
    </div>
  );
};

export default Map;
