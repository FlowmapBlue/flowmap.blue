import { createLayersDataStore, FlowMapState, DataFormat, Flow, Location } from './';
import { transfer } from 'comlink';
import { Cluster } from '@flowmap.gl/cluster';

const layersDataStore = createLayersDataStore();
const { getState, setState, subscribe, destroy } = layersDataStore;

export default class WorkerDataProvider {
  // async dispatch(action: Action) {
  //   console.log('WorkerDataProvider.dispatch',action);
  //   await getState().dispatch(action);
  // }

  async setFlowMapState(flowMapState: FlowMapState) {
    await setState({ flowMapState });
  }

  async clearData() {
    await getState().clearData();
  }

  async loadLocations(locationsUrl: string, dataFormat: DataFormat) {
    await getState().loadLocations(locationsUrl, dataFormat);
    return getState().locations!.status;
  }

  async loadFlows(flowsUrl: string, dataFormat: DataFormat) {
    await getState().loadFlows(flowsUrl, dataFormat);
    return getState().flows!.status;
  }

  async getViewportForLocations(dims: [number, number]) {
    return await getState().getViewportForLocations(dims);
  }

  async getFlowTotals() {
    return await getState().getFlowTotals();
  }

  async getFlowByIndex(index: number) {
    return await getState().getFlowByIndex(index);
  }

  async getLocationById(id: string): Promise<Location | Cluster | undefined> {
    return await getState().getLocationById(id);
  }

  getLayersData() {
    const layersData = getState().getLayersData();
    if (layersData) {
      //  Unlike pass-by-reference, the 'version' from the calling context is no longer available once
      //  transferred. Its ownership is transferred to the new context. For example, when transferring an
      //  ArrayBuffer from your main app to a worker script, the original ArrayBuffer is cleared and no
      //  longer usable. Its content is (quite literally) transferred to the worker context.
      const transfers = [
        ...Object.values(layersData.circleAttributes.attributes).map((v) => v.value.buffer),
        ...Object.values(layersData.lineAttributes.attributes).map((v) => v.value.buffer),
      ];
      return transfer(layersData, transfers);
    }
    return layersData;
  }
}
