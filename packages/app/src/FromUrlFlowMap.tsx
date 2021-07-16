// http://localhost:7000/from-url?flows=https://gist.githubusercontent.com/ilyabo/a7b9701424257146b571149d92a14926/raw/2e9e1e9bcf64cf0090781b451037229ccb78e1b1/flows.csv&locations=https://gist.githubusercontent.com/ilyabo/a7b9701424257146b571149d92a14926/raw/2e9e1e9bcf64cf0090781b451037229ccb78e1b1/locations.csv
// http://localhost:7000/from-url?v=46.735655191986154,8.172725132201116,6.657&colors.darkMode=no&flows=https://gist.githubusercontent.com/ilyabo/a7b9701424257146b571149d92a14926/raw/2e9e1e9bcf64cf0090781b451037229ccb78e1b1/flows.csv&locations=https://gist.githubusercontent.com/ilyabo/a7b9701424257146b571149d92a14926/raw/2e9e1e9bcf64cf0090781b451037229ccb78e1b1/locations.csv
// Personenverkehr in der Schweiz - PW  http://localhost:7000/from-url?colors.darkMode=no&flows=https%3A//docs.google.com/spreadsheets/d/e/2PACX-1vRYROhHQxi_WCFs0spjfJ3do4z2eD61dXhM4Lml0Ty3YN4pqCWfDitMCnYgKc8Zt2B6ge4xGg-xUdqB/pub%3Fgid%3D1812990135%26single%3Dtrue%26output%3Dcsv&locations=https%3A//docs.google.com/spreadsheets/d/e/2PACX-1vRYROhHQxi_WCFs0spjfJ3do4z2eD61dXhM4Lml0Ty3YN4pqCWfDitMCnYgKc8Zt2B6ge4xGg-xUdqB/pub%3Fgid%3D877058976%26single%3Dtrue%26output%3Dcsv
// Personenverkehr in der Schweiz - Velo  http://localhost:7000/from-url?colors.darkMode=no&flows=https%3A//docs.google.com/spreadsheets/d/e/2PACX-1vRYROhHQxi_WCFs0spjfJ3do4z2eD61dXhM4Lml0Ty3YN4pqCWfDitMCnYgKc8Zt2B6ge4xGg-xUdqB/pub%3Fgid%3D229626141%26single%3Dtrue%26output%3Dcsv&locations=https%3A//docs.google.com/spreadsheets/d/e/2PACX-1vRYROhHQxi_WCFs0spjfJ3do4z2eD61dXhM4Lml0Ty3YN4pqCWfDitMCnYgKc8Zt2B6ge4xGg-xUdqB/pub%3Fgid%3D877058976%26single%3Dtrue%26output%3Dcsv

import React, { FC, useEffect } from 'react';
import FlowMap, { MapContainer, useDebounced } from '@flowmap.blue/core';
import {
  Config,
  DEFAULT_CONFIG,
  getInitialState,
  DEFAULT_VIEWPORT,
  LoadingStatus,
  stateToQueryString,
  FlowMapStore,
} from '@flowmap.blue/data';
import { useHistory } from 'react-router-dom';
import ErrorFallback from './ErrorFallback';
import { useAppStore, useFlowMapStore } from './AppStore';

export type Props = {
  inBrowser?: boolean;
  locationsUrl: string;
  flowsUrl: string;
  config: Config | undefined;
  dataFormat: 'csv' | 'gsheets';
};

const FromUrlFlowMap: FC<Props> = (props) => {
  const { config, locationsUrl, flowsUrl, dataFormat, inBrowser = false } = props;
  const history = useHistory();
  const setFlowMapState = useFlowMapStore((state) => state.setFlowMapState);
  const flowMapState = useFlowMapStore((state: FlowMapStore) => state.flowMapState);
  // const adjustViewportToLocations = useFlowMapStore(
  //   (state) => state.flowMapState.adjustViewportToLocations
  // );
  // const dispatch = useFlowMapStore(state => state.dispatch);
  const getViewportForLocations = useAppStore((state) => state.getViewportForLocations);
  const layersData = useAppStore((state) => state.layersData);
  const loadLocations = useAppStore((state) => state.loadLocations);
  const loadFlows = useAppStore((state) => state.loadFlows);
  const resetAppStore = useAppStore((state) => state.reset);
  useEffect(() => {
    (async () => {
      resetAppStore();
      setFlowMapState(
        getInitialState(
          DEFAULT_CONFIG,
          DEFAULT_VIEWPORT,
          ''
          // TODO: this initializes the viewport correctly, but for some reason
          //       leads to arrows not being rendered until zoomed
          /*, history.location.search*/
        )
      );
      await loadLocations(locationsUrl, dataFormat);
      if (config) {
        const dims: [number, number] = [window.innerWidth, window.innerHeight];
        const viewport = await getViewportForLocations(dims);
        if (viewport) {
          setFlowMapState({
            ...getInitialState(config, viewport, history.location.search),
            adjustViewportToLocations: false,
          });
        }
      }
    })();
  }, [config, locationsUrl]);
  useEffect(() => {
    loadFlows(flowsUrl, dataFormat);
  }, [flowsUrl]);
  const [updateQuerySearch] = useDebounced(
    () => {
      if (inBrowser) return;
      if (layersData?.status !== LoadingStatus.DONE) return;
      const locationSearch = `?${stateToQueryString(flowMapState)}`;
      if (locationSearch !== history.location.search) {
        history.replace({
          ...history.location, // keep location state for in-browser flowmap
          search: locationSearch,
        });
      }
    },
    250,
    [flowMapState, history.location.search]
  );
  useEffect(updateQuerySearch, [history, flowMapState]);

  if (layersData?.status === LoadingStatus.ERROR) {
    return <ErrorFallback error="Failed to fetch data" />;
  }

  return (
    <MapContainer>
      {config && layersData && (
        <FlowMap
          inBrowser={inBrowser}
          layersData={layersData}
          config={config}
          useFlowMapStore={useFlowMapStore}
          useAppStore={useAppStore}
        />
      )}
    </MapContainer>
  );
};

export default FromUrlFlowMap;
