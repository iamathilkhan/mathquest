"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ArtImage } from "@/components/ArtImage";
import { HeroPortrait } from "@/components/HeroPortrait";
import { generateIsland, renderIsland } from "@/lib/map/island";
import { MAP_GRAPH } from "@/data/layout";
import { shortestPath } from "@/lib/map/pathfinding";
import { buildRoute, positionAt, durationMs } from "@/lib/map/travel";
import { isRealmUnlocked, lockReason } from "@/lib/game/unlock";
import { useGameStore } from "@/store/gameStore";
import { getRealm, default as REALMS } from "@/data/curriculum";
import type { Player } from "@/lib/schemas";
import type { RealmId } from "@/lib/config";

interface RealmMarkerProps {
  realmId: RealmId;
  realm: (typeof REALMS)[number];
  player: Player;
  onTravelStart: (to: RealmId) => void;
  isTraveling: boolean;
}

function IslandFallback({ realmId, size = 88 }: { realmId: string; size?: number }) {
  // Extract theme color from realm
  const themeColors: Record<string, string> = {
    "g5-fractions": "#c97f4a",
    "g5-decimals": "#d4a574",
    "g5-volume": "#a89968",
    "g6-ratios": "#6fa3d1",
    "g6-fracdiv": "#7bc5d8",
    "g6-area": "#b8a76d",
  };
  const tint = themeColors[realmId] || "#8b7355";

  const cells = generateIsland(realmId.charCodeAt(0) * 31, 14);
  const cellSize = size / 14;
  const rects = renderIsland(cells, cellSize, tint);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${14 * cellSize} ${14 * cellSize}`}
      style={{ background: "#e3f2fd", borderRadius: "4px" }}
      role="img"
      aria-label={`Procedural island for ${realmId}`}
    >
      <defs>
        <filter id="island-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="0" dy="1" result="offsetblur" />
          <feFlood floodColor="#000" floodOpacity="0.2" />
          <feComposite in2="offsetblur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#island-shadow)" shapeRendering="crispEdges">
        {rects.map((rect, i) => (
          <g key={i} dangerouslySetInnerHTML={{ __html: rect }} />
        ))}
      </g>
    </svg>
  );
}

function RealmMarker({
  realmId,
  realm,
  player,
  onTravelStart,
  isTraveling,
}: RealmMarkerProps) {
  const router = useRouter();
  const progress = player.realms[realm.id];
  const unlocked = isRealmUnlocked(player, realm);
  const inGrade = realm.grade === (player.grade ?? 5);
  const completed = Boolean(progress?.bossDefeated);
  const current = inGrade && unlocked && !completed;
  const reason = !inGrade ? `Switch to Grade ${realm.grade}` : lockReason(player, realm) || "Locked";
  const { x, y } = MAP_GRAPH.nodes.find((n) => n.id === realmId)!;

  const [artLoaded, setArtLoaded] = useState(false);

  const handleClick = async () => {
    if (!inGrade || !unlocked) return;
    if (current) {
      // Already here, open realm
      router.push(`/realm/${realm.id}`);
      return;
    }
    onTravelStart(realmId);
  };

  return (
    <button
      key={realmId}
      className={`realm-marker ${!inGrade ? "dimmed" : ""} ${completed ? "completed" : ""} ${
        current ? "current" : ""
      } ${!unlocked && inGrade ? "locked" : ""}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={handleClick}
      disabled={!inGrade || !unlocked || isTraveling}
      aria-label={`${realm.name}, ${completed ? "completed" : unlocked && inGrade ? "unlocked" : `locked: ${reason}`}`}
      title={reason}
    >
      <div className="marker-thumbnail">
        <ArtImage
          slot={`realm-${realmId}` as "realm-g5-fractions" | "realm-g5-decimals" | "realm-g5-volume" | "realm-g6-ratios" | "realm-g6-fracdiv" | "realm-g6-area"}
          className="marker-art"
          fallback={realm.name}
          onAssetState={setArtLoaded}
        />
        {!artLoaded && <IslandFallback realmId={realmId} size={88} />}
        <span className={`marker-status-badge badge-${completed ? "completed" : unlocked && inGrade ? "unlocked" : "locked"}`}>
          {completed ? "★" : unlocked && inGrade ? "◇" : "⌑"}
        </span>
      </div>
      <div className="marker-info">
        <span className="marker-name">{realm.name}</span>
        <small>{!inGrade ? reason : completed ? "Guardian defeated" : unlocked ? realm.subSkills[0].title : reason}</small>
        {progress && <span className="marker-stars">{progress.stars.filter((value: number) => value > 0).reduce((a: number, b: number) => a + b, 0)} / 15 ★</span>}
      </div>
    </button>
  );
}

function TravelingHero({ route, startTime, duration, onComplete, player }: { route: ReturnType<typeof buildRoute>; startTime: number; duration: number; onComplete: () => void; player: Player }) {
  const [position, setPosition] = useState<{ x: number; y: number; facing: "left" | "right" }>({ x: 0, y: 0, facing: "right" });
  const animationRef = useRef<number | null>(null);
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      if (prefersReducedMotion) {
        if (t >= 1) {
          setPosition({ x: route.waypoints[route.waypoints.length - 1].x, y: route.waypoints[route.waypoints.length - 1].y, facing: "right" });
          onComplete();
        }
      } else {
        const pos = positionAt(route, t);
        setPosition(pos);
        if (t >= 1) {
          onComplete();
        } else {
          animationRef.current = requestAnimationFrame(animate);
        }
      }
    };

    if (prefersReducedMotion) {
      // Instant fade to destination
      setTimeout(() => {
        setPosition({
          x: route.waypoints[route.waypoints.length - 1].x,
          y: route.waypoints[route.waypoints.length - 1].y,
          facing: "right",
        });
        onComplete();
      }, 150);
    } else {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [route, startTime, duration, onComplete, prefersReducedMotion]);

  return (
    <div
      className="map-traveling-hero"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: position.facing === "left" ? "scaleX(-1)" : "scaleX(1)",
      }}
      aria-label="Traveling hero"
    >
      <HeroPortrait hero={player.hero} playerLevel={player.level} size="sm" />
    </div>
  );
}

export function WorldMapView({ player }: { player: Player }) {
  const router = useRouter();
  const setMapNode = useGameStore((state) => state.setMapNode);
  const [travelState, setTravelState] = useState<{
    to: RealmId;
    route: ReturnType<typeof buildRoute>;
    startTime: number;
    duration: number;
  } | null>(null);

  const activeGrade = player.grade ?? 5;
  const realms = REALMS.filter((realm) => realm.grade === activeGrade);

  const handleTravelStart = (to: RealmId) => {
    const from = player.mapNode as RealmId | undefined;
    if (!from || from === to) {
      router.push(`/realm/${to}`);
      return;
    }

    // Find path using pathfinding
    const isPassable = (nodeId: string): boolean => {
      const realm = getRealm(nodeId as RealmId);
      return isRealmUnlocked(player, realm) || nodeId === to;
    };

    const path = shortestPath(MAP_GRAPH, from, to, isPassable);
    if (!path) {
      // Can't reach; show error
      const reason = lockReason(player, getRealm(to)) || "Unreachable";
      alert(`Cannot travel to ${to}: ${reason}`);
      return;
    }

    const route = buildRoute(MAP_GRAPH, path);
    const duration = durationMs(route);
    const startTime = Date.now();

    setTravelState({ to, route, startTime, duration });
  };

  const handleTravelComplete = () => {
    if (travelState) {
      setMapNode(travelState.to);
      setTravelState(null);
      router.push(`/realm/${travelState.to}`);
    }
  };

  const isTraveling = travelState !== null;

  return (
    <div className="realm-map scene-map">
      <div className="map-route" aria-hidden="true" />
      {realms.map((realm) => (
        <RealmMarker
          key={realm.id}
          realmId={realm.id as RealmId}
          realm={realm}
          player={player}
          onTravelStart={handleTravelStart}
          isTraveling={isTraveling}
        />
      ))}
      {travelState && (
        <TravelingHero
          route={travelState.route}
          startTime={travelState.startTime}
          duration={travelState.duration}
          onComplete={handleTravelComplete}
          player={player}
        />
      )}
      {!travelState && (
        <div className="map-player" aria-label="Your hero">
          <HeroPortrait hero={player.hero} playerLevel={player.level} size="sm" />
          <small>{player.profile?.name || "YOU"}</small>
        </div>
      )}
      <div className="map-legend">
        <span>✦ Player</span>
        <span>★ Completed</span>
        <span>◇ Unlocked</span>
        <span>⌑ Locked</span>
      </div>
    </div>
  );
}
