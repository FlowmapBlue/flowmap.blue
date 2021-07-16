import React, { useMemo, useState } from 'react';
import Nav from './Nav';
import styled from '@emotion/styled';
import { Button, Classes, H5, Intent, TextArea } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Route, Switch, useHistory } from 'react-router-dom';
import { dsvFormat } from 'd3-dsv';
import { Location as HistoryLocation } from 'history';
import FlowMap, { MapContainer, prepareFlows } from '@flowmap.blue/core';
import {
  prepareLayersData,
  createFlowMapStore,
  DEFAULT_CONFIG,
  Flow,
  Location,
  createLayersDataStore,
  LoadingStatus,
} from '@flowmap.blue/data';
import { useAppStore } from './AppStore';

interface Props {
  location: HistoryLocation<{
    locations: Location[];
    flows: Flow[];
  }>;
}

const FlowMapContainer = (props: Props) => {
  const { flows, locations } = props.location.state;
  const useFlowMapStore = useMemo(createFlowMapStore, [flows, locations]);
  const layersDataStore = useMemo(createLayersDataStore, [flows, locations]);
  const colors = useMemo(() => layersDataStore.getState().getFlowMapColorsRGBA(), [
    layersDataStore,
  ]);
  const layersData = useMemo(
    () => ({
      status: LoadingStatus.DONE,
      data: prepareLayersData(locations, flows, colors),
    }),
    [flows, locations, colors]
  );

  return (
    <MapContainer>
      {layersData.status === LoadingStatus.DONE && (
        <FlowMap
          useAppStore={useAppStore}
          useFlowMapStore={useFlowMapStore}
          inBrowser={true}
          layersData={layersData}
          config={DEFAULT_CONFIG}
        />
      )}
    </MapContainer>
  );
};

const ContentBody = styled.div`
  padding: 30px 30px;
  & h1 {
    font-size: 2rem;
  }
  & li {
    margin: 0.5em 0;
  }
  margin: auto;
  max-width: 1500px;
`;

const ButtonArea = styled.div`
  text-align: right;
`;

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: min-content 1fr min-content;
  column-gap: 1rem;
  row-gap: 0.5rem;
  align-items: center;
  & > textarea {
    min-height: 350px;
    height: 100%;
    font-size: 12px !important;
    white-space: pre;
    font-family: monospace;
  }
`;

const InBrowserFlowMap = () => {
  const [locationsCsv, setLocationsCsv] = useState(
    `id,name,lat,lon
1,New York,40.713543,-74.011219
2,London,51.507425,-0.127738
3,Rio de Janeiro,-22.906241,-43.180244`
  );
  const [flowsCsv, setFlowsCsv] = useState(
    `origin,dest,count
1,2,42
2,1,51
3,1,50
2,3,40
1,3,22
3,2,42`
  );
  const history = useHistory();
  const handleVisualize = () => {
    history.push('/in-browser/visualize', {
      locations: dsvFormat(',').parse(locationsCsv, (row: any) => ({
        ...row,
        lat: +row.lat,
        lon: +row.lon,
      })),
      flows: prepareFlows(dsvFormat(',').parse(flowsCsv)),
    });
  };
  return (
    <Switch>
      <Route path="/in-browser/visualize" component={FlowMapContainer} />
      <>
        <Nav />
        <ContentBody className={Classes.DARK}>
          <h1>In-browser flow map</h1>
          <section>
            <p>
              With this tool you can visualize OD-data as a flow map directly in your browser
              without the need to upload it to Google Sheets. The data will remain in your browser
              and <i>will not be uploaded anywhere</i>. Note that the visualization will be lost as
              soon as you close the browser window with it. There will be no URL to come back to or
              to share with other people.
            </p>
          </section>
          <Container>
            <H5>Locations CSV</H5>
            <H5>Flows CSV</H5>
            <TextArea
              growVertically={false}
              large={true}
              intent={Intent.PRIMARY}
              onChange={(event) => setLocationsCsv(event.target.value)}
              value={locationsCsv}
            />
            <TextArea
              growVertically={false}
              large={true}
              intent={Intent.PRIMARY}
              onChange={(event) => setFlowsCsv(event.target.value)}
              value={flowsCsv}
            />
          </Container>
          <ButtonArea>
            <Button icon={IconNames.CHART} large={true} onClick={handleVisualize}>
              Visualize
            </Button>
          </ButtonArea>
        </ContentBody>
      </>
    </Switch>
  );
};

export default InBrowserFlowMap;
