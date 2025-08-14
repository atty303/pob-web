import { useAuth0 } from "@auth0/auth0-react";
import {
  ArrowRightEndOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  ArrowsPointingOutIcon,
  Bars3Icon,
  HomeIcon,
  LightBulbIcon,
  PresentationChartLineIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import type { LayerStats, RenderStats } from "pob-driver/src/js/renderer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import * as use from "react-use";
import type { Games } from "../routes/_game";
import PoBWindow from "./PoBWindow";

const { useTimeoutFn, useLocalStorage, useFullscreen, useTitle } = use;

export default function PoBController(p: { game: keyof Games; version: string; isHead: boolean }) {
  const [title, setTitle] = useState<string>();
  useTitle(title ?? "pob.cool");

  const container = useRef<HTMLDivElement>(null);

  const [optOutTutorial, setOptOutTutorial] = useLocalStorage("optOutTutorial", false);
  const [tutorial, setTutorial] = useState(true);
  useTimeoutFn(() => {
    setTutorial(false);
    setNotFirstVisit(true);
  }, 3000);

  const [notFirstVisit, setNotFirstVisit] = useLocalStorage("notFirstVisit", false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    if (!notFirstVisit) {
      setDrawer(true);
    }
  }, [notFirstVisit]);

  const [frames, setFrames] = useState<{ at: number; renderTime: number }[]>([]);
  const [renderStats, setRenderStats] = useState<RenderStats | null>(null);
  const [layerVisibilityCallback, setLayerVisibilityCallback] = useState<
    ((layer: number, sublayer: number, visible: boolean) => void) | null
  >(null);

  const pushFrame = useCallback((at: number, time: number, stats?: RenderStats) => {
    setFrames(frames => [...frames, { at, renderTime: time }].slice(-60));
    if (stats) {
      setRenderStats(stats);
    }
  }, []);

  const handleLayerVisibilityCallbackReady = useCallback(
    (callback: (layer: number, sublayer: number, visible: boolean) => void) => {
      setLayerVisibilityCallback(() => callback);
    },
    [],
  );

  const [showPerformance, setShowPerformance] = useLocalStorage("showPerformance", false);

  const [fullscreen, setFullscreen] = useState(false);
  useFullscreen(container, fullscreen, { onClose: () => setFullscreen(false) });

  return (
    <div ref={container} className="drawer">
      <input
        id="drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={drawer}
        onChange={e => setDrawer(e.target.checked)}
      />
      <div className="drawer-content">
        <div className="relative l-lvw h-lvh">
          <div className="absolute top-0 left-0 right-0 bottom-0">
            <PoBWindow
              game={p.game}
              version={p.version}
              onFrame={pushFrame}
              onTitleChange={setTitle}
              onLayerVisibilityCallbackReady={handleLayerVisibilityCallbackReady}
            />
          </div>
          <div className="absolute top-2 right-2">
            <span
              className="not-data-tutorial:invisible data-tutorial:inline-block data-tutorial:animate-bounce"
              data-tutorial={(tutorial && !optOutTutorial) || null}
            >
              <div
                className="tooltip tooltip-open tooltip-left tooltip-info"
                data-tip="Use this button to open the menu"
              />
            </span>
            <label className="btn btn-circle btn-primary opacity-75" htmlFor="drawer">
              <Bars3Icon className="size-6" />
            </label>
          </div>
          {showPerformance && (
            <div className="absolute bottom-2 right-2">
              <PerformanceView
                frames={frames}
                renderStats={renderStats}
                onLayerVisibilityChange={layerVisibilityCallback}
              />
            </div>
          )}
        </div>
      </div>
      <Sidebar
        game={p.game}
        isHead={p.isHead}
        setDrawer={setDrawer}
        fullscreen={fullscreen}
        setFullscreen={setFullscreen}
        showPerformance={showPerformance}
        setShowPerformance={setShowPerformance}
        optOutTutorial={optOutTutorial}
        setOptOutTutorial={setOptOutTutorial}
      />
    </div>
  );
}

function Sidebar(p: {
  game: keyof Games;
  isHead: boolean;
  setDrawer: (value: boolean) => void;
  fullscreen: boolean;
  setFullscreen: (value: boolean) => void;
  showPerformance: boolean | undefined;
  setShowPerformance: (value: boolean) => void;
  optOutTutorial: boolean | undefined;
  setOptOutTutorial: (value: boolean) => void;
}) {
  return (
    <div className="drawer-side">
      <label htmlFor="drawer" aria-label="close sidebar" className="drawer-overlay" />
      <div className="min-h-full h-dvh bg-base-200 text-base-content w-80 grid grid-cols-1 grid-rows-[auto_1fr_auto_auto]">
        <header className="flex items-center gap-2 p-4">
          <img className="w-6 h-6 rounded-box" src="/favicon.png" alt="" />
          <span className="text-xl font-['Poiret_One'] ">pob.cool</span>
          <span className="flex-1 text-right">
            <button className="btn btn-circle btn-xs btn-ghost" type="button" onClick={() => p.setDrawer(false)}>
              <XMarkIcon className="size-6" />
            </button>
          </span>
        </header>
        <ul className="menu w-full">
          <ul className="menu w-full">
            <li className="pointer-events-none bg-base-300">
              <Auth tutorial={!p.optOutTutorial} />
            </li>
          </ul>
          <li className="menu-title mt-2">Navigation</li>
          <li>
            <Link to="/">
              <HomeIcon className="size-4" /> Return to home
            </Link>
          </li>
          <li className={p.isHead ? "menu-disabled" : undefined}>
            <Link to={`/${p.game}/`}>
              <ArrowUpIcon className="size-4" /> Change to latest version
            </Link>
          </li>
          <li className="menu-title">Preferences</li>
          <li>
            <label htmlFor="fullscreen" className="flex">
              <span className="flex-1 flex items-center gap-2">
                <ArrowsPointingOutIcon className="size-4" />
                Fullscreen
              </span>
              <input
                id="fullscreen"
                type="checkbox"
                className="toggle"
                checked={p.fullscreen}
                onChange={e => p.setFullscreen(e.target.checked)}
              />
            </label>
          </li>
          <li>
            <label htmlFor="showPerformance" className="flex">
              <span className="flex-1 flex items-center gap-2">
                <PresentationChartLineIcon className="size-4" />
                Show performance overlay
              </span>
              <input
                id="showPerformance"
                type="checkbox"
                className="toggle"
                checked={p.showPerformance}
                onChange={e => p.setShowPerformance(e.target.checked)}
              />
            </label>
          </li>
          <li>
            <label htmlFor="optOutTutorial" className="flex">
              <span className="flex-1 flex items-center gap-2">
                <LightBulbIcon className="size-4" />
                Show tutorial
              </span>
              <input
                id="optOutTutorial"
                type="checkbox"
                className="toggle"
                checked={!p.optOutTutorial}
                onChange={e => p.setOptOutTutorial(!e.target.checked)}
              />
            </label>
          </li>
        </ul>
        <footer className="footer gap-2 p-4 border-t border-base-content/50 text-base-content/50">
          <span className="block">
            Web site version is {APP_VERSION}
            <a
              href={`https://github.com/atty303/pob-web/blob/v${APP_VERSION}/CHANGELOG.md`}
              target="_blank"
              rel="noreferrer"
              className="link inline-flex items-center ml-2"
            >
              (ChangeLog
              <ArrowTopRightOnSquareIcon className="size-4" />)
            </a>
          </span>
          <p>This product isn't affiliated with or endorsed by Grinding Gear Games in any way.</p>
          <aside>
            <p>
              © 2025 Koji AGAWA (
              <a className="link" href="https://x.com/atty303" target="_blank" rel="noreferrer">
                @atty303
              </a>
              )
            </p>
          </aside>
        </footer>
      </div>
    </div>
  );
}

function Auth(p: { tutorial: boolean }) {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="place-content-center p-2">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  } else if (isAuthenticated) {
    return (
      <div>
        <UserCircleIcon className="size-6" />
        {user?.name}
        <button className="btn btn-primary pointer-events-auto" type="button" onClick={() => logout()}>
          <ArrowRightStartOnRectangleIcon className="size-4" />
          Logout
        </button>
      </div>
    );
  } else {
    return (
      <div
        className={`tooltip tooltip-right tooltip-info ${p.tutorial && "tooltip-open"}`}
        data-tip="You can save your builds to the cloud by logging in."
      >
        <button
          className="btn btn-primary btn-block pointer-events-auto"
          type="button"
          onClick={() => loginWithRedirect()}
        >
          <ArrowRightEndOnRectangleIcon className="size-4" />
          Login
        </button>
      </div>
    );
  }
}

function PerformanceView(p: {
  frames: { at: number; renderTime: number }[];
  renderStats: RenderStats | null;
  onLayerVisibilityChange: ((layer: number, sublayer: number, visible: boolean) => void) | null;
}) {
  return (
    <div className="bg-base-100 p-2 rounded-box opacity-75 space-y-2 max-w-80">
      <LineChart data={p.frames} />
      {p.renderStats && <RenderStatsView stats={p.renderStats} onLayerVisibilityChange={p.onLayerVisibilityChange} />}
    </div>
  );
}

function RenderStatsView(p: {
  stats: RenderStats | null;
  onLayerVisibilityChange: ((layer: number, sublayer: number, visible: boolean) => void) | null;
}) {
  const [showLayers, setShowLayers] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<Map<string, boolean>>(new Map());

  if (!p.stats) {
    return null;
  }

  const summary = {
    totalLayers: p.stats.totalLayers,
    totalDrawImage: p.stats.layerStats.reduce((sum, layer) => sum + layer.drawImageCount, 0),
    totalDrawImageQuad: p.stats.layerStats.reduce((sum, layer) => sum + layer.drawImageQuadCount, 0),
    totalDrawString: p.stats.layerStats.reduce((sum, layer) => sum + layer.drawStringCount, 0),
    frameTime: p.stats.lastFrameTime.toFixed(1),
    frameCount: p.stats.frameCount,
  };
  const layerDetails = p.stats.layerStats;

  const totalDrawCalls = summary.totalDrawImage + summary.totalDrawImageQuad + summary.totalDrawString;

  const toggleLayerVisibility = (layer: number, sublayer: number) => {
    const layerKey = `${layer}.${sublayer}`;
    const currentVisibility = layerVisibility.get(layerKey) ?? true;
    const newVisibility = !currentVisibility;

    setLayerVisibility(prev => {
      const newMap = new Map(prev);
      newMap.set(layerKey, newVisibility);
      return newMap;
    });

    p.onLayerVisibilityChange?.(layer, sublayer, newVisibility);
  };

  return (
    <div className="text-xs space-y-2">
      <div className="font-semibold">Render Stats (Frame #{summary.frameCount})</div>
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <div>Layers: {summary.totalLayers}</div>
        <div>Frame: {summary.frameTime}ms</div>
        <div>Total draws: {totalDrawCalls}</div>
        <div>Images: {summary.totalDrawImage}</div>
        <div>Quads: {summary.totalDrawImageQuad}</div>
        <div>Text: {summary.totalDrawString}</div>
      </div>

      {layerDetails.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setShowLayers(!showLayers)}
            className="font-semibold text-[10px] hover:bg-base-200 px-1 rounded cursor-pointer"
          >
            Layers {showLayers ? "▼" : "▶"}
          </button>
          {showLayers && (
            <div className="max-h-24 overflow-y-auto space-y-0.5">
              {layerDetails.map((layer: LayerStats, index: number) => {
                const layerTotal = layer.drawImageCount + layer.drawImageQuadCount + layer.drawStringCount;
                if (layerTotal === 0) return null;

                const layerKey = `${layer.layer}.${layer.sublayer}`;
                const isVisible = layerVisibility.get(layerKey) ?? true;

                return (
                  <div key={layerKey} className="text-[9px] font-mono flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleLayerVisibility(layer.layer, layer.sublayer)}
                      className={`w-3 h-3 text-[8px] border rounded ${
                        isVisible ? "bg-green-500 text-white" : "bg-red-500 text-white"
                      }`}
                    >
                      {isVisible ? "●" : "○"}
                    </button>
                    <span className={isVisible ? "" : "opacity-50"}>
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

function LineChart(p: { data: { at: number; renderTime: number }[] }) {
  const scaleX = 1;
  const scaleY = 1;

  const chart = useMemo(() => {
    const ats = p.data.map(_ => _.at);
    const renderTimes = p.data.map(_ => _.renderTime);
    const minX = Math.min(...ats);
    const maxX = Math.max(...ats);
    const minY = 0;
    const maxY = Math.max(...renderTimes);

    const series = p.data.reduce(
      (acc, value, index) => {
        if (index > 0) {
          acc.push({
            x1: p.data[index - 1].at,
            y1: maxY - p.data[index - 1].renderTime,
            x2: p.data[index].at,
            y2: maxY - p.data[index].renderTime,
          });
        }
        return acc;
      },
      [] as { x1: number; y1: number; x2: number; y2: number }[],
    );
    return {
      svg: (
        <svg
          className="absolute top-0 left-0 w-full h-full bg-neutral text-neutral-content border border-neutral-content py-2"
          viewBox={
            p.data.length > 0
              ? `${minX * scaleX} ${minY * scaleY} ${(maxX - minX) * scaleX} ${(maxY - minY) * scaleY}`
              : "0 0 0 0"
          }
          preserveAspectRatio="none"
        >
          <title>Render performance</title>
          {series.map(_ => (
            <line
              key={_.x1}
              x1={_.x1 * scaleX}
              y1={_.y1 * scaleY}
              x2={_.x2 * scaleX}
              y2={_.y2 * scaleY}
              stroke="currentColor"
              strokeWidth="2"
            />
          ))}
        </svg>
      ),
      max: maxY,
      avg: renderTimes.reduce((acc, value) => acc + value, 0) / renderTimes.length,
    };
  }, [p.data]);

  return (
    <div className="relative w-64 h-16">
      {chart.svg}
      {Number.isFinite(chart.max) && (
        <span className="absolute bottom-1 left-1 p-1 badge-xs badge-neutral">
          Max {chart.max.toFixed(1)}ms Avg {chart.avg.toFixed(1)}ms
        </span>
      )}
    </div>
  );
}
