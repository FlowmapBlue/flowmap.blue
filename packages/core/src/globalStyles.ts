import { css } from '@emotion/core';
import { Classes, Colors } from '@blueprintjs/core';
import { ColorScheme } from '@flowmap.blue/data';

const globalStyles = css`
  @import url('https://fonts.googleapis.com/css?family=Sarabun:400,700');

  html,
  body {
    margin: 0;
    background-color: ${'rgb(35, 48, 66)'};
    font-size: 13pt;
  }

  body,
  * {
    font-family: 'Sarabun', sans-serif;
  }

  a,
  a:visited {
    color: ${ColorScheme.primary};
  }
  .${Classes.DARK} {
    a,
    a:visited {
      color: ${Colors.BLUE5};
    }
  }

  .mapboxgl-control-container {
    a,
    a:visited {
      color: ${Colors.DARK_GRAY1};
    }
  }

  .mapboxgl-ctrl-bottom-left {
    bottom: -5px;
    right: 5px;
    left: unset;
  }

  .mapboxgl-compact {
    display: none;
  }

  .mapbox-improve-map {
    display: none;
  }

  .mapboxgl-ctrl-bottom-right {
    right: 95px;
    bottom: 3px;
  }

  section {
    margin-bottom: 4em;
  }
  #no-token-warning {
    bottom: 30px;
    top: unset !important;
    left: 10px !important;
  }
`;

export default globalStyles;
