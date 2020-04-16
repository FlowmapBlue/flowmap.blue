import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
  ParametricSelector,
} from 'reselect';
import { LocationFilterMode, MAX_ZOOM_LEVEL, State } from './FlowMap.state';
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
} from './types';
import * as Cluster from '@flowmap.gl/cluster';
import { ClusterNode, findAppropriateZoomLevel, isCluster } from '@flowmap.gl/cluster';
import getColors from './colors';
import { DEFAULT_MAP_STYLE_DARK, DEFAULT_MAP_STYLE_LIGHT, parseBoolConfigProp } from './config';
import { nest } from 'd3-collection';
import { Props } from './FlowMap';
import { bounds } from '@mapbox/geo-viewport';
import KDBush from 'kdbush';
import { descending, min } from 'd3-array';
import { csvParseRows } from 'd3-dsv';
import { getTimeStepByOrder, getTimeStepForDate, TimeStep } from './time';

export const NUMBER_OF_FLOWS_TO_DISPLAY = 5000;

export type Selector<T> = ParametricSelector<State, Props, T>;

export const getFetchedFlows = (state: State, props: Props) => props.flowsFetch.value;
export const getFetchedLocations = (state: State, props: Props) => props.locationsFetch.value;
export const getSelectedLocations = (state: State, props: Props) => state.selectedLocations;
export const getLocationFilterMode = (state: State, props: Props) => state.locationFilterMode;
export const getClusteringEnabled = (state: State, props: Props) => state.clusteringEnabled;
export const getLocationTotalsEnabled = (state: State, props: Props) => state.locationTotalsEnabled;
export const getZoom = (state: State, props: Props) => state.viewport.zoom;
export const getConfig = (state: State, props: Props) => props.config;
export const getViewport = (state: State, props: Props) => state.viewport;
export const getSelectedTimeRange = (state: State, props: Props) => state.selectedTimeRange;

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
    return locations.filter((location) => !invalid.has(getLocationId(location)));
  }
);

export const getLocationIds: Selector<Set<string> | undefined> = createSelector(
  getLocations,
  (locations) => (locations ? new Set(locations.map(getLocationId)) : undefined)
);

export const getSelectedLocationSet: Selector<
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
      .filter((flow) => ids.has(getFlowOriginId(flow)) && ids.has(getFlowDestId(flow)))
      .sort((a, b) => descending(Math.abs(getFlowMagnitude(a)), Math.abs(getFlowMagnitude(b))));
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

// function _getTimeStep(flows: Flow[]) {
//   const times = Array.from(flows.reduce(
//     (m, d) => {
//       if (d.time) m.add(d.time.getTime());
//       return m;
//     }, new Set<number>())).sort();
//
//   let minDiff = null;
//   for (let i = 1; i < times.length; i++) {
//     const diff = times[i] - times[i - 1];
//     if (minDiff == null || diff < minDiff) {
//       minDiff = diff;
//     }
//   }
//
//   if (!minDiff) return undefined;
//   ..
// }

export const getTimeStep: Selector<TimeStep | undefined> = createSelector(
  getSortedFlowsForKnownLocations,
  getActualTimeExtent,
  (flows, timeExtent) => {
    if (!flows || !timeExtent) return undefined;

    const minOrder = min(flows, (d) => getTimeStepForDate(getFlowTime(d)!).order);
    if (minOrder == null) return undefined;
    return getTimeStepByOrder(minOrder);
  }
);

export const getTimeExtent: Selector<[Date, Date] | undefined> = createSelector(
  getActualTimeExtent,
  getTimeStep,
  (timeExtent, timeStep) => {
    if (!timeExtent || !timeStep?.interval) return undefined;
    const { interval } = timeStep;
    return [timeExtent[0], interval.offset(interval.floor(timeExtent[1]), 1)];
  }
);

export const getTotalCountsByTime: Selector<CountByTime[] | undefined> = createSelector(
  getSortedFlowsForKnownLocations,
  getTimeStep,
  getTimeExtent,
  (flows, timeStep, timeExtent) => {
    if (!flows || !timeStep || !timeExtent) return undefined;
    const byTime = flows.reduce((m, f) => {
      const key = timeStep.interval(getFlowTime(f)!).getTime();
      m.set(key, (m.get(key) ?? 0) + getFlowMagnitude(f));
      return m;
    }, new Map<number, number>());

    return Array.from(byTime.entries()).map(([millis, count]) => ({
      time: new Date(millis),
      count,
    }));
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
      return time && timeRange[0] <= time && time <= timeRange[1];
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

export const getClusterIndex: Selector<Cluster.ClusterIndex | undefined> = createSelector(
  getLocationsHavingFlows,
  getSortedFlowsForKnownLocations,
  (locations, flows) => {
    if (!locations || !flows) return undefined;

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

    const locationsById = nest<Location, Location>()
      .key((d: Location) => d.id)
      .rollup(([d]) => d)
      .object(locations);

    // Adding meaningful names
    const getName = (id: string) => {
      const loc = locationsById[id];
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
  getZoom,
  getClusterIndex,
  getSelectedLocations,
  (mapZoom, clusterIndex, selectedLocations): number[] | undefined => {
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

export const getClusterZoom: Selector<number | undefined> = createSelector(
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
  if (flows && flows.find((f) => getFlowMagnitude(f) < 0)) {
    return true;
  }
  return false;
});

export const getColorSchemeKey: Selector<string | undefined> = (state: State, props: Props) =>
  state.colorSchemeKey;

export const getDarkMode: Selector<boolean> = (state: State, props: Props) => state.darkMode;

export const getFadeAmount: Selector<number> = (state: State, props: Props) => state.fadeAmount;

export const getAnimate: Selector<boolean> = (state: State, props: Props) => state.animationEnabled;

export const getFlowMapColors = createSelector(
  getConfig,
  getDiffMode,
  getColorSchemeKey,
  getDarkMode,
  getFadeAmount,
  getAnimate,
  getColors
);

export const getMapboxMapStyle = createSelector(getConfig, getDarkMode, (config, darkMode) => {
  const configMapStyle = config[ConfigPropName.MAPBOX_MAP_STYLE];
  if (configMapStyle) {
    if (darkMode === parseBoolConfigProp(config[ConfigPropName.COLORS_DARK_MODE])) {
      return configMapStyle;
    }
  }
  return darkMode ? DEFAULT_MAP_STYLE_DARK : DEFAULT_MAP_STYLE_LIGHT;
});

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
      return {
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

export const getSortedAggregatedFlows: Selector<Flow[] | undefined> = createSelector(
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

export const getMaxClusterZoom: Selector<number | undefined> = createSelector(
  getClusterIndex,
  (clusterIndex) => {
    if (!clusterIndex) return undefined;
    return Math.max.apply(null, clusterIndex.availableZoomLevels);
  }
);

export const getExpandedSelection: Selector<Array<string> | undefined> = createSelector(
  getClusteringEnabled,
  getSelectedLocations,
  getClusterZoom,
  getClusterIndex,
  getMaxClusterZoom,
  (clusteringEnabled, selectedLocations, clusterZoom, clusterIndex, maxClusterZoom) => {
    if (!selectedLocations || !clusterIndex || clusterZoom === undefined) {
      return undefined;
    }

    const targetZoom = clusteringEnabled ? clusterZoom : maxClusterZoom;

    const result = new Set<string>();
    for (const locationId of selectedLocations) {
      const cluster = clusterIndex.getClusterById(locationId);
      if (cluster) {
        const expanded = clusterIndex.expandCluster(cluster, targetZoom);
        for (const id of expanded) {
          result.add(id);
        }
      } else {
        result.add(locationId);
      }
    }
    return Array.from(result);
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
  return _getLocationsInBboxIndices(tree, bbox).map((idx: number) => tree.points[idx]) as Array<
    Location
  >;
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

export const getFlowsForFlowMapLayer: Selector<Flow[] | undefined> = createSelector(
  getSortedAggregatedFlows,
  getLocationIdsInViewport,
  getSelectedLocationSet,
  getLocationFilterMode,
  (flows, locationIdsInViewport, selectedLocationsSet, locationFilterMode) => {
    if (!flows || !locationIdsInViewport) return undefined;
    const picked: Flow[] = [];
    let pickedCount = 0;
    for (const flow of flows) {
      const { origin, dest } = flow;
      if (locationIdsInViewport.has(origin) || locationIdsInViewport.has(dest)) {
        let pick = true;
        if (selectedLocationsSet) {
          switch (locationFilterMode) {
            case LocationFilterMode.ALL:
              pick = selectedLocationsSet.has(origin) || selectedLocationsSet.has(dest);
              break;
            case LocationFilterMode.BETWEEN:
              pick = selectedLocationsSet.has(origin) && selectedLocationsSet.has(dest);
              break;
            case LocationFilterMode.INCOMING:
              pick = selectedLocationsSet.has(dest);
              break;
            case LocationFilterMode.OUTGOING:
              pick = selectedLocationsSet.has(origin);
              break;
          }
        }

        if (pick) {
          picked.push(flow);
          if (origin !== dest) {
            // exclude self-loops from count
            pickedCount++;
          }
        }
      }
      // Only keep top
      if (pickedCount > NUMBER_OF_FLOWS_TO_DISPLAY) break;
    }
    return picked;
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
