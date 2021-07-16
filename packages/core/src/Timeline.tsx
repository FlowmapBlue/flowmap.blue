import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { scaleLinear, scaleTime } from 'd3-scale';
import { max } from 'd3-array';
import { EventManager } from 'mjolnir.js';
import PlayControl from './PlayControl';
import { Colors } from '@blueprintjs/core';
import { useMeasure, useThrottle } from 'react-use';
import {
  areRangesEqual,
  ColorScheme,
  CountByTime,
  tickMultiFormat,
  TimeGranularity,
} from '@flowmap.blue/data';
import { hcl } from 'd3-color';

interface Props {
  selectedRange: [Date, Date];
  extent: [Date, Date];
  totalCountsByTime: CountByTime[];
  darkMode: boolean;
  timeGranularity: TimeGranularity;
  onChange: (range: [Date, Date]) => void;
}

const SVG_HEIGHT = 80;
const AXIS_AREA_HEIGHT = 20;
const TOTAL_COUNT_CHART_HEIGHT = 30;

const margin = {
  top: 15,
  left: 25,
  right: 25,
  bottom: 15,
};

const Outer = styled.div({
  display: 'flex',
  padding: '5px 20px',
  alignItems: 'center',
  userSelect: 'none',
  '&>*+*': {
    marginLeft: 10,
  },
});

const MeasureTarget = styled.div({
  display: 'flex',
  flexGrow: 1,
  overflow: 'hidden',
});

const TimelineSvg = styled.svg<{ darkMode: boolean }>((props) => ({
  cursor: 'pointer',
  backgroundColor: props.darkMode ? Colors.DARK_GRAY4 : Colors.LIGHT_GRAY4,
}));

const OuterRect = styled.rect({
  cursor: 'crosshair',
  fill: 'rgba(255,255,255,0)',
  stroke: 'none',
});

const HandleOuter = styled.g<{ darkMode: boolean }>((props) => ({
  cursor: 'ew-resize',
  '& > path': {
    stroke: Colors.DARK_GRAY1,
    transition: 'fill 0.2s',
    fill: props.darkMode ? Colors.GRAY4 : Colors.WHITE,
  },
  '&:hover path': {
    fill: props.darkMode ? Colors.WHITE : Colors.GRAY4,
  },
}));

const HandlePath = styled.path({
  strokeWidth: 1,
} as any);

const HandleHoverTarget = styled.rect({
  fill: Colors.WHITE,
  fillOpacity: 0,
});

const SelectedRangeRect = styled.rect({
  fill: Colors.BLUE5,
  cursor: 'move',
  transition: 'fill-opacity 0.2s',
  fillOpacity: 0.3,
  '&:hover': {
    fillOpacity: 0.4,
  },
});

const AxisPath = styled.path({
  fill: 'none',
  stroke: Colors.GRAY1,
  shapeRendering: 'crispEdges',
} as any);

const TickText = styled.text<{ darkMode: boolean }>((props) => ({
  fill: props.darkMode ? Colors.LIGHT_GRAY1 : Colors.DARK_GRAY1,
  fontSize: 10,
  textAnchor: 'start',
}));

const Bar = styled.rect<{ darkMode: boolean }>((props) => ({
  fill: props.darkMode ? Colors.LIGHT_GRAY1 : ColorScheme.primary,
  stroke: props.darkMode ? Colors.GRAY4 : hcl(ColorScheme.primary).darker().toString(),
}));

const TickLine = styled.line({
  fill: 'none',
  stroke: Colors.GRAY1,
  shapeRendering: 'crispEdges',
} as any);

type Side = 'start' | 'end';

interface HandleProps {
  width: number;
  height: number;
  darkMode: boolean;
  side: Side;
  onMove: (pos: number, side: Side) => void;
}
const TimelineHandle: React.FC<HandleProps> = (props) => {
  const { width, height, side, darkMode, onMove } = props;
  const handleMoveRef = useRef<any>();
  handleMoveRef.current = ({ center }: any) => {
    onMove(center.x, side);
  };
  const ref = useRef<SVGRectElement>(null);
  useEffect(() => {
    const eventManager = new EventManager(ref.current);
    if (handleMoveRef.current) {
      eventManager.on('panstart', handleMoveRef.current);
      eventManager.on('panmove', handleMoveRef.current);
      eventManager.on('panend', handleMoveRef.current);
    }
    return () => {
      // eventManager.off('panstart', handleMove);
      // eventManager.off('panmove', handleMove);
      // eventManager.off('panend', handleMove);
      eventManager.destroy();
    };
  }, [handleMoveRef]);

  const [w, h] = [width, width];
  return (
    <HandleOuter darkMode={darkMode}>
      <HandlePath
        transform={`translate(${side === 'start' ? 0 : width},0)`}
        d={
          side === 'start'
            ? `M0,${h} Q${-w},${h} ${-w},0 L0,0 0,${height} ${-w},${height} Q${-w},${
                height - h
              } 0,${height - h} z`
            : `M0,${h} Q${w},${h} ${w},0 L0,0 0,${height} ${w},${height} Q${w},${height - h} 0,${
                height - h
              } z`
        }
      />
      <HandleHoverTarget x={side === 'start' ? -w : w} ref={ref} height={height} width={width} />
    </HandleOuter>
  );
};

interface TimelineChartProps extends Props {
  width: number;
}

type MoveSideHandler = (pos: number, side: Side) => void;

const TimelineChart: React.FC<TimelineChartProps> = (props) => {
  const {
    width,
    extent,
    selectedRange,
    timeGranularity,
    totalCountsByTime,
    darkMode,
    onChange,
  } = props;

  const handleWidth = 10;
  const handleHGap = 10;
  const handleHeight = TOTAL_COUNT_CHART_HEIGHT + AXIS_AREA_HEIGHT + handleHGap * 2;

  const chartWidth = width - margin.left - margin.right;
  const timeScale = scaleTime();
  timeScale.domain(extent);
  timeScale.range([0, chartWidth]);

  const [offset, setOffset] = useState<number>();
  const [panStart, setPanStart] = useState<Date>();

  const svgRef = useRef<SVGSVGElement>(null);
  const outerRectRef = useRef<SVGRectElement>(null);
  const selectedRangeRectRef = useRef<SVGRectElement>(null);

  const mousePosition = (absPos: number) => {
    const { current } = svgRef;
    if (current != null) {
      const { left } = current.getBoundingClientRect();
      return absPos - left - margin.left;
    }
    return undefined;
  };

  const timeFromPos = (pos: number) => {
    const relPos = mousePosition(pos);
    if (relPos != null) return timeScale.invert(relPos);
    return undefined;
  };

  const handleMoveRef = useRef<any>();
  handleMoveRef.current = ({ center }: any) => {
    if (offset == null) {
      const pos = mousePosition(center.x);
      if (pos != null) {
        const selectedPos = timeScale(selectedRange[0]);
        if (selectedPos != null) {
          setOffset(selectedPos - pos);
        }
      }
    } else {
      let nextStart = timeFromPos(center.x + offset);
      if (nextStart) {
        const { interval } = timeGranularity;
        nextStart = interval.round(nextStart);
        const length = (interval as any).count(selectedRange[0], selectedRange[1]);
        let nextEnd = interval.offset(nextStart, length);
        if (nextStart < extent[0]) {
          nextStart = extent[0];
          nextEnd = interval.offset(extent[0], length);
        }
        if (nextEnd > extent[1]) {
          nextStart = interval.offset(extent[1], -length);
          nextEnd = extent[1];
        }
        onChange([nextStart, nextEnd]);
      }
    }
  };
  const handleMove = (evt: any) => handleMoveRef.current(evt);
  const handleMoveEnd = (evt: any) => {
    handleMoveRef.current(evt);
    setOffset(undefined);
  };

  const handleClickRef = useRef<any>();
  handleClickRef.current = (evt: any) => {
    onChange(extent);
  };
  const handleClick = (evt: any) => handleClickRef.current(evt);

  const handlePanStartRef = useRef<any>();
  handlePanStartRef.current = ({ center }: any) => {
    let start = timeFromPos(center.x);
    if (start) {
      start = timeGranularity.interval.round(start);
      if (start < extent[0]) start = extent[0];
      if (start > extent[1]) start = extent[1];
      setPanStart(start);
      onChange([start, start]);
    }
  };
  const handlePanStart = (evt: any) => handlePanStartRef.current(evt);

  const handlePanMoveRef = useRef<any>();
  handlePanMoveRef.current = ({ center }: any) => {
    let end = timeFromPos(center.x);
    if (panStart && end) {
      end = timeGranularity.interval.round(end);
      if (end < extent[0]) end = extent[0];
      if (end > extent[1]) end = extent[1];
      const range: [Date, Date] = panStart < end ? [panStart, end] : [end, panStart];
      onChange(range);
    }
  };
  const handlePanMove = (evt: any) => handlePanMoveRef.current(evt);
  const handlePanEnd = (evt: any) => {
    handlePanMoveRef.current(evt);
    setPanStart(undefined);
  };

  useEffect(() => {
    const outerEvents = new EventManager(outerRectRef.current);
    outerEvents.on('click', handleClick);
    outerEvents.on('panstart', handlePanStart);
    outerEvents.on('panmove', handlePanMove);
    outerEvents.on('panend', handlePanEnd);
    const selectedRangeEvents = new EventManager(selectedRangeRectRef.current);
    selectedRangeEvents.on('panstart', handleMove);
    selectedRangeEvents.on('panmove', handleMove);
    selectedRangeEvents.on('panend', handleMoveEnd);
    return () => {
      outerEvents.destroy();
      selectedRangeEvents.destroy();
    };
  }, []);

  const handleMoveSideRef = useRef<MoveSideHandler>();
  handleMoveSideRef.current = (pos, side) => {
    let t = timeFromPos(pos);
    if (t != null) {
      t = timeGranularity.interval.round(t);
      if (t < extent[0]) t = extent[0];
      if (t > extent[1]) t = extent[1];
      if (side === 'start') {
        onChange([t < selectedRange[1] ? t : selectedRange[1], selectedRange[1]]);
      } else {
        onChange([selectedRange[0], t > selectedRange[0] ? t : selectedRange[0]]);
      }
    }
  };
  const handleMoveSide: MoveSideHandler = (pos, kind) => {
    if (handleMoveSideRef.current) {
      handleMoveSideRef.current(pos, kind);
    }
  };

  const minLabelWidth = 70;
  const ticks = timeScale.ticks(
    Math.min(
      (timeGranularity.interval as any).count(extent[0], extent[1]),
      chartWidth / minLabelWidth
    )
  );

  const totalCountScale = scaleLinear()
    .domain([0, max(totalCountsByTime, (d) => d.count) ?? 0])
    .range([0, TOTAL_COUNT_CHART_HEIGHT]);

  const tickLabelFormat = tickMultiFormat; // timeScale.tickFormat();
  return (
    <TimelineSvg ref={svgRef} darkMode={darkMode} width={width} height={SVG_HEIGHT}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {ticks.map((t, i) => {
          const xPos = timeScale(t);
          if (xPos == null) return null;
          return (
            <g key={i} transform={`translate(${xPos},${0})`}>
              <TickLine y1={0} y2={TOTAL_COUNT_CHART_HEIGHT + AXIS_AREA_HEIGHT} />
              {xPos < chartWidth && (
                <TickText darkMode={darkMode} x={3} y={12}>
                  {
                    // timeGranularity.format(t)
                    tickLabelFormat(t)
                  }
                </TickText>
              )}
            </g>
          );
        })}
        <AxisPath d={`M0,0 ${chartWidth},0`} />
        <AxisPath
          transform={`translate(0,${TOTAL_COUNT_CHART_HEIGHT + AXIS_AREA_HEIGHT})`}
          d={`M0,0 ${chartWidth},0`}
        />
        <g transform={`translate(0,${AXIS_AREA_HEIGHT})`}>
          {totalCountsByTime.map(({ time, count }) => (
            <Bar
              darkMode={darkMode}
              key={time.getTime()}
              x={timeScale(time)}
              y={TOTAL_COUNT_CHART_HEIGHT - totalCountScale(count)!}
              width={Math.max(
                timeScale(timeGranularity.interval.offset(time))! - timeScale(time)! - 1,
                1
              )}
              height={totalCountScale(count)}
            />
          ))}
        </g>
      </g>
      <OuterRect ref={outerRectRef} width={width} height={SVG_HEIGHT} />
      <g transform={`translate(${margin.left},${margin.top})`}>
        <g transform={`translate(${timeScale(selectedRange[0])},0)`}>
          <SelectedRangeRect
            ref={selectedRangeRectRef}
            height={TOTAL_COUNT_CHART_HEIGHT + AXIS_AREA_HEIGHT}
            width={timeScale(selectedRange[1])! - timeScale(selectedRange[0])!}
          />
        </g>
        <g transform={`translate(${timeScale(selectedRange[0])},${-handleHGap})`}>
          <TimelineHandle
            darkMode={darkMode}
            width={handleWidth}
            height={handleHeight}
            side="start"
            onMove={handleMoveSide}
          />
        </g>
        <g transform={`translate(${timeScale(selectedRange[1])! - handleWidth},${-handleHGap})`}>
          <TimelineHandle
            darkMode={darkMode}
            width={handleWidth}
            height={handleHeight}
            side="end"
            onMove={handleMoveSide}
          />
        </g>
      </g>
    </TimelineSvg>
  );
};

const Timeline: React.FC<Props> = (props) => {
  const [measureRef, dimensions] = useMeasure();
  const { extent, selectedRange, timeGranularity, darkMode, onChange } = props;
  const [internalRange, setInternalRange] = useState<[Date, Date]>(selectedRange);
  const throttledRange = useThrottle(internalRange, 100);
  const onChangeRef = useRef<(range: [Date, Date]) => void>();
  onChangeRef.current = (range) => onChange(range);
  useEffect(() => {
    const { current } = onChangeRef;
    if (current) current(throttledRange);
  }, [throttledRange, onChangeRef]);

  const [prevSelectedRange, setPrevSelectedRange] = useState(selectedRange);
  if (!areRangesEqual(selectedRange, prevSelectedRange)) {
    setInternalRange(selectedRange);
    setPrevSelectedRange(selectedRange);
  }

  const [isPlaying, setPlaying] = useState(false);

  const handlePlay = () => {
    const { interval } = timeGranularity;
    if (selectedRange[1] >= extent[1]) {
      const length = (interval as any).count(selectedRange[0], selectedRange[1]);
      setInternalRange([extent[0], interval.offset(extent[0], length)]);
    }
    setPlaying(true);
  };

  const handlePlayAdvance = (start: Date) => {
    const { interval } = timeGranularity;
    const length = (interval as any).count(selectedRange[0], selectedRange[1]);
    const end = interval.offset(start, length);
    if (end >= extent[1]) {
      setPlaying(false);
      setInternalRange([interval.offset(end, -length), end]);
    } else {
      setInternalRange([start, end]);
    }
  };

  const handleMove = (range: [Date, Date]) => {
    setInternalRange(range);
    setPlaying(false);
  };

  return (
    <Outer>
      <PlayControl
        darkMode={darkMode}
        extent={extent}
        current={internalRange[0]}
        interval={timeGranularity.interval}
        stepDuration={100}
        speed={1}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={() => setPlaying(false)}
        onAdvance={handlePlayAdvance}
      />
      <MeasureTarget ref={measureRef as any}>
        {dimensions.width > 0 && (
          <TimelineChart
            {...props}
            selectedRange={internalRange}
            width={dimensions.width}
            onChange={handleMove}
          />
        )}
      </MeasureTarget>
    </Outer>
  );
};

export default Timeline;
