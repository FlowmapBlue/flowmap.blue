import throttle from 'lodash.throttle';
import create from 'zustand';
import createVanilla from 'zustand/vanilla';
import {
  createFlowMapStore,
  DataFormat,
  Flow,
  Location,
  FlowTotals,
  LayersData,
  LoadingState,
  LoadingStatus,
  TooltipProps,
  ViewportProps,
  WorkerDataProvider,
} from '@flowmap.blue/data';
import { Cluster } from '@flowmap.gl/cluster';

export type AppStore = {
  reset: () => void;
  locationsStatus: LoadingStatus | undefined;
  flowsStatus: LoadingStatus | undefined;
  layersData: LoadingState<LayersData> | undefined;
  flowTotals: LoadingState<FlowTotals> | undefined;
  loadLocations: (locationsUrl: string, dataFormat?: DataFormat) => Promise<void>;
  loadFlows: (locationsUrl: string, dataFormat?: DataFormat) => Promise<void>;
  // getFlowMapColorsRGBA(): ColorsRGBA;
  // getLayersData(): LayersData | undefined;
  // dispatch: (action: Action) => void;
  // flowMapState: FlowMapState | undefined;
  // setFlowMapState: (flowMapState: FlowMapState) => void;
  updateLayersData: () => void;
  getViewportForLocations: ([width, height]: [number, number]) => Promise<
    ViewportProps | undefined
  >;
  updateFlowTotals: () => void;
  getFlowByIndex: (index: number) => Promise<Flow | undefined>;
  getLocationById: (id: string) => Promise<Location | Cluster | undefined>;
  tooltip: TooltipProps | undefined;
  setTooltip: (tooltip: TooltipProps | undefined) => void;
};

const INITIAL_STATE = {
  tooltip: undefined,
  locationsStatus: undefined,
  flowsStatus: undefined,
  layersData: undefined,
  flowTotals: undefined,
};

export function createCoreAppStore(workerDataProvider: WorkerDataProvider) {
  const coreAppStore = createVanilla<AppStore>(
    (set, get): AppStore => {
      async function updateLayersData() {
        const { locationsStatus, flowsStatus } = get();
        if (locationsStatus === LoadingStatus.DONE && flowsStatus === LoadingStatus.DONE) {
          // set({ layersData: { status: LoadingStatus.LOADING }});
          try {
            const layersData = await workerDataProvider.getLayersData();
            // TODO: error handling
            set({ layersData: { status: LoadingStatus.DONE, data: layersData! } });
          } catch (err) {
            console.error(err);
            set({ layersData: { status: LoadingStatus.ERROR } });
          }
        } else {
          if (locationsStatus === LoadingStatus.ERROR || flowsStatus === LoadingStatus.ERROR) {
            set({ layersData: { status: LoadingStatus.ERROR } });
          }
        }
      }

      async function updateFlowTotals() {
        set({
          flowTotals: {
            ...get().flowTotals,
            status: LoadingStatus.LOADING,
          },
        });
        try {
          const totals = await workerDataProvider.getFlowTotals();
          set({
            flowTotals: totals
              ? {
                  status: LoadingStatus.DONE,
                  data: totals,
                }
              : undefined,
          });
        } catch (error) {
          console.error(error);
          set({
            flowTotals: {
              ...get().flowTotals,
              status: LoadingStatus.ERROR,
            },
          });
        }
      }
      return {
        ...INITIAL_STATE,
        updateLayersData,
        // flowMapState: undefined,
        // setFlowMapState: async (flowMapState) => {
        //   const next = {
        //     ...flowMapState,
        //     viewport: pickViewportProps(flowMapState.viewport),
        //   };
        //   console.log(next);
        //   await workerDataProvider.setFlowMapState(next);
        //   await updateLayersData();
        // },

        //getInitialState(DEFAULT_CONFIG, [0,0], ''),
        // dispatch: async action => {
        //   console.log('store.dispatch',action);
        //   set(state => ({ flowMapState: mainReducer(state.flowMapState, action) }));
        //   await workerDataProvider.dispatch(action);
        // },
        // clearData: async () => {
        //   set({
        //     layersData: { status: LoadingStatus.LOADING },
        //   });
        //   await workerDataProvider.clearData();
        // },

        async reset() {
          set(INITIAL_STATE);
          await workerDataProvider.clearData();
        },

        loadLocations: async (locationsUrl, dataFormat = 'csv') => {
          const locationsStatus = await workerDataProvider.loadLocations(locationsUrl, dataFormat);
          set({
            layersData: { status: LoadingStatus.LOADING },
            locationsStatus: locationsStatus,
          });
          await updateLayersData();
        },
        loadFlows: async (flowsUrl, dataFormat = 'csv') => {
          const { layersData } = get();
          set({
            layersData: { ...layersData, status: LoadingStatus.LOADING },
          });
          // The above should happen before the loading has finished
          set({
            flowsStatus: await workerDataProvider.loadFlows(flowsUrl, dataFormat),
          });
          await updateLayersData();
          await updateFlowTotals();
        },

        getViewportForLocations: async (dims) =>
          await workerDataProvider.getViewportForLocations(dims),

        getFlowByIndex: async (index) => await workerDataProvider.getFlowByIndex(index),

        getLocationById: async (id) => await workerDataProvider.getLocationById(id),

        updateFlowTotals,

        setTooltip(tooltip) {
          set({ tooltip });
        },
      };
    }
  );

  const useFlowMapStore = createFlowMapStore();
  const update = (withTotals: boolean) =>
    // When map state changes, get the updated layers data from the worker
    throttle(
      async () => {
        const { flowMapState } = useFlowMapStore.getState();
        await workerDataProvider.setFlowMapState(flowMapState);
        await coreAppStore.getState().updateLayersData();
        if (withTotals) {
          await coreAppStore.getState().updateFlowTotals();
        }
      },
      100,
      { leading: true, trailing: true }
    );

  useFlowMapStore.subscribe(update(false), (state) => state.flowMapState.viewport);
  useFlowMapStore.subscribe(update(false), (state) => state.flowMapState.settingsState);
  useFlowMapStore.subscribe(update(true), (state) => state.flowMapState.filterState);

  const useAppStore = create<AppStore>(coreAppStore);
  return {
    useAppStore,
    useFlowMapStore,
  };
}
