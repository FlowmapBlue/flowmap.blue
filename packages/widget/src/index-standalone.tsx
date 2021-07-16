// import React from 'react';
// import * as ReactDOM from 'react-dom';
// import { ConfigPropName, DEFAULT_CONFIG, Flow, Location } from '@flowmap.blue/data';
// import { Router } from 'react-router-dom';
// import { createBrowserHistory } from 'history';
//
// import '@blueprintjs/core/lib/css/blueprint.css';
// import '@blueprintjs/select/lib/css/blueprint-select.css';
// import '@blueprintjs/icons/lib/css/blueprint-icons.css';
// import 'mapbox-gl/dist/mapbox-gl.css';
// import { css, Global } from '@emotion/core';
// import { FocusStyleManager } from '@blueprintjs/core';
// import FlowMap, { AppToaster, Fallback, globalStyles, MapContainer } from '@flowmap.blue/core';
// import { useAppStore, useFlowMapStore } from './AppStore';
//
// FocusStyleManager.onlyShowFocusOnTabs();
//
// const history = createBrowserHistory();
//
// const customGlobalStyles = css`
//   html,
//   body,
//   button,
//   select {
//     margin: 0;
//     background-color: ${'#2d3a4c'};
//     font-size: 13pt;
//   }
//   section {
//     margin-bottom: 4em;
//   }
// `;
//
// class ErrorBoundary extends React.Component<{}, {}> {
//   state = { hasError: false, error: null };
//
//   static getDerivedStateFromError(error: any) {
//     return {
//       hasError: true,
//       error,
//     };
//   }
//
//   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
//     console.error(error);
//   }
//
//   render() {
//     if (this.state.hasError) {
//       const { error } = this.state;
//       return (
//         <Fallback>
//           <>
//             Oops… Sorry, but something went wrong.
//             {error && (
//               <div
//                 style={{
//                   margin: '10px 0',
//                 }}
//               >
//                 {JSON.stringify(error)}
//               </div>
//             )}
//           </>
//         </Fallback>
//       );
//     }
//     return this.props.children;
//   }
// }
//
// export function init({
//   locations,
//   flows,
//   container,
//   mapboxAccessToken,
//   mapStyle,
//   clustering = true,
//   animation = false,
//   darkMode = false,
//   colorScheme,
//   fadeAmount,
//   baseMapOpacity,
// }: {
//   locations: Location[];
//   flows: Flow[];
//   container: HTMLElement;
//   mapboxAccessToken?: string;
//   mapStyle?: string;
//   clustering?: boolean;
//   animation?: boolean;
//   darkMode?: boolean;
//   colorScheme?: string;
//   fadeAmount?: number;
//   baseMapOpacity?: number;
// }) {
//   AppToaster.init(container);
//   ReactDOM.render(
//     <Router history={history}>
//       <ErrorBoundary>
//         <Global styles={globalStyles} />
//         <Global styles={customGlobalStyles} />
//         <MapContainer embed={true}>
//           <FlowMap
//             useAppStore={useAppStore}
//             useFlowMapStore={useFlowMapStore}
//             inBrowser={true}
//             embed={true}
//             layersData={undefined}
//             config={{
//               ...DEFAULT_CONFIG,
//               [ConfigPropName.MAPBOX_ACCESS_TOKEN]: mapboxAccessToken,
//               [ConfigPropName.MAPBOX_MAP_STYLE]: mapStyle,
//               [ConfigPropName.CLUSTER_ON_ZOOM]: clustering ? 'true' : 'false',
//               [ConfigPropName.ANIMATE_FLOWS]: animation ? 'true' : 'false',
//               [ConfigPropName.COLORS_DARK_MODE]: darkMode ? 'true' : 'false',
//               [ConfigPropName.COLORS_SCHEME]: colorScheme,
//               [ConfigPropName.FADE_AMOUNT]: fadeAmount != undefined ? `${fadeAmount}` : undefined,
//               [ConfigPropName.BASE_MAP_OPACITY]:
//                 baseMapOpacity != undefined ? `${baseMapOpacity}` : undefined,
//             }}
//           />
//         </MapContainer>
//       </ErrorBoundary>
//     </Router>,
//     container
//   );
// }
