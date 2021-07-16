import { Column, LegendTitle, Row } from './Boxes';
import { Button, Popover, Slider, Switch } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import * as React from 'react';
import { SyntheticEvent } from 'react';
import styled from '@emotion/styled';
import { ActionType, FlowMapStore } from '@flowmap.blue/data';
import ColorSchemeSelector from './ColorSchemeSelector';
import { UseStore } from 'zustand';

const SettingsOuter = styled.div`
  width: 290px;
  font-size: 12px;
`;

const StyledSwitch = styled(Switch)`
  margin-bottom: 0;
  align-self: flex-start;
  white-space: nowrap;
`;

interface Props {
  useFlowMapStore: UseStore<FlowMapStore>;
}

const SettingsPopover: React.FC<Props> = ({ useFlowMapStore }) => {
  // clusterZoom={getClusterZoom(state, props)}
  // availableClusterZoomLevels={getAvailableClusterZoomLevels(state, props)}
  const clusterZoom = 5;
  const availableClusterZoomLevels = [2, 3, 4, 5];

  const dispatch = useFlowMapStore((state: FlowMapStore) => state.dispatch);
  const settingsState = useFlowMapStore((state: FlowMapStore) => state.flowMapState.settingsState);
  const { darkMode } = settingsState;

  const handleToggleClustering = (evt: SyntheticEvent) => {
    const value = (evt.target as HTMLInputElement).checked;
    dispatch({
      type: ActionType.SET_CLUSTERING_ENABLED,
      clusteringEnabled: value,
    });
  };

  const handleToggleClusteringAuto = (evt: SyntheticEvent) => {
    const value = (evt.target as HTMLInputElement).checked;
    // const clusterIndex = getClusterIndex(state, props);
    // const handleChangeClusteringAuto = (value: boolean) => {
    //   if (!value) {
    //     if (clusterIndex) {
    //       const { availableZoomLevels } = clusterIndex;
    //       if (availableZoomLevels != null) {
    //         dispatch({
    //           type: ActionType.SET_MANUAL_CLUSTER_ZOOM,
    //           manualClusterZoom:
    //             findAppropriateZoomLevel(clusterIndex.availableZoomLevels, viewport.zoom),
    //         });
    //       }
    //     }
    //   }
    //   dispatch({
    //     type: ActionType.SET_CLUSTERING_AUTO,
    //     clusteringAuto: value,
    //   });
  };

  const handleChangeManualClusterZoom = (index: number) => {
    dispatch({
      type: ActionType.SET_MANUAL_CLUSTER_ZOOM,
      manualClusterZoom: availableClusterZoomLevels
        ? availableClusterZoomLevels[availableClusterZoomLevels.length - 1 - index]
        : undefined,
    });
  };

  const handleToggleDarkMode = (evt: SyntheticEvent) => {
    const value = (evt.target as HTMLInputElement).checked;
    dispatch({
      type: ActionType.SET_DARK_MODE,
      darkMode: value,
    });
  };

  const handleToggleFadeEnabled = (evt: SyntheticEvent) => {
    const value = (evt.target as HTMLInputElement).checked;
    dispatch({
      type: ActionType.SET_FADE_ENABLED,
      fadeEnabled: value,
    });
  };

  const handleToggleBaseMap = (evt: SyntheticEvent) => {
    const value = (evt.target as HTMLInputElement).checked;
    dispatch({
      type: ActionType.SET_BASE_MAP_ENABLED,
      baseMapEnabled: value,
    });
  };

  const handleChangeFadeAmount = (value: number) => {
    dispatch({
      type: ActionType.SET_FADE_AMOUNT,
      fadeAmount: value,
    });
  };

  const handleChangeBaseMapOpacity = (value: number) => {
    dispatch({
      type: ActionType.SET_BASE_MAP_OPACITY,
      baseMapOpacity: value,
    });
  };

  const handleChangeColorScheme = (colorSchemeKey: string) => {
    dispatch({
      type: ActionType.SET_COLOR_SCHEME,
      colorSchemeKey,
    });
  };

  const handleToggleAnimation = (evt: SyntheticEvent) => {
    const value = (evt.target as HTMLInputElement).checked;
    dispatch({
      type: ActionType.SET_ANIMATION_ENABLED,
      animationEnabled: value,
    });
  };

  const handleToggleLocationTotals = (evt: SyntheticEvent) => {
    const value = (evt.target as HTMLInputElement).checked;
    dispatch({
      type: ActionType.SET_LOCATION_TOTALS_ENABLED,
      locationTotalsEnabled: value,
    });
  };

  const handleToggleAdaptiveScales = (evt: SyntheticEvent) => {
    const value = (evt.target as HTMLInputElement).checked;
    dispatch({
      type: ActionType.SET_ADAPTIVE_SCALES_ENABLED,
      adaptiveScalesEnabled: value,
    });
  };

  return (
    <Popover
      usePortal={false}
      hoverOpenDelay={0}
      hoverCloseDelay={0}
      content={
        <SettingsOuter>
          <Column spacing={10} padding="12px 20px">
            <LegendTitle>Settings</LegendTitle>
            <Row spacing={5}>
              <div style={{ whiteSpace: 'nowrap' }}>Color scheme</div>
              <ColorSchemeSelector
                selected={settingsState.colorSchemeKey}
                reverse={darkMode}
                onChange={handleChangeColorScheme}
              />
            </Row>
            <Column spacing={10}>
              <StyledSwitch
                checked={settingsState.darkMode}
                label="Dark mode"
                onChange={handleToggleDarkMode}
              />
              <Row spacing={15}>
                <StyledSwitch
                  checked={settingsState.fadeEnabled}
                  label="Fade"
                  onChange={handleToggleFadeEnabled}
                />
                {settingsState.fadeEnabled && (
                  <Slider
                    value={settingsState.fadeAmount}
                    min={0}
                    max={100}
                    stepSize={1}
                    labelRenderer={false}
                    showTrackFill={false}
                    onChange={handleChangeFadeAmount}
                  />
                )}
              </Row>
              <Row spacing={15}>
                <StyledSwitch
                  checked={settingsState.baseMapEnabled}
                  label="Base map"
                  onChange={handleToggleBaseMap}
                />
                {settingsState.baseMapEnabled && (
                  <Slider
                    value={settingsState.baseMapOpacity}
                    min={0}
                    max={100}
                    stepSize={1}
                    labelRenderer={false}
                    showTrackFill={false}
                    onChange={handleChangeBaseMapOpacity}
                  />
                )}
              </Row>
              <StyledSwitch
                checked={settingsState.animationEnabled}
                label="Animate flows"
                onChange={handleToggleAnimation}
              />
              <StyledSwitch
                checked={settingsState.adaptiveScalesEnabled}
                label="Dynamic range adjustment"
                onChange={handleToggleAdaptiveScales}
              />
              <StyledSwitch
                checked={settingsState.locationTotalsEnabled}
                label="Location totals"
                onChange={handleToggleLocationTotals}
              />
              {availableClusterZoomLevels && (
                <>
                  <Row spacing={15}>
                    <StyledSwitch
                      checked={settingsState.clusteringEnabled}
                      label="Clustering"
                      onChange={handleToggleClustering}
                    />
                    {settingsState.clusteringEnabled && (
                      <StyledSwitch
                        checked={settingsState.clusteringAuto}
                        innerLabel={settingsState.clusteringAuto ? 'Auto' : 'Manual'}
                        onChange={handleToggleClusteringAuto}
                      />
                    )}
                  </Row>
                  {settingsState.clusteringEnabled && !settingsState.clusteringAuto && (
                    <Row spacing={15}>
                      <div style={{ whiteSpace: 'nowrap', marginLeft: 38 }}>Level</div>
                      <Slider
                        value={
                          availableClusterZoomLevels.length -
                          1 -
                          availableClusterZoomLevels.indexOf(
                            settingsState.manualClusterZoom != null
                              ? settingsState.manualClusterZoom
                              : clusterZoom || 0
                          )
                        }
                        min={0}
                        max={availableClusterZoomLevels.length - 1}
                        stepSize={1}
                        labelRenderer={false}
                        showTrackFill={false}
                        onChange={handleChangeManualClusterZoom}
                      />
                    </Row>
                  )}
                </>
              )}
            </Column>
          </Column>
        </SettingsOuter>
      }
    >
      <Button title="Settings…" icon={IconNames.COG} />
    </Popover>
  );
};

export default SettingsPopover;
