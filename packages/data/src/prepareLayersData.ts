import { Flow, getFlowMagnitude, getLocationCentroid, getLocationId, Location } from './types';
import { ClusterNode } from '@flowmap.gl/cluster';
import { ColorsRGBA, DiffColorsRGBA } from '@flowmap.gl/core';
import { ascending, extent, max } from 'd3-array';
import { scaleLinear, scaleSqrt } from 'd3-scale';
import { getFlowColorScale, isDiffColorsRGBA } from './colors';
import { calcLocationTotals, getLocationMaxAbsTotalGetter } from './FlowMap.selectors';

function flatMap<S, T>(xs: S[], f: (item: S) => T | T[]): T[] {
  return xs.reduce((acc: T[], x: S) => acc.concat(f(x)), []);
}

export interface FlowCirclesLayerAttributes {
  length: number;
  attributes: {
    getPosition: { value: Float32Array; size: number };
    getColor: { value: Uint8Array; size: number };
    getRadius: { value: Float32Array; size: number };
  };
}

export interface FlowLinesLayerAttributes {
  length: number;
  attributes: {
    getSourcePosition: { value: Float32Array; size: number };
    getTargetPosition: { value: Float32Array; size: number };
    getThickness: { value: Float32Array; size: number };
    getColor: { value: Uint8Array; size: number };
    getEndpointOffsets: { value: Float32Array; size: number };
  };
}

export interface LayersData {
  circleAttributes: FlowCirclesLayerAttributes;
  lineAttributes: FlowLinesLayerAttributes;
}

export default function prepareLayersData(
  locations: (Location | ClusterNode)[],
  flows: Flow[],
  flowMapColors: ColorsRGBA | DiffColorsRGBA
): LayersData {
  // TODO: create more selectors to avoid recalculation?
  const { incoming, outgoing, within } = calcLocationTotals(locations, flows, {
    getFlowOriginId: (flow: Flow) => flow.origin,
    getFlowDestId: (flow: Flow) => flow.dest,
    getFlowMagnitude: (flow: Flow) => +flow.count,
  });
  const centroidsById = locations.reduce(
    (m, d) => (m.set(getLocationId(d), getLocationCentroid(d)), m),
    new Map<string, [number, number]>()
  );
  const getLocationMaxAbsTotal = getLocationMaxAbsTotalGetter(
    locations,
    (d) => incoming[getLocationId(d)] || 0,
    (d) => outgoing[getLocationId(d)] || 0,
    (d) => within[getLocationId(d)] || 0
  );
  const maxAbsTotalsById: Map<string, number> = locations.reduce(
    (m, d) => (m.set(getLocationId(d), getLocationMaxAbsTotal(d)), m),
    new Map<string, number>()
  );
  const circleSizeScale = scaleSqrt()
    .range([0, 15])
    .domain([0, max(maxAbsTotalsById.values()) || 0]);
  const thicknessScale = scaleLinear()
    .range([0, 0.5])
    .domain([0, max(flows, (f: Flow) => +f.count) || 0]);

  const flowMagnitudeExtent = extent(flows, (f) => getFlowMagnitude(f)) as [number, number];
  const flowColorScale = getFlowColorScale(flowMapColors, flowMagnitudeExtent, false);

  const circlePositions = new Float32Array(flatMap(locations, getLocationCentroid));
  const circleColor = isDiffColorsRGBA(flowMapColors)
    ? flowMapColors.positive.locationCircles.incoming
    : flowMapColors.locationCircles.incoming;
  const circleColors = new Uint8Array(flatMap(locations, (d) => circleColor));
  const circleRadii = new Float32Array(
    locations.map((d) => circleSizeScale(getLocationMaxAbsTotal(d) || 0) || 0)
  );

  const sourcePositions = new Float32Array(
    flatMap(flows, (d: Flow) => centroidsById.get(d.origin)!)
  );
  const targetPositions = new Float32Array(flatMap(flows, (d: Flow) => centroidsById.get(d.dest)!));
  const thicknesses = new Float32Array(flows.map((d: Flow) => thicknessScale(d.count) || 0));
  const endpointOffsets = new Float32Array(
    flatMap(flows, (d: Flow) => [
      circleSizeScale(maxAbsTotalsById.get(d.origin) || 0) || 0,
      circleSizeScale(maxAbsTotalsById.get(d.dest) || 0) || 0,
    ])
  );
  const flowLineColors = new Uint8Array(
    flatMap(flows, (f: Flow) => flowColorScale(getFlowMagnitude(f)))
  );

  return {
    circleAttributes: {
      length: locations.length,
      attributes: {
        getPosition: { value: circlePositions, size: 2 },
        getColor: { value: circleColors, size: 4 },
        getRadius: { value: circleRadii, size: 1 },
      },
    },
    lineAttributes: {
      length: flows.length,
      attributes: {
        getSourcePosition: { value: sourcePositions, size: 2 },
        getTargetPosition: { value: targetPositions, size: 2 },
        getThickness: { value: thicknesses, size: 1 },
        getColor: { value: flowLineColors, size: 4 },
        getEndpointOffsets: { value: endpointOffsets, size: 2 },
      },
    },
  };
}
