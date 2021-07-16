import { Config, ConfigPropName } from './types';

export const DEFAULT_MAP_STYLE_LIGHT = 'mapbox://styles/mapbox/light-v10';
export const DEFAULT_MAP_STYLE_DARK = 'mapbox://styles/mapbox/dark-v10';
export const DEFAULT_CONFIG: Config = {
  [ConfigPropName.MAPBOX_ACCESS_TOKEN]: process.env.REACT_APP_MapboxAccessToken,
  'msg.locationTooltip.incoming': 'Incoming trips',
  'msg.locationTooltip.outgoing': 'Outgoing trips',
  'msg.locationTooltip.internal': 'Internal & round trips',
  'msg.flowTooltip.numOfTrips': 'Number of trips',
  'msg.totalCount.allTrips': '{0} trips',
  'msg.totalCount.countOfTrips': '{0} of {1} trips',
};

export function parseBoolConfigProp(value: string | undefined) {
  if (value != null) {
    const lower = value.toLowerCase();
    if (lower === 'yes' || lower === 'true' || lower === '1') return true;
  }
  return false;
}

export function parseNumberConfigProp(value: string | undefined, defaultValue: number) {
  if (value != null) {
    const numVal = +value;
    if (isFinite(numVal)) return numVal;
  }
  return defaultValue;
}

export function getMapboxMapStyle(config: Config, darkMode: boolean) {
  const configMapStyle = config[ConfigPropName.MAPBOX_MAP_STYLE];
  if (configMapStyle) {
    if (darkMode === parseBoolConfigProp(config[ConfigPropName.COLORS_DARK_MODE])) {
      return configMapStyle;
    }
  }
  return darkMode ? DEFAULT_MAP_STYLE_DARK : DEFAULT_MAP_STYLE_LIGHT;
}
