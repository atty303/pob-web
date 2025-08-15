import type React from "react";
import { useCallback, useMemo, useState } from "react";

export interface FrameData {
  at: number;
  renderTime: number;
}

export interface LayerStats {
  layer: number;
  sublayer: number;
  totalCommands: number;
  drawImageCount: number;
  drawImageQuadCount: number;
  drawStringCount: number;
}

export interface RenderStats {
  totalLayers: number;
  layerStats: LayerStats[];
  lastFrameTime: number;
  frameCount: number;
}

interface PerformanceOverlayProps {
  isVisible: boolean;
  frames: FrameData[];
  renderStats: RenderStats | null;
  onLayerVisibilityChange?: (layer: number, sublayer: number, visible: boolean) => void;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  isVisible,
  frames,
  renderStats,
  onLayerVisibilityChange,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="pw:absolute pw:bottom-2 pw:right-2 pw:bg-base-100/90 pw:p-3 pw:rounded pw:backdrop-blur-sm pw:space-y-2 pw:max-w-80 pw:pointer-events-auto">
      <LineChart data={frames} />
      {renderStats && <RenderStatsView stats={renderStats} onLayerVisibilityChange={onLayerVisibilityChange} />}
    </div>
  );
};

function LineChart({ data }: { data: FrameData[] }) {
  const scaleX = 1;
  const scaleY = 1;

  const chart = useMemo(() => {
    if (data.length === 0) {
      return {
        svg: null,
        max: 0,
        avg: 0,
      };
    }

    const ats = data.map(_ => _.at);
    const renderTimes = data.map(_ => _.renderTime);
    const minX = Math.min(...ats);
    const maxX = Math.max(...ats);
    const minY = 0;
    const maxY = Math.max(...renderTimes);

    const series = data.reduce(
      (acc, value, index) => {
        if (index > 0) {
          acc.push({
            x1: data[index - 1].at,
            y1: maxY - data[index - 1].renderTime,
            x2: data[index].at,
            y2: maxY - data[index].renderTime,
          });
        }
        return acc;
      },
      [] as { x1: number; y1: number; x2: number; y2: number }[],
    );

    return {
      svg: (
        <svg
          className="pw:absolute pw:top-0 pw:left-0 pw:w-full pw:h-full pw:bg-neutral pw:text-neutral-content pw:border pw:border-neutral-content pw:py-2"
          viewBox={`${minX * scaleX} ${minY * scaleY} ${(maxX - minX) * scaleX} ${(maxY - minY) * scaleY}`}
          preserveAspectRatio="none"
        >
          <title>Render performance</title>
          {series.map((line, index) => (
            <line
              key={`${line.x1}-${index}`}
              x1={line.x1 * scaleX}
              y1={line.y1 * scaleY}
              x2={line.x2 * scaleX}
              y2={line.y2 * scaleY}
              stroke="currentColor"
              strokeWidth="2"
            />
          ))}
        </svg>
      ),
      max: maxY,
      avg: renderTimes.reduce((acc, value) => acc + value, 0) / renderTimes.length,
    };
  }, [data]);

  return (
    <div className="pw:relative pw:w-64 pw:h-16">
      {chart.svg}
      {Number.isFinite(chart.max) && (
        <span className="pw:absolute pw:bottom-1 pw:left-1 pw:p-1 pw:text-xs pw:bg-neutral pw:text-neutral-content pw:rounded">
          Max {chart.max.toFixed(1)}ms Avg {chart.avg.toFixed(1)}ms
        </span>
      )}
    </div>
  );
}

function RenderStatsView({
  stats,
  onLayerVisibilityChange,
}: {
  stats: RenderStats | null;
  onLayerVisibilityChange?: (layer: number, sublayer: number, visible: boolean) => void;
}) {
  const [showLayers, setShowLayers] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<Map<string, boolean>>(new Map());

  if (!stats) {
    return null;
  }

  const summary = {
    totalLayers: stats.totalLayers,
    totalDrawImage: stats.layerStats.reduce((sum, layer) => sum + layer.drawImageCount, 0),
    totalDrawImageQuad: stats.layerStats.reduce((sum, layer) => sum + layer.drawImageQuadCount, 0),
    totalDrawString: stats.layerStats.reduce((sum, layer) => sum + layer.drawStringCount, 0),
    frameTime: stats.lastFrameTime.toFixed(1),
    frameCount: stats.frameCount,
  };
  const layerDetails = stats.layerStats;

  const totalDrawCalls = summary.totalDrawImage + summary.totalDrawImageQuad + summary.totalDrawString;

  const toggleLayerVisibility = useCallback(
    (layer: number, sublayer: number) => {
      const layerKey = `${layer}.${sublayer}`;
      const currentVisibility = layerVisibility.get(layerKey) ?? true;
      const newVisibility = !currentVisibility;

      setLayerVisibility(prev => {
        const newMap = new Map(prev);
        newMap.set(layerKey, newVisibility);
        return newMap;
      });

      onLayerVisibilityChange?.(layer, sublayer, newVisibility);
    },
    [layerVisibility, onLayerVisibilityChange],
  );

  return (
    <div className="pw:text-xs pw:space-y-2">
      <div className="pw:font-semibold">Render Stats (Frame #{summary.frameCount})</div>
      <div className="pw:grid pw:grid-cols-2 pw:gap-1 pw:text-xs">
        <div>Layers: {summary.totalLayers}</div>
        <div>Frame: {summary.frameTime}ms</div>
        <div>Total draws: {totalDrawCalls}</div>
        <div>Images: {summary.totalDrawImage}</div>
        <div>Quads: {summary.totalDrawImageQuad}</div>
        <div>Text: {summary.totalDrawString}</div>
      </div>

      {layerDetails.length > 0 && (
        <div className="pw:space-y-1">
          <button
            type="button"
            onClick={() => setShowLayers(!showLayers)}
            className="pw:font-semibold pw:text-xs pw:hover:bg-base-200 pw:px-1 pw:rounded pw:cursor-pointer"
          >
            Layers {showLayers ? "▼" : "▶"}
          </button>
          {showLayers && (
            <div className="pw:max-h-24 pw:overflow-y-auto pw:space-y-0.5">
              {layerDetails.map((layer: LayerStats) => {
                const layerTotal = layer.drawImageCount + layer.drawImageQuadCount + layer.drawStringCount;
                if (layerTotal === 0) return null;

                const layerKey = `${layer.layer}.${layer.sublayer}`;
                const isVisible = layerVisibility.get(layerKey) ?? true;

                return (
                  <div key={layerKey} className="pw:text-xs pw:font-mono pw:flex pw:items-center pw:gap-1">
                    <button
                      type="button"
                      onClick={() => toggleLayerVisibility(layer.layer, layer.sublayer)}
                      className={`pw:w-3 pw:h-3 pw:text-xs pw:border pw:rounded ${
                        isVisible ? "pw:bg-green-500 pw:text-white" : "pw:bg-red-500 pw:text-white"
                      }`}
                    >
                      {isVisible ? "●" : "○"}
                    </button>
                    <span className={isVisible ? "" : "pw:opacity-50"}>
                      L{layer.layer}.{layer.sublayer}: {layer.totalCommands}c {layerTotal}d (I{layer.drawImageCount} Q
                      {layer.drawImageQuadCount} T{layer.drawStringCount})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
