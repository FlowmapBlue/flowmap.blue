import * as Cluster from '@flowmap.gl/cluster';
import { ClusterNode } from '@flowmap.gl/cluster';
import { TimeGranularity, TimeGranularityKey } from './time';

export interface Location {
  id: string;
  lon: number;
  lat: number;
  name: string;
}

export interface LocationTotals {
  incoming: number;
  outgoing: number;
  within: number;
}

export interface Flow {
  origin: string;
  dest: string;
  count: number;
  time?: Date;
  color?: string;
}

export type FlowTotals = {
  filteredCount: number | undefined;
  unfilteredCount: number | undefined;
  timeGranularityKey: TimeGranularityKey | undefined;
  timeExtent: [Date, Date] | undefined;
  totalCountsByTime: CountByTime[] | undefined;
};

export enum LocationFilterMode {
  ALL = 'ALL',
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  BETWEEN = 'BETWEEN',
}

export enum ConfigPropName {
  TITLE = 'title',
  DESCRIPTION = 'description',
  AUTHOR_NAME = 'createdBy.name',
  AUTHOR_URL = 'createdBy.url',
  SOURCE_NAME = 'source.name',
  SOURCE_URL = 'source.url',
  MAP_BBOX = 'map.bbox',
  IGNORE_ERRORS = 'ignore.errors',
  MAPBOX_ACCESS_TOKEN = 'mapbox.accessToken',
  MAPBOX_MAP_STYLE = 'mapbox.mapStyle',
  COLORS_SCHEME = 'colors.scheme',
  COLORS_DARK_MODE = 'colors.darkMode',
  ANIMATE_FLOWS = 'animate.flows',
  FADE_AMOUNT = 'fadeAmount',
  BASE_MAP_OPACITY = 'baseMapOpacity',
  CLUSTER_ON_ZOOM = 'clustering',
  FLOWS_SHEETS = 'flows.sheets',
}

export interface ConfigProp {
  property: ConfigPropName;
  value: string | undefined;
}

export type DataFormat = 'csv' | 'gsheets';

export type Config = Record<string | ConfigPropName, string | undefined>;

export const getFlowTime = (flow: Flow) => flow.time;
export const getFlowMagnitude = (flow: Flow) => +flow.count || 0;
export const getFlowOriginId = (flow: Flow) => flow.origin;
export const getFlowDestId = (flow: Flow) => flow.dest;
export const getLocationId = (loc: Location | ClusterNode) => loc.id;

export const getLocationCentroid = (location: Location | ClusterNode): [number, number] =>
  isLocationCluster(location)
    ? location.centroid
    : [(location as Location).lon, (location as Location).lat];

export function isLocationCluster(l: Location | ClusterNode): l is Cluster.Cluster {
  const { zoom } = l as Cluster.Cluster;
  return zoom !== undefined;
}

export interface CountByTime {
  time: Date;
  count: number;
}

export interface ViewportProps {
  width: number;
  height: number;
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
  altitude: number;
  maxZoom: number;
  minZoom: number;
  maxPitch: number;
  minPitch: number;
  transitionDuration?: number | 'auto';
  transitionInterpolator?: any;
  transitionInterruption?: any;
  transitionEasing?: any;
}

export declare type AsyncState<T> =
  | {
      loading: boolean;
      error?: undefined;
      value?: undefined;
    }
  | {
      loading?: false;
      error: Error;
      value?: undefined;
    }
  | {
      loading?: false;
      error?: undefined;
      value: T;
    };

export interface TargetBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TooltipProps {
  target: TargetBounds;
  placement?: string;
  content: any;
}
