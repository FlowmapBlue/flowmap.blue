import { Action, DEFAULT_VIEWPORT, FlowMapState } from './';
import create from 'zustand';
import { getInitialState, mainReducer } from './FlowMap.state';
import { DEFAULT_CONFIG } from './config';

export type FlowMapStore = {
  setFlowMapState: (state: FlowMapState) => void;
  flowMapState: FlowMapState;
  dispatch: (action: Action) => void;
};

export function createFlowMapStore() {
  return create<FlowMapStore>(
    (set, get): FlowMapStore => {
      return {
        // TODO: this should be done through dispatch
        flowMapState: getInitialState(DEFAULT_CONFIG, DEFAULT_VIEWPORT, ''),
        setFlowMapState: (nextState) => set({ flowMapState: nextState }),
        dispatch: async (action) => {
          set((state) => ({ flowMapState: mainReducer(state.flowMapState, action) }));
          // await dataProvider.dispatch(action);
        },
      };
    }
  );
}
