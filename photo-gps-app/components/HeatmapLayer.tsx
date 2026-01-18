import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet.heat"

// Extend Leaflet type to include heatLayer
declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number
      blur?: number
      maxZoom?: number
      max?: number
      minOpacity?: number
      gradient?: { [key: number]: string }
    }
  ): L.Layer
}

interface HeatmapLayerProps {
  points: [number, number, number][] // [latitude, longitude, intensity]
  options?: {
    radius?: number
    blur?: number
    maxZoom?: number
    max?: number
    minOpacity?: number
    gradient?: { [key: number]: string }
  }
}

export default function HeatmapLayer({ points, options }: HeatmapLayerProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || points.length === 0) return

    // Create heatmap layer
    const heatLayer = L.heatLayer(points, {
      radius: options?.radius || 25,
      blur: options?.blur || 15,
      maxZoom: options?.maxZoom || 17,
      max: options?.max || 1.0,
      minOpacity: options?.minOpacity || 0.5,
      gradient: options?.gradient || {
        0.0: "blue",
        0.5: "lime",
        0.7: "yellow",
        1.0: "red",
      },
    })

    // Add layer to map
    heatLayer.addTo(map)

    // Cleanup function to remove layer when component unmounts
    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, points, options])

  return null
}
