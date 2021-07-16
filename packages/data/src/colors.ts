import {
  interpolateCool,
  interpolateInferno,
  interpolateMagma,
  interpolatePlasma,
  interpolateViridis,
  interpolateWarm,
  schemeBlues,
  schemeBuGn,
  schemeBuPu,
  schemeGnBu,
  schemeGreens,
  schemeGreys,
  schemeOranges,
  schemeOrRd,
  schemePuBu,
  schemePuBuGn,
  schemePuRd,
  schemePurples,
  schemeRdPu,
  schemeReds,
  schemeYlGn,
  schemeYlGnBu,
  schemeYlOrBr,
  schemeYlOrRd,
} from 'd3-scale-chromatic';
import { range } from 'd3-array';
import { scalePow, scaleSequential, scaleSequentialPow } from 'd3-scale';
import { interpolateRgbBasis } from 'd3-interpolate';
import { Config } from './types';
import { color as d3color, hcl } from 'd3-color';

const DEFAULT_OUTLINE_COLOR = '#fff';
const DEFAULT_DIMMED_OPACITY = 0.4;
const DEFAULT_FLOW_MIN_COLOR = 'rgba(240,240,240,0.5)';
const DEFAULT_FLOW_COLOR_SCHEME = [DEFAULT_FLOW_MIN_COLOR, '#137CBD'];
const DEFAULT_LOCATION_AREA_COLOR = 'rgba(220,220,220,0.5)';

const DEFAULT_FLOW_COLOR_SCHEME_POSITIVE = [DEFAULT_FLOW_MIN_COLOR, '#f6654e'];
const DEFAULT_FLOW_COLOR_SCHEME_NEGATIVE = [DEFAULT_FLOW_MIN_COLOR, '#00a9cc'];

export type ColorScale = (value: number) => RGBA;
export type RGBA = [number, number, number, number];

const FALLBACK_COLOR_RGBA: RGBA = [255, 255, 255, 255];

export function opacityFloatToInteger(opacity: number): number {
  return Math.round(opacity * 255);
}

export function opacifyHex(hexCode: string, opacity: number): string {
  const c = d3color(hexCode);
  if (!c) {
    console.warn('Invalid color: ', hexCode);
    return `rgba(255, 255, 255, ${opacity})`;
  }
  const col = c.rgb();
  return `rgba(${col.r}, ${col.g}, ${col.b}, ${opacity})`;
}

export function colorAsRgba(color: string): RGBA {
  const col = d3color(color);
  if (!col) {
    console.warn('Invalid color: ', color);
    return FALLBACK_COLOR_RGBA;
  }
  const rgbColor = col.rgb();
  return [
    Math.floor(rgbColor.r),
    Math.floor(rgbColor.g),
    Math.floor(rgbColor.b),
    opacityFloatToInteger(col.opacity),
  ];
}

function colorAsRgbaOr(color: string | undefined, defaultColor: RGBA | string): RGBA {
  if (color) {
    return colorAsRgba(color);
  }
  if (typeof defaultColor === 'string') {
    return colorAsRgba(defaultColor);
  }
  return defaultColor;
}

const asScheme = (scheme: ReadonlyArray<ReadonlyArray<string>>) =>
  scheme[scheme.length - 1] as string[];

export enum ColorScheme {
  primary = '#137CBD',
}

const FLOW_MIN_COLOR = 'rgba(240,240,240,0.5)';
export const DEFAULT_COLOR_SCHEME = [FLOW_MIN_COLOR, ColorScheme.primary];

const SCALE_NUM_STEPS = 20;
const getColorSteps = (interpolate: (x: number) => string) =>
  range(0, SCALE_NUM_STEPS + 1)
    .map((i) => interpolate(i / SCALE_NUM_STEPS))
    .reverse();

export const COLOR_SCHEMES: { [key: string]: string[] } = {
  Default: DEFAULT_COLOR_SCHEME,
  // https://carto.com/carto-colors/
  Blues: asScheme(schemeBlues),
  BluGrn: ['#c4e6c3', '#96d2a4', '#6dbc90', '#4da284', '#36877a', '#266b6e', '#1d4f60'],
  BluYl: ['#f7feae', '#b7e6a5', '#7ccba2', '#46aea0', '#089099', '#00718b', '#045275'],
  BrwnYl: ['#ede5cf', '#e0c2a2', '#d39c83', '#c1766f', '#a65461', '#813753', '#541f3f'],
  BuGn: asScheme(schemeBuGn),
  BuPu: asScheme(schemeBuPu),
  Burg: ['#ffc6c4', '#f4a3a8', '#e38191', '#cc607d', '#ad466c', '#8b3058', '#672044'],
  BurgYl: ['#fbe6c5', '#f5ba98', '#ee8a82', '#dc7176', '#c8586c', '#9c3f5d', '#70284a'],
  Cool: getColorSteps(interpolateCool),
  DarkMint: ['#d2fbd4', '#a5dbc2', '#7bbcb0', '#559c9e', '#3a7c89', '#235d72', '#123f5a'],
  Emrld: ['#d3f2a3', '#97e196', '#6cc08b', '#4c9b82', '#217a79', '#105965', '#074050'],
  GnBu: asScheme(schemeGnBu),
  Greens: asScheme(schemeGreens),
  Greys: asScheme(schemeGreys),
  Inferno: getColorSteps(interpolateInferno),
  Magenta: ['#f3cbd3', '#eaa9bd', '#dd88ac', '#ca699d', '#b14d8e', '#91357d', '#6c2167'],
  Magma: getColorSteps(interpolateMagma),
  Mint: ['#e4f1e1', '#b4d9cc', '#89c0b6', '#63a6a0', '#448c8a', '#287274', '#0d585f'],
  Oranges: asScheme(schemeOranges),
  OrRd: asScheme(schemeOrRd),
  OrYel: ['#ecda9a', '#efc47e', '#f3ad6a', '#f7945d', '#f97b57', '#f66356', '#ee4d5a'],
  Peach: ['#fde0c5', '#facba6', '#f8b58b', '#f59e72', '#f2855d', '#ef6a4c', '#eb4a40'],
  Plasma: getColorSteps(interpolatePlasma),
  PinkYl: ['#fef6b5', '#ffdd9a', '#ffc285', '#ffa679', '#fa8a76', '#f16d7a', '#e15383'],
  PuBu: asScheme(schemePuBu),
  PuBuGn: asScheme(schemePuBuGn),
  PuRd: asScheme(schemePuRd),
  Purp: ['#f3e0f7', '#e4c7f1', '#d1afe8', '#b998dd', '#9f82ce', '#826dba', '#63589f'],
  Purples: asScheme(schemePurples),
  PurpOr: ['#f9ddda', '#f2b9c4', '#e597b9', '#ce78b3', '#ad5fad', '#834ba0', '#573b88'],
  RdPu: asScheme(schemeRdPu),
  RedOr: ['#f6d2a9', '#f5b78e', '#f19c7c', '#ea8171', '#dd686c', '#ca5268', '#b13f64'],
  Reds: asScheme(schemeReds),
  Sunset: ['#f3e79b', '#fac484', '#f8a07e', '#eb7f86', '#ce6693', '#a059a0', '#5c53a5'],
  SunsetDark: ['#fcde9c', '#faa476', '#f0746e', '#e34f6f', '#dc3977', '#b9257a', '#7c1d6f'],
  Teal: ['#d1eeea', '#a8dbd9', '#85c4c9', '#68abb8', '#4f90a6', '#3b738f', '#2a5674'],
  TealGrn: ['#b0f2bc', '#89e8ac', '#67dba5', '#4cc8a3', '#38b2a3', '#2c98a0', '#257d98'],
  Viridis: getColorSteps(interpolateViridis),
  Warm: getColorSteps(interpolateWarm),
  YlGn: asScheme(schemeYlGn),
  YlGnBu: asScheme(schemeYlGnBu),
  YlOrBr: asScheme(schemeYlOrBr),
  YlOrRd: asScheme(schemeYlOrRd),
};

export const COLOR_SCHEME_KEYS = Object.keys(COLOR_SCHEMES);

const complementary = '#f52020';
const baseDiffColor = '#17a5be';

const diffColors: DiffColors = {
  negative: {
    flows: {
      scheme: [FLOW_MIN_COLOR, baseDiffColor],
    },
  },
  positive: {
    flows: {
      scheme: [FLOW_MIN_COLOR, complementary],
    },
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(220,220,220,0.5)',
  },
  outlineColor: 'rgb(230,233,237)',
};

export default function getColors(
  diffMode: boolean,
  schemeKey: string | undefined,
  darkMode: boolean,
  fadeEnabled: boolean,
  fadeAmount: number,
  animate: boolean
): Colors | DiffColors {
  if (diffMode) {
    return diffColors;
  }

  let scheme = (schemeKey && COLOR_SCHEMES[schemeKey]) || DEFAULT_COLOR_SCHEME;

  if (darkMode) {
    scheme = scheme.slice().reverse();
  }
  // if (animate)
  // if (fadeAmount > 0)
  {
    const indices = range(0, Math.max(10, scheme.length));
    const N = indices.length - 1;
    const colorScale = scaleSequential(interpolateRgbBasis(scheme)).domain([0, N]);

    if (!fadeEnabled || fadeAmount === 0) {
      scheme = indices.map((c, i) => colorScale(i)!);
    } else {
      const amount = scalePow()
        // .exponent(animate ? 1 : 1/2.5)
        // .exponent(animate ? 100 : 50)
        // .exponent(animate ? 20 : 5)
        // .exponent(1/2.5)
        .exponent(1.5)
        .domain([N, 0])
        // .range([fadeAmount/100*(animate?2:1), 0])
        // .range([0, fadeAmount/100*(animate?2:1)])
        // .range(darkMode ? [1-fadeAmount/100, 1] : [1, 1 - fadeAmount/100])
        // .range(darkMode ? [1 - fadeAmount/100, 1] : [fadeAmount/100, 0])
        // .range([1 - fadeAmount/100, 1])
        .range([0, ((animate ? 2.5 : 2) * fadeAmount) / 100]);

      scheme = indices.map(
        (c, i) => {
          const color = colorScale(i);
          const alpha = amount(i);
          if (color == null || alpha == null) return '#000';
          const col = hcl(color);
          col.l = darkMode ? col.l - col.l * alpha : col.l + (100 - col.l) * alpha;
          col.c = col.c - col.c * (alpha / 4);
          return col.toString();
        }
        // interpolateRgbBasis([colorScale(i), darkMode ? '#000' : '#fff'])(amount(i))
        // interpolateHsl(colorScale(i), darkMode ? '#000' : '#fff')(amount(i)).toString()
      );
    }
  }

  return {
    darkMode,
    flows: {
      scheme,
    },
    locationCircles: {
      outgoing: darkMode ? '#000' : '#fff',
    },
    outlineColor: darkMode ? '#000' : 'rgba(255, 255, 255, 0.5)',
  };
}

export function createFlowColorScale(
  domain: [number, number],
  scheme: string[],
  animate: boolean | undefined
): ColorScale {
  const scale = scaleSequentialPow(interpolateRgbBasis(scheme))
    // @ts-ignore
    .exponent(animate ? 1 / 2 : 1 / 3)
    .domain(domain);
  return (value: number) => colorAsRgba(scale(value));
}

export function getFlowColorScale(
  colors: ColorsRGBA | DiffColorsRGBA,
  magnitudeExtent: [number, number] | undefined,
  animate: boolean | undefined
) {
  const minMagnitude = magnitudeExtent ? magnitudeExtent[0] : 0;
  const maxMagnitude = magnitudeExtent ? magnitudeExtent[1] : 0;
  if (isDiffColorsRGBA(colors)) {
    const posScale = createFlowColorScale([0, maxMagnitude], colors.positive.flows.scheme, animate);
    const negScale = createFlowColorScale([0, minMagnitude], colors.negative.flows.scheme, animate);

    return (magnitude: number) => (magnitude >= 0 ? posScale(magnitude) : negScale(magnitude));
  }

  const scale = createFlowColorScale([0, maxMagnitude || 0], colors.flows.scheme, animate);
  return (magnitude: number) => scale(magnitude);
}

export function isDiffColors(colors: DiffColors | Colors): colors is DiffColors {
  return (colors as DiffColors).positive !== undefined;
}

export function isDiffColorsRGBA(colors: DiffColorsRGBA | ColorsRGBA): colors is DiffColorsRGBA {
  return (colors as DiffColorsRGBA).positive !== undefined;
}

function getLocationAreaColorsRGBA(
  colors: LocationAreaColors | undefined,
  darkMode: boolean
): LocationAreaColorsRGBA {
  const normalColor = (colors && colors.normal) || DEFAULT_LOCATION_AREA_COLOR;
  const normalColorHcl = hcl(normalColor);
  const locationAreasNormal = colorAsRgba(normalColor);
  return {
    normal: locationAreasNormal,
    connected: colorAsRgbaOr(colors && colors.connected, locationAreasNormal),
    highlighted: colorAsRgbaOr(
      colors && colors.highlighted,
      opacifyHex(normalColorHcl[darkMode ? 'brighter' : 'darker'](1).toString(), 0.5)
    ),
    selected: colorAsRgbaOr(
      colors && colors.selected,
      opacifyHex(normalColorHcl[darkMode ? 'brighter' : 'darker'](2).toString(), 0.8)
    ),
    outline: colorAsRgbaOr(
      colors && colors.outline,
      colorAsRgba(normalColorHcl[darkMode ? 'brighter' : 'darker'](4).toString())
    ),
  };
}

export interface FlowColors {
  scheme?: string[];
  highlighted?: string;
}

export interface LocationCircleColors {
  inner?: string;
  outgoing?: string;
  incoming?: string;
  highlighted?: string;
}

export interface LocationAreaColors {
  outline?: string;
  normal?: string;
  selected?: string;
  highlighted?: string;
  connected?: string;
}

export interface BaseColors {
  darkMode?: boolean;
  locationAreas?: LocationAreaColors;
  dimmedOpacity?: number;
  outlineColor?: string;
}

export interface Colors extends BaseColors {
  flows?: FlowColors;
  locationCircles?: LocationCircleColors;
}

export interface FlowAndCircleColors {
  flows?: FlowColors;
  locationCircles?: LocationCircleColors;
}

export interface DiffColors extends BaseColors {
  positive?: FlowAndCircleColors;
  negative?: FlowAndCircleColors;
}

// The xxxColorsRGBA objects are mirroring the input colors' objects,
// but converted to RGBA and with all the omitted ones set to defaults
// or derived.
export interface FlowColorsRGBA {
  scheme: string[];
  highlighted: RGBA;
}

export interface LocationCircleColorsRGBA {
  inner: RGBA;
  outgoing: RGBA;
  incoming: RGBA;
  highlighted: RGBA;
}

export interface LocationAreaColorsRGBA {
  outline: RGBA;
  normal: RGBA;
  selected: RGBA;
  highlighted: RGBA;
  connected: RGBA;
}

export interface BaseColorsRGBA {
  darkMode: boolean;
  locationAreas: LocationAreaColorsRGBA;
  dimmedOpacity: number;
  outlineColor: RGBA;
}

export interface ColorsRGBA extends BaseColorsRGBA {
  flows: FlowColorsRGBA;
  locationCircles: LocationCircleColorsRGBA;
}

export interface FlowAndCircleColorsRGBA {
  flows: FlowColorsRGBA;
  locationCircles: LocationCircleColorsRGBA;
}

export interface DiffColorsRGBA extends BaseColorsRGBA {
  positive: FlowAndCircleColorsRGBA;
  negative: FlowAndCircleColorsRGBA;
}

function getFlowAndCircleColors(
  inputColors: FlowAndCircleColors | undefined,
  defaultFlowColorScheme: string[],
  darkMode: boolean
): FlowAndCircleColorsRGBA {
  const flowColorScheme =
    (inputColors && inputColors.flows && inputColors.flows.scheme) || defaultFlowColorScheme;
  const maxFlowColorHcl = hcl(flowColorScheme[flowColorScheme.length - 1]);
  const flowColorHighlighted = colorAsRgbaOr(
    inputColors && inputColors.flows && inputColors.flows.highlighted,
    colorAsRgba(maxFlowColorHcl[darkMode ? 'brighter' : 'darker'](0.7).toString())
  );

  return {
    flows: {
      scheme: flowColorScheme,
      highlighted: flowColorHighlighted,
    },
    locationCircles: {
      inner: colorAsRgbaOr(
        inputColors && inputColors.locationCircles && inputColors.locationCircles.inner,
        maxFlowColorHcl.toString()
      ),
      outgoing: colorAsRgbaOr(
        inputColors && inputColors.locationCircles && inputColors.locationCircles.outgoing,
        darkMode ? '#000' : '#fff'
      ),
      incoming: colorAsRgbaOr(
        inputColors && inputColors.locationCircles && inputColors.locationCircles.incoming,
        maxFlowColorHcl[darkMode ? 'brighter' : 'darker'](1.25).toString()
      ),
      highlighted: colorAsRgbaOr(
        inputColors && inputColors.locationCircles && inputColors.locationCircles.highlighted,
        flowColorHighlighted
      ),
    },
  };
}

function getBaseColorsRGBA(colors: Colors | DiffColors | undefined): BaseColorsRGBA {
  const darkMode = colors && colors.darkMode ? true : false;
  return {
    darkMode,
    locationAreas: getLocationAreaColorsRGBA(colors && colors.locationAreas, darkMode),
    outlineColor: colorAsRgba((colors && colors.outlineColor) || DEFAULT_OUTLINE_COLOR),
    dimmedOpacity:
      colors && colors.dimmedOpacity != null ? colors.dimmedOpacity : DEFAULT_DIMMED_OPACITY,
  };
}

export function getColorsRGBA(colors: Colors | undefined): ColorsRGBA {
  const baseColorsRGBA = getBaseColorsRGBA(colors);
  return {
    ...baseColorsRGBA,
    ...getFlowAndCircleColors(colors, DEFAULT_FLOW_COLOR_SCHEME, baseColorsRGBA.darkMode),
  };
}

export function getDiffColorsRGBA(colors: DiffColors | undefined): DiffColorsRGBA {
  const baseColorsRGBA = getBaseColorsRGBA(colors);
  return {
    ...baseColorsRGBA,
    positive: getFlowAndCircleColors(
      colors && colors.positive,
      DEFAULT_FLOW_COLOR_SCHEME_POSITIVE,
      baseColorsRGBA.darkMode
    ),
    negative: getFlowAndCircleColors(
      colors && colors.negative,
      DEFAULT_FLOW_COLOR_SCHEME_NEGATIVE,
      baseColorsRGBA.darkMode
    ),
  };
}
