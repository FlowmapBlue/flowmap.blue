import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
  ParametricSelector,
} from 'reselect';
import {
  LocationFilterMode,
  MAX_ZOOM_LEVEL,
  FlowMapState,
  TimeGranularityKey,
  getTimeGranularityByKey,
} from './';
import {
  Config,
  ConfigPropName,
  CountByTime,
  Flow,
  getFlowDestId,
  getFlowMagnitude,
  getFlowOriginId,
  getFlowTime,
  getLocationCentroid,
  getLocationId,
  isLocationCluster,
  Location,
  LocationTotals,
} from './types';
import * as Cluster from '@flowmap.gl/cluster';
import { ClusterNode, findAppropriateZoomLevel, isCluster } from '@flowmap.gl/cluster';
import getColors from './colors';
import { nest } from 'd3-collection';
import { bounds } from '@mapbox/geo-viewport';
import KDBush from 'kdbush';
import { ascending, descending, min } from 'd3-array';
import { csvParseRows } from 'd3-dsv';
import { getTimeGranularityByOrder, getTimeGranularityForDate, TimeGranularity } from './time';
import { FlowAccessors } from '@flowmap.gl/core';

// TODO move necessary props to State
export interface Props {
  flows: Flow[] | undefined;
  locations: Location[] | undefined;
}

export const NUMBER_OF_FLOWS_TO_DISPLAY = 5000;

export type Selector<T> = ParametricSelector<FlowMapState, Props, T>;

export const getFetchedFlows = (state: FlowMapState, props: Props) => props.flows;
export const getFetchedLocations = (state: FlowMapState, props: Props) => props.locations;
export const getSelectedLocations = (state: FlowMapState, props: Props) =>
  state.filterState.selectedLocations;
export const getLocationFilterMode = (state: FlowMapState, props: Props) =>
  state.filterState.locationFilterMode;
export const getClusteringEnabled = (state: FlowMapState, props: Props) =>
  state.settingsState.clusteringEnabled;
export const getLocationTotalsEnabled = (state: FlowMapState, props: Props) =>
  state.settingsState.locationTotalsEnabled;
export const getZoom = (state: FlowMapState, props: Props) => state.viewport.zoom;
export const getViewport = (state: FlowMapState, props: Props) => state.viewport;
export const getSelectedTimeRange = (state: FlowMapState, props: Props) =>
  state.filterState.selectedTimeRange;

export const getInvalidLocationIds: Selector<string[] | undefined> = createSelector(
  getFetchedLocations,
  (locations) => {
    if (!locations) return undefined;
    const invalid = [];
    for (const location of locations) {
      if (
        !(-90 <= location.lat && location.lat <= 90) ||
        !(-180 <= location.lon && location.lon <= 180)
      ) {
        invalid.push(location.id);
      }
    }
    return invalid.length > 0 ? invalid : undefined;
  }
);

export const getLocations: Selector<Location[] | undefined> = createSelector(
  getFetchedLocations,
  getInvalidLocationIds,
  (locations, invalidIds) => {
    if (!locations) return undefined;
    if (!invalidIds || invalidIds.length === 0) return locations;
    const invalid = new Set(invalidIds);
    return locations.filter((location: Location) => !invalid.has(getLocationId(location)));
  }
);

export const getLocationIds: Selector<Set<string> | undefined> = createSelector(
  getLocations,
  (locations) => (locations ? new Set(locations.map(getLocationId)) : undefined)
);

export const getSelectedLocationsSet: Selector<
  Set<string> | undefined
> = createSelector(getSelectedLocations, (ids) =>
  ids && ids.length > 0 ? new Set(ids) : undefined
);

export const getSortedFlowsForKnownLocations: Selector<Flow[] | undefined> = createSelector(
  getFetchedFlows,
  getLocationIds,
  (flows, ids) => {
    if (!ids || !flows) return undefined;
    return flows
      .filter((flow: Flow) => ids.has(getFlowOriginId(flow)) && ids.has(getFlowDestId(flow)))
      .sort((a: Flow, b: Flow) =>
        descending(Math.abs(getFlowMagnitude(a)), Math.abs(getFlowMagnitude(b)))
      );
  }
);

const getActualTimeExtent: Selector<[Date, Date] | undefined> = createSelector(
  getSortedFlowsForKnownLocations,
  (flows) => {
    if (!flows) return undefined;
    let start = null;
    let end = null;
    for (const { time } of flows) {
      if (time) {
        if (start == null || start > time) start = time;
        if (end == null || end < time) end = time;
      }
    }
    if (!start || !end) return undefined;
    return [start, end];
  }
);

export const getTimeGranularityKey: Selector<TimeGranularityKey | undefined> = createSelector(
  getSortedFlowsForKnownLocations,
  getActualTimeExtent,
  (flows, timeExtent) => {
    if (!flows || !timeExtent) return undefined;

    const minOrder = min(flows, (d) => getTimeGranularityForDate(getFlowTime(d)!).order);
    if (minOrder == null) return undefined;
    const timeGranularity = getTimeGranularityByOrder(minOrder);
    return timeGranularity ? timeGranularity.key : undefined;
  }
);

export const getTimeExtent: Selector<[Date, Date] | undefined> = createSelector(
  getActualTimeExtent,
  getTimeGranularityKey,
  (timeExtent, timeGranularityKey) => {
    const timeGranularity = timeGranularityKey
      ? getTimeGranularityByKey(timeGranularityKey)
      : undefined;
    if (!timeExtent || !timeGranularity?.interval) return undefined;
    const { interval } = timeGranularity;
    return [timeExtent[0], interval.offset(interval.floor(timeExtent[1]), 1)];
  }
);

export const getSortedFlowsForKnownLocationsFilteredByTime: Selector<
  Flow[] | undefined
> = createSelector(
  getSortedFlowsForKnownLocations,
  getTimeExtent,
  getSelectedTimeRange,
  (flows, timeExtent, timeRange) => {
    if (!flows) return undefined;
    if (
      !timeExtent ||
      !timeRange ||
      (timeExtent[0] === timeRange[0] && timeExtent[1] === timeRange[1])
    ) {
      return flows;
    }
    return flows.filter((flow) => {
      const time = getFlowTime(flow);
      return time && timeRange[0] <= time && time < timeRange[1];
    });
  }
);

export const getLocationsHavingFlows: Selector<Location[] | undefined> = createSelector(
  getSortedFlowsForKnownLocations,
  getLocations,
  (flows, locations) => {
    if (!locations || !flows) return locations;
    const withFlows = new Set();
    for (const flow of flows) {
      withFlows.add(getFlowOriginId(flow));
      withFlows.add(getFlowDestId(flow));
    }
    return locations.filter((location: Location) => withFlows.has(getLocationId(location)));
  }
);

export const getLocationsById: Selector<Map<string, Location> | undefined> = createSelector(
  getLocationsHavingFlows,
  (locations) => {
    if (!locations) return undefined;
    return (nest<Location, Location>()
      .key((d: Location) => d.id)
      .rollup(([d]) => d)
      .map(locations) as any) as Map<string, Location>;
  }
);

export const getClusterIndex: Selector<Cluster.ClusterIndex | undefined> = createSelector(
  getLocationsHavingFlows,
  getLocationsById,
  getSortedFlowsForKnownLocations,
  (locations, locationsById, flows) => {
    if (!locations || !locationsById || !flows) return undefined;

    const getLocationWeight = Cluster.makeLocationWeightGetter(flows, {
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
    });
    const clusterLevels = Cluster.clusterLocations(
      locations,
      { getLocationId, getLocationCentroid },
      getLocationWeight,
      {
        maxZoom: MAX_ZOOM_LEVEL,
      }
    );
    const clusterIndex = Cluster.buildIndex(clusterLevels);

    // Adding meaningful names
    const getName = (id: string) => {
      const loc = locationsById.get(id);
      if (loc) return loc.name || loc.id || id;
      return `#${id}`;
    };
    for (const level of clusterLevels) {
      for (const node of level.nodes) {
        // Here mutating the nodes (adding names)
        if (isCluster(node)) {
          const leaves = clusterIndex.expandCluster(node);
          const topId = leaves.reduce((m: string | undefined, d: string) =>
            !m || getLocationWeight(d) > getLocationWeight(m) ? d : m
          );
          const otherId = leaves.length === 2 && leaves.find((id) => id !== topId);
          node.name = `"${getName(topId)}" and ${
            otherId ? `"${getName(otherId)}"` : `${leaves.length - 1} others`
          }`;
        } else {
          (node as any).name = getName(node.id);
        }
      }
    }

    return clusterIndex;
  }
);

export const getAvailableClusterZoomLevels = createSelector(
  getClusterIndex,
  getSelectedLocations,
  (clusterIndex, selectedLocations): number[] | undefined => {
    if (!clusterIndex) {
      return undefined;
    }

    let maxZoom = Number.POSITIVE_INFINITY;
    let minZoom = Number.NEGATIVE_INFINITY;

    const adjust = (zoneId: string) => {
      const cluster = clusterIndex.getClusterById(zoneId);
      if (cluster) {
        minZoom = Math.max(minZoom, cluster.zoom);
        maxZoom = Math.min(maxZoom, cluster.zoom);
      } else {
        const zoom = clusterIndex.getMinZoomForLocation(zoneId);
        minZoom = Math.max(minZoom, zoom);
      }
    };

    if (selectedLocations) {
      for (const id of selectedLocations) {
        adjust(id);
      }
    }

    return clusterIndex.availableZoomLevels.filter((level) => minZoom <= level && level <= maxZoom);
  }
);

const _getClusterZoom: Selector<number | undefined> = createSelector(
  getClusterIndex,
  getZoom,
  getAvailableClusterZoomLevels,
  (clusterIndex, mapZoom, availableClusterZoomLevels) => {
    if (!clusterIndex) return undefined;
    if (!availableClusterZoomLevels) {
      return undefined;
    }

    const clusterZoom = findAppropriateZoomLevel(availableClusterZoomLevels, mapZoom);
    return clusterZoom;
  }
);

export function getClusterZoom(state: FlowMapState, props: Props) {
  const { settingsState } = state;
  if (!settingsState.clusteringEnabled) return undefined;
  if (settingsState.clusteringAuto || settingsState.manualClusterZoom == null) {
    return _getClusterZoom(state, props);
  }
  return settingsState.manualClusterZoom;
}

export const getLocationsForSearchBox: Selector<
  (Location | Cluster.Cluster)[] | undefined
> = createSelector(
  getClusteringEnabled,
  getLocationsHavingFlows,
  getSelectedLocations,
  getClusterZoom,
  getClusterIndex,
  (clusteringEnabled, locations, selectedLocations, clusterZoom, clusterIndex) => {
    if (!locations) return undefined;
    let result: (Location | Cluster.Cluster)[] = locations;
    if (clusteringEnabled) {
      if (clusterIndex) {
        const zoomItems = clusterIndex.getClusterNodesFor(clusterZoom);
        if (zoomItems) {
          result = result.concat(zoomItems.filter(Cluster.isCluster));
        }
      }
    }

    if (result && clusterIndex && selectedLocations) {
      const toAppend = [];
      for (const id of selectedLocations) {
        const cluster = clusterIndex.getClusterById(id);
        if (cluster && !result.find((d) => d.id === id)) {
          toAppend.push(cluster);
        }
      }
      if (toAppend.length > 0) {
        result = result.concat(toAppend);
      }
    }
    return result;
  }
);

export const getDiffMode: Selector<boolean> = createSelector(getFetchedFlows, (flows) => {
  if (flows && flows.find((f: Flow) => getFlowMagnitude(f) < 0)) {
    return true;
  }
  return false;
});

export const getColorSchemeKey: Selector<string | undefined> = (
  state: FlowMapState,
  props: Props
) => state.settingsState.colorSchemeKey;

export const getDarkMode: Selector<boolean> = (state: FlowMapState, props: Props) =>
  state.settingsState.darkMode;

export const getFadeEnabled: Selector<boolean> = (state: FlowMapState, props: Props) =>
  state.settingsState.fadeEnabled;
export const getFadeAmount: Selector<number> = (state: FlowMapState, props: Props) =>
  state.settingsState.fadeAmount;

export const getAnimate: Selector<boolean> = (state: FlowMapState, props: Props) =>
  state.settingsState.animationEnabled;

export const getFlowMapColors = createSelector(
  getDiffMode,
  getColorSchemeKey,
  getDarkMode,
  getFadeEnabled,
  getFadeAmount,
  getAnimate,
  getColors
);

export const getUnknownLocations: Selector<Set<string> | undefined> = createSelector(
  getLocationIds,
  getFetchedFlows,
  getSortedFlowsForKnownLocations,
  (ids, flows, flowsForKnownLocations) => {
    if (!ids || !flows) return undefined;
    if (flowsForKnownLocations && flows.length === flowsForKnownLocations.length) return undefined;
    const missing = new Set<string>();
    for (const flow of flows) {
      if (!ids.has(getFlowOriginId(flow))) missing.add(getFlowOriginId(flow));
      if (!ids.has(getFlowDestId(flow))) missing.add(getFlowDestId(flow));
    }
    return missing;
  }
);

function aggregateFlows(flows: Flow[]) {
  // Sum up flows with same origin, dest
  const byOriginDest = nest<Flow, Flow>()
    .key(getFlowOriginId)
    .key(getFlowDestId)
    .rollup((ff: Flow[]) => {
      const origin = getFlowOriginId(ff[0]);
      const dest = getFlowDestId(ff[0]);
      const color = ff[0].color;
      const rv: Flow = {
        origin,
        dest,
        count: ff.reduce((m, f) => {
          const count = getFlowMagnitude(f);
          if (count) {
            if (!isNaN(count) && isFinite(count)) return m + count;
          }
          return m;
        }, 0),
        time: undefined,
      };
      if (color) rv.color = color;
      return rv;
    })
    .entries(flows);
  const rv: Flow[] = [];
  for (const { values } of byOriginDest) {
    for (const { value } of values) {
      rv.push(value);
    }
  }
  return rv;
}

export const getSortedAggregatedFilteredFlows: Selector<Flow[] | undefined> = createSelector(
  getClusterIndex,
  getClusteringEnabled,
  getSortedFlowsForKnownLocationsFilteredByTime,
  getClusterZoom,
  getTimeExtent,
  (clusterTree, isClusteringEnabled, flows, clusterZoom, timeExtent) => {
    if (!flows) return undefined;
    let aggregated;
    if (isClusteringEnabled && clusterTree && clusterZoom != null) {
      aggregated = clusterTree.aggregateFlows(
        timeExtent != null
          ? aggregateFlows(flows) // clusterTree.aggregateFlows won't aggregate unclustered across time
          : flows,
        clusterZoom,
        {
          getFlowOriginId,
          getFlowDestId,
          getFlowMagnitude,
        }
      );
    } else {
      aggregated = aggregateFlows(flows);
    }
    aggregated.sort((a, b) =>
      descending(Math.abs(getFlowMagnitude(a)), Math.abs(getFlowMagnitude(b)))
    );
    return aggregated;
  }
);

export const getFlowMagnitudeExtent: Selector<[number, number] | undefined> = createSelector(
  getSortedAggregatedFilteredFlows,
  getSelectedLocationsSet,
  getLocationFilterMode,
  (flows, selectedLocationsSet, locationFilterMode) => {
    if (!flows) return undefined;
    let rv: [number, number] | undefined = undefined;
    for (const f of flows) {
      if (
        getFlowOriginId(f) !== getFlowDestId(f) &&
        isFlowInSelection(f, selectedLocationsSet, locationFilterMode)
      ) {
        const count = getFlowMagnitude(f);
        if (rv == null) {
          rv = [count, count];
        } else {
          if (count < rv[0]) rv[0] = count;
          if (count > rv[1]) rv[1] = count;
        }
      }
    }
    return rv;
  }
);

export const getExpandedSelectedLocationsSet: Selector<Set<string> | undefined> = createSelector(
  getClusteringEnabled,
  getSelectedLocationsSet,
  getClusterIndex,
  (clusteringEnabled, selectedLocations, clusterIndex) => {
    if (!selectedLocations || !clusterIndex) {
      return selectedLocations;
    }

    const result = new Set<string>();
    for (const locationId of selectedLocations) {
      const cluster = clusterIndex.getClusterById(locationId);
      if (cluster) {
        const expanded = clusterIndex.expandCluster(cluster);
        for (const id of expanded) {
          result.add(id);
        }
      } else {
        result.add(locationId);
      }
    }
    return result;
  }
);

export const getTotalCountsByTime: Selector<CountByTime[] | undefined> = createSelector(
  getSortedFlowsForKnownLocations,
  getTimeGranularityKey,
  getTimeExtent,
  getExpandedSelectedLocationsSet,
  getLocationFilterMode,
  (flows, timeGranularityKey, timeExtent, selectedLocationSet, locationFilterMode) => {
    const timeGranularity = timeGranularityKey
      ? getTimeGranularityByKey(timeGranularityKey)
      : undefined;
    if (!flows || !timeGranularity || !timeExtent) return undefined;
    const byTime = flows.reduce((m, flow) => {
      if (isFlowInSelection(flow, selectedLocationSet, locationFilterMode)) {
        const key = timeGranularity.interval(getFlowTime(flow)!).getTime();
        m.set(key, (m.get(key) ?? 0) + getFlowMagnitude(flow));
      }
      return m;
    }, new Map<number, number>());

    return Array.from(byTime.entries()).map(([millis, count]) => ({
      time: new Date(millis),
      count,
    }));
  }
);

export const getMaxLocationCircleSize: Selector<number> = createSelector(
  getLocationTotalsEnabled,
  (locationTotalsEnabled) => (locationTotalsEnabled ? 15 : 0)
);

const getViewportBoundingBox: Selector<[number, number, number, number]> = createSelector(
  getViewport,
  getMaxLocationCircleSize,
  (viewport, maxLocationCircleSize) => {
    const pad = maxLocationCircleSize;
    return bounds(
      [viewport.longitude, viewport.latitude],
      viewport.zoom,
      [viewport.width + pad * 2, viewport.height + pad * 2],
      512
    );
  }
);

const getLocationsForZoom: Selector<Location[] | ClusterNode[] | undefined> = createSelector(
  getClusteringEnabled,
  getLocationsHavingFlows,
  getClusterIndex,
  getClusterZoom,
  (clusteringEnabled, locationsHavingFlows, clusterIndex, clusterZoom) => {
    if (clusteringEnabled && clusterIndex) {
      return clusterIndex.getClusterNodesFor(clusterZoom);
    } else {
      return locationsHavingFlows;
    }
  }
);

export const getLocationTotals: Selector<Map<string, LocationTotals> | undefined> = createSelector(
  getLocationsForZoom,
  getSortedAggregatedFilteredFlows,
  getSelectedLocationsSet,
  getLocationFilterMode,
  (locations, flows, selectedLocationsSet, locationFilterMode) => {
    if (!flows) return undefined;
    const totals = new Map<string, LocationTotals>();
    const add = (id: string, d: Partial<LocationTotals>): LocationTotals => {
      const rv = totals.get(id) ?? { incoming: 0, outgoing: 0, within: 0 };
      if (d.incoming != null) rv.incoming += d.incoming;
      if (d.outgoing != null) rv.outgoing += d.outgoing;
      if (d.within != null) rv.within += d.within;
      return rv;
    };
    for (const f of flows) {
      if (isFlowInSelection(f, selectedLocationsSet, locationFilterMode)) {
        const originId = getFlowOriginId(f);
        const destId = getFlowDestId(f);
        const count = getFlowMagnitude(f);
        if (originId === destId) {
          totals.set(originId, add(originId, { within: count }));
        } else {
          totals.set(originId, add(originId, { outgoing: count }));
          totals.set(destId, add(destId, { incoming: count }));
        }
      }
    }
    return totals;
  }
);

type KDBushTree = any;

export const getLocationsTree: Selector<KDBushTree> = createSelector(
  getLocationsForZoom,
  (locations) => {
    if (!locations) {
      return undefined;
    }
    return new KDBush(
      locations,
      (location: Location | Cluster.Cluster) =>
        lngX(isLocationCluster(location) ? location.centroid[0] : location.lon),
      (location: Location | Cluster.Cluster) =>
        latY(isLocationCluster(location) ? location.centroid[1] : location.lat)
    );
  }
);

function _getLocationsInBboxIndices(tree: KDBushTree, bbox: [number, number, number, number]) {
  if (!tree) return undefined;
  const [lon1, lat1, lon2, lat2] = bbox;
  const [x1, y1, x2, y2] = [lngX(lon1), latY(lat1), lngX(lon2), latY(lat2)];
  return tree.range(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2));
}

export function getLocationsInBbox(tree: KDBushTree, bbox: [number, number, number, number]) {
  if (!tree) return undefined;
  return _getLocationsInBboxIndices(tree, bbox).map(
    (idx: number) => tree.points[idx]
  ) as Array<Location>;
}

const _getLocationIdsInViewport: Selector<Set<string> | undefined> = createSelector(
  getLocationsTree,
  getViewportBoundingBox,
  (tree: KDBushTree, bbox: [number, number, number, number]) => {
    const ids = _getLocationsInBboxIndices(tree, bbox);
    if (ids) {
      return new Set(ids.map((idx: number) => tree.points[idx].id) as Array<string>);
    }
    return undefined;
  }
);

const getLocationIdsInViewport: Selector<Set<string> | undefined> = createSelectorCreator<
  Set<string> | undefined
>(
  // @ts-ignore
  defaultMemoize,
  (s1: Set<string> | undefined, s2: Set<string> | undefined, index: number) => {
    if (s1 === s2) return true;
    if (s1 == null || s2 == null) return false;
    if (s1.size !== s2.size) return false;
    for (const item of s1) if (!s2.has(item)) return false;
    return true;
  }
)(_getLocationIdsInViewport, (locationIds: Set<string> | undefined) => {
  if (!locationIds) return undefined;
  return locationIds;
});

export const getLocationsForFlowMapLayer: Selector<
  Location[] | ClusterNode[] | undefined
> = createSelector(
  getLocationsForZoom,
  getLocationIdsInViewport,
  (locations, locationIdsInViewport) => {
    if (!locations) return undefined;
    if (!locationIdsInViewport) return locations;
    if (locationIdsInViewport.size === locations.length) return locations;
    // const filtered = [];
    // for (const loc of locations) {
    //   if (locationIdsInViewport.has(loc.id)) {
    //     filtered.push(loc);
    //   }
    // }
    // return filtered;
    // @ts-ignore
    // return locations.filter(
    //   (loc: Location | ClusterNode) => locationIdsInViewport.has(loc.id)
    // );
    // TODO: return location in viewport + "connected" ones
    return locations;
  }
);

export const getFlowsSheets = defaultMemoize((config: Config) => {
  const sheets = config[ConfigPropName.FLOWS_SHEETS];
  if (sheets) {
    return csvParseRows(sheets)[0].map((s) => s.trim());
  }
  return undefined;
});

function isFlowInSelection(
  flow: Flow,
  selectedLocationsSet: Set<string> | undefined,
  locationFilterMode: LocationFilterMode
) {
  const { origin, dest } = flow;
  if (selectedLocationsSet) {
    switch (locationFilterMode) {
      case LocationFilterMode.ALL:
        return selectedLocationsSet.has(origin) || selectedLocationsSet.has(dest);
      case LocationFilterMode.BETWEEN:
        return selectedLocationsSet.has(origin) && selectedLocationsSet.has(dest);
      case LocationFilterMode.INCOMING:
        return selectedLocationsSet.has(dest);
      case LocationFilterMode.OUTGOING:
        return selectedLocationsSet.has(origin);
    }
  }
  return true;
}

export const getTotalUnfilteredCount: Selector<number | undefined> = createSelector(
  getSortedFlowsForKnownLocations,
  (flows) => {
    if (!flows) return undefined;
    return flows.reduce((m, flow) => m + getFlowMagnitude(flow), 0);
  }
);

export const getTotalFilteredCount: Selector<number | undefined> = createSelector(
  getSortedAggregatedFilteredFlows,
  getSelectedLocationsSet,
  getLocationFilterMode,
  (flows, selectedLocationSet, locationFilterMode) => {
    if (!flows) return undefined;
    const count = flows.reduce((m, flow) => {
      if (isFlowInSelection(flow, selectedLocationSet, locationFilterMode)) {
        return m + getFlowMagnitude(flow);
      }
      return m;
    }, 0);
    return count;
  }
);

function calcLocationTotalsExtent(
  locationTotals: Map<string, LocationTotals> | undefined,
  locationIdsInViewport: Set<string> | undefined
) {
  if (!locationTotals) return undefined;
  let rv: [number, number] | undefined = undefined;
  for (const [id, { incoming, outgoing, within }] of locationTotals.entries()) {
    if (locationIdsInViewport == null || locationIdsInViewport.has(id)) {
      const lo = Math.min(incoming + within, outgoing + within, within);
      const hi = Math.max(incoming + within, outgoing + within, within);
      if (!rv) {
        rv = [lo, hi];
      } else {
        if (lo < rv[0]) rv[0] = lo;
        if (hi > rv[1]) rv[1] = hi;
      }
    }
  }
  return rv;
}

const _getLocationTotalsExtent: Selector<
  [number, number] | undefined
> = createSelector(getLocationTotals, (locationTotals) =>
  calcLocationTotalsExtent(locationTotals, undefined)
);

const _getLocationTotalsForViewportExtent: Selector<
  [number, number] | undefined
> = createSelector(
  getLocationTotals,
  getLocationIdsInViewport,
  (locationTotals, locationsInViewport) =>
    calcLocationTotalsExtent(locationTotals, locationsInViewport)
);

export function getLocationTotalsExtent(state: FlowMapState, props: Props) {
  if (state.settingsState.adaptiveScalesEnabled) {
    return _getLocationTotalsForViewportExtent(state, props);
  } else {
    return _getLocationTotalsExtent(state, props);
  }
}

export const getFlowsForFlowMapLayer: Selector<Flow[] | undefined> = createSelector(
  getSortedAggregatedFilteredFlows,
  getLocationIdsInViewport,
  getSelectedLocationsSet,
  getLocationFilterMode,
  (flows, locationIdsInViewport, selectedLocationsSet, locationFilterMode) => {
    if (!flows || !locationIdsInViewport) return undefined;
    const picked: Flow[] = [];
    let pickedCount = 0;
    for (const flow of flows) {
      const { origin, dest } = flow;
      if (locationIdsInViewport.has(origin) || locationIdsInViewport.has(dest)) {
        let pick = isFlowInSelection(flow, selectedLocationsSet, locationFilterMode);
        if (pick) {
          if (origin !== dest) {
            // exclude self-loops
            picked.push(flow);
            pickedCount++;
          }
        }
      }
      // Only keep top
      if (pickedCount > NUMBER_OF_FLOWS_TO_DISPLAY) break;
    }
    // assuming they are sorted in descending order,
    // we need ascending for rendering
    return picked.reverse();
  }
);

// longitude/latitude to spherical mercator in [0..1] range
function lngX(lng: number) {
  return lng / 360 + 0.5;
}

function latY(lat: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI;
  return y < 0 ? 0 : y > 1 ? 1 : y;
}

export interface LocationsTotals {
  incoming: { [id: string]: number };
  outgoing: { [id: string]: number };
  within: { [id: string]: number };
}

export function calcLocationTotals(
  locations: (Location | ClusterNode)[],
  flows: Flow[],
  inputAccessors: FlowAccessors
) {
  const { getFlowOriginId, getFlowDestId, getFlowMagnitude } = inputAccessors;
  return flows.reduce(
    (acc: LocationsTotals, curr) => {
      const originId = getFlowOriginId(curr);
      const destId = getFlowDestId(curr);
      const magnitude = getFlowMagnitude(curr);
      if (originId === destId) {
        acc.within[originId] = (acc.within[originId] || 0) + magnitude;
      } else {
        acc.outgoing[originId] = (acc.outgoing[originId] || 0) + magnitude;
        acc.incoming[destId] = (acc.incoming[destId] || 0) + magnitude;
      }
      return acc;
    },
    { incoming: {}, outgoing: {}, within: {} }
  );
}

export function getLocationMaxAbsTotalGetter(
  locations: (Location | ClusterNode)[],
  getLocationTotalIn: (location: Location | ClusterNode) => number,
  getLocationTotalOut: (location: Location | ClusterNode) => number,
  getLocationTotalWithin: (location: Location | ClusterNode) => number
) {
  return (location: Location | ClusterNode) =>
    Math.max(
      Math.abs(getLocationTotalIn(location) + getLocationTotalWithin(location)),
      Math.abs(getLocationTotalOut(location) + getLocationTotalWithin(location))
    );
}
