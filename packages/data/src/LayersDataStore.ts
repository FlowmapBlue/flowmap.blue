import createVanilla from 'zustand/vanilla';
import {
  ColorsRGBA,
  DataFormat,
  DEFAULT_CONFIG,
  DEFAULT_VIEWPORT,
  DiffColorsRGBA,
  fetchCsv,
  fetchGsheet,
  Flow,
  FlowMapState,
  FlowTotals,
  getColorsRGBA,
  getDiffColorsRGBA,
  getFlowMapColors,
  getFlowsForFlowMapLayer,
  getInitialState,
  getLocationCentroid,
  getLocations,
  getLocationsForFlowMapLayer,
  getLocationsHavingFlows,
  getTimeExtent,
  getTimeGranularityKey,
  getTimeGranularityByKey,
  getTotalCountsByTime,
  getTotalFilteredCount,
  getTotalUnfilteredCount,
  isDiffColors,
  LayersData,
  LoadingState,
  LoadingStatus,
  Location,
  MAX_PITCH,
  MAX_ZOOM_LEVEL,
  MIN_PITCH,
  MIN_ZOOM_LEVEL,
  ViewportProps,
  getLocationsById,
  getClusterIndex,
} from './';
import getColors from './colors';
import prepareLayersData from './prepareLayersData';
import prepareFlows from './prepareFlows';
import { getViewStateForLocations } from './getViewStateForFeatures';
import { Cluster } from '@flowmap.gl/cluster';

export type LayersDataStore = {
  locations: LoadingState<Location[]> | undefined;
  flows: LoadingState<Flow[]> | undefined;
  clearData: () => void;
  loadLocations: (locationsUrl: string, dataFormat: DataFormat) => void;
  loadFlows: (flowsUrl: string, dataFormat: DataFormat) => void;
  getLayersData: () => LayersData | undefined;
  getFlowMapColorsRGBA(): DiffColorsRGBA | ColorsRGBA;
  // dispatch: (action: Action) => void;
  flowMapState: FlowMapState;
  getViewportForLocations: ([width, height]: [number, number]) => ViewportProps | undefined;
  getFlowTotals: () => FlowTotals | undefined;
  getFlowByIndex: (index: number) => Flow | undefined;
  getLocationById: (id: string) => Location | Cluster | undefined;
};

const INITIAL = {
  locations: undefined,
  flows: undefined,
  flowMapState: getInitialState(DEFAULT_CONFIG, DEFAULT_VIEWPORT, ''),
};

export function createLayersDataStore() {
  const store = createVanilla<LayersDataStore>(
    (set, get, api): LayersDataStore => {
      function getPropsForSelectors() {
        const { locations, flows } = get();
        return {
          locations: locations?.status === LoadingStatus.DONE ? locations.data : undefined,
          flows: flows?.status === LoadingStatus.DONE ? flows.data : undefined,
        };
      }

      return {
        ...INITIAL,

        // dispatch: action => set(state => ({ flowMapState: mainReducer(state.flowMapState, action) })),

        clearData: () => {
          set(INITIAL);
        },

        loadLocations: async (locationsUrl, dataFormat) => {
          const fetchFn = getFetchFunction(dataFormat);
          if (!fetchFn) return;
          const result = await fetchFn(locationsUrl);
          if (result.status === LoadingStatus.DONE) {
            set({
              locations: {
                ...result,
                data: result.data.map(
                  (row: any) =>
                    ({
                      id: `${row.id}`,
                      name: `${row.name || row.id}`,
                      lat: Number(row.lat),
                      lon: Number(row.lon),
                    } as Location)
                ),
              },
            });
          } else {
            set({ locations: { status: LoadingStatus.ERROR } });
          }
        },

        loadFlows: async (flowsUrl, dataFormat) => {
          const fetchFn = getFetchFunction(dataFormat);
          if (!fetchFn) return;
          const result = await fetchFn(flowsUrl);
          if (result.status === LoadingStatus.DONE) {
            set({ flows: { ...result, data: prepareFlows(result.data) } });
          } else {
            set({ flows: { status: LoadingStatus.ERROR } });
          }
        },

        getFlowMapColorsRGBA() {
          const { flowMapState } = get();
          const flowMapColors = getFlowMapColors(flowMapState, getPropsForSelectors());
          return isDiffColors(flowMapColors)
            ? getDiffColorsRGBA(flowMapColors)
            : getColorsRGBA(flowMapColors);
        },

        getFlowTotals() {
          const { flowMapState } = get();
          const props = getPropsForSelectors();
          return {
            filteredCount: getTotalFilteredCount(flowMapState, props),
            unfilteredCount: getTotalUnfilteredCount(flowMapState, props),
            timeGranularityKey: getTimeGranularityKey(flowMapState, props),
            timeExtent: getTimeExtent(flowMapState, props),
            totalCountsByTime: getTotalCountsByTime(flowMapState, props),
          };
        },

        getViewportForLocations([width, height]) {
          const props = getPropsForSelectors();
          if (!props) {
            return undefined;
          }
          const { flowMapState } = get();
          const { adjustViewportToLocations, viewport } = flowMapState;
          if (!adjustViewportToLocations) {
            return undefined;
          }

          const allLocations = getLocations(flowMapState, props);

          if (allLocations != null) {
            const locationsHavingFlows = getLocationsHavingFlows(flowMapState, props);
            let draft = getViewStateForLocations(
              locationsHavingFlows ?? allLocations,
              getLocationCentroid,
              [width, height],
              { pad: 0.1 }
            );

            if (!draft.zoom) {
              draft = {
                zoom: 1,
                latitude: 0,
                longitude: 0,
              };
            }

            return {
              width,
              height,
              ...draft,
              minZoom: MIN_ZOOM_LEVEL,
              maxZoom: MAX_ZOOM_LEVEL,
              minPitch: MIN_PITCH,
              maxPitch: MAX_PITCH,
              bearing: 0,
              pitch: 0,
              altitude: 1.5,
            };
          }

          return undefined;
        },

        // TODO: layers should take the state props affecting flow filtering/clustering/colors/etc
        //       then call selectors to prepare flows and locations
        getLayersData() {
          // There's no point in keeping layersData in the store because it won't be usable in
          // the worker context after it's transferred to the main thread.
          const { getFlowMapColorsRGBA, flowMapState } = get();
          // TODO: start a new worker here and terminate it in case a new getLayersData request arrives
          const locations = getLocationsForFlowMapLayer(flowMapState, getPropsForSelectors());
          const flows = getFlowsForFlowMapLayer(flowMapState, getPropsForSelectors());
          if (locations && flows) {
            return prepareLayersData(locations, flows, getFlowMapColorsRGBA());
          } else {
            return undefined;
          }
        },

        getFlowByIndex(index: number) {
          const { flowMapState } = get();
          const flows = getFlowsForFlowMapLayer(flowMapState, getPropsForSelectors());
          if (!flows) return undefined;
          return flows[index];
        },

        getLocationById(id: string) {
          const { flowMapState } = get();
          const clusterIndex = getClusterIndex(flowMapState, getPropsForSelectors());
          const cluster = clusterIndex?.getClusterById(id);
          if (cluster) {
            return cluster;
          }
          const locationsById = getLocationsById(flowMapState, getPropsForSelectors());
          if (!locationsById) return undefined;
          return locationsById.get(id);
        },
      };
    }
  );
  // const {getState, setState, subscribe, destroy} = store;
  return store;
}

function getFetchFunction(dataFormat: DataFormat) {
  switch (dataFormat) {
    case 'csv':
      return fetchCsv;
    case 'gsheets':
      return fetchGsheet;
    default:
      console.error(`Unsupported data format: ${dataFormat}`);
      return undefined;
  }
}
