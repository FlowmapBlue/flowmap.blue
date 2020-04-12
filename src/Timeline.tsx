import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { scaleTime } from 'd3-scale';
import { TimeInterval } from 'd3-time';
import { EventManager } from 'mjolnir.js';
import PlayControl from './PlayControl';
import { Colors } from '@blueprintjs/core';
import { useMeasure, useThrottle } from 'react-use';

interface Props {
  selectedRange: [Date, Date];
  extent: [Date, Date];
  darkMode: boolean;
  formatDate: (d: Date) => string;
  timeInterval: TimeInterval;
  minTickWidth: number;
  onChange: (range: [Date, Date]) => void;
}

const SVG_HEIGHT = 60;
const TICK_HEIGHT = 5;

const margin = {
  top: 15,
  left: 10,
  right: 10,
  bottom: 20,
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

const TimelineSvg = styled.svg({
  cursor: 'pointer',
});

const HandleOuter = styled.g({
  cursor: 'ew-resize',
  '& > path': {
    stroke: Colors.DARK_GRAY1,
    transition: 'fill 0.2s',
    fill: Colors.GRAY4,
  },
  '&:hover path': {
    fill: Colors.WHITE,
  },
});

const HandlePath = styled.path({
  strokeWidth: 1,
  shapeRendering: 'crispEdges',
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
  fontSize: 11,
  // textAnchor: 'middle',
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
  side: Side;
  onMove: (pos: number, side: Side) => void;
}
const TimelineHandle: React.FC<HandleProps> = (props) => {
  const { width, height, side, onMove } = props;
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
    <HandleOuter transform={`translate(${side === 'start' ? 0 : width},0)`}>
      <HandlePath
        d={
          side === 'start'
            ? `M0,${h} ${-w},0 0,0 0,${height} ${-w},${height} 0,${height - h} z`
            : `M0,${h} ${w},0 0,0 0,${height} ${w},${height} 0,${height - h} z`
        }
      />
      <HandleHoverTarget ref={ref} height={height} width={width} />
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
    formatDate,
    timeInterval,
    minTickWidth,
    darkMode,
    onChange,
  } = props;

  const stripeHeight = 30;
  const handleWidth = 10;
  const handleHGap = 10;
  const handleHeight = stripeHeight + handleHGap * 2;

  const chartWidth = width - margin.left - margin.right;
  const x = scaleTime();
  x.domain(extent);
  x.range([0, chartWidth]);

  const [prevPos, setPrevPos] = useState<number>();

  const svgRef = useRef<SVGSVGElement>(null);
  const rectRef = useRef<SVGRectElement>(null);

  const handleMoveRef = useRef<any>();
  handleMoveRef.current = ({ center }: any) => {
    if (prevPos != null) {
      const delta = center.x - prevPos;
      let nextStart = x.invert(x(selectedRange[0]) + delta);
      let nextEnd = x.invert(x(selectedRange[1]) + delta);
      if (nextStart && nextEnd) {
        if (nextStart < extent[0]) {
          onChange([
            extent[0],
            new Date(
              extent[0].getTime() + (selectedRange[1].getTime() - selectedRange[0].getTime())
            ),
          ]);
        } else if (nextEnd > extent[1]) {
          onChange([
            new Date(
              extent[1].getTime() - (selectedRange[1].getTime() - selectedRange[0].getTime())
            ),
            extent[1],
          ]);
        } else {
          onChange([nextStart, nextEnd]);
        }
      }
    }
  };
  const handleMove = (evt: any) => {
    if (handleMoveRef.current) {
      handleMoveRef.current(evt);
      setPrevPos(evt.center.x);
    }
  };
  const handleMoveEnd = (evt: any) => {
    if (handleMoveRef.current) {
      handleMoveRef.current(evt);
    }
    setPrevPos(undefined);
  };

  useEffect(() => {
    const eventManager = new EventManager(rectRef.current);
    eventManager.on('panstart', handleMove);
    eventManager.on('panmove', handleMove);
    eventManager.on('panend', handleMoveEnd);
    return () => {
      eventManager.destroy();
    };
  }, []);

  const timeFromPos = (pos: number) => {
    const { current } = svgRef;
    if (current != null) {
      const { left } = current.getBoundingClientRect();
      return x.invert(pos - left - margin.left);
    }
    return undefined;
  };

  const handleMoveSideRef = useRef<MoveSideHandler>();
  handleMoveSideRef.current = (pos, side) => {
    let t = timeFromPos(pos);
    if (t) {
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

  const ticks = x.ticks(timeInterval);
  // const tickLabels: Date[] = [];
  // let nextTick = extent[1];
  // const step = -Math.ceil(ticks.length / (chartWidth / minTickWidth));
  // while (nextTick >= extent[0]) {
  //   tickLabels.push(nextTick);
  //   nextTick = timeInterval.offset(nextTick, step);
  // }
  const tickLabels = x.ticks(ticks.length / (chartWidth / minTickWidth));

  return (
    <TimelineSvg width={width} height={SVG_HEIGHT} ref={svgRef}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <g transform={`translate(0,0)`}>
          {ticks.map((t, i) => (
            <TickLine key={i} transform={`translate(${x(t)},${0})`} y1={0} y2={TICK_HEIGHT} />
          ))}
          {tickLabels.map((t, i) => (
            <g key={i} transform={`translate(${x(t)},${0})`}>
              <TickLine y1={0} y2={stripeHeight} />
              <TickText darkMode={darkMode} x={3} y={20}>
                {formatDate(t)}
              </TickText>
            </g>
          ))}
          <AxisPath
            d={`M0,${TICK_HEIGHT * 1.5} 0,0 ${chartWidth},0 ${chartWidth},${TICK_HEIGHT * 1.5}`}
          />
        </g>
        <g transform={`translate(0,${stripeHeight})`}>
          {ticks.map((t, i) => (
            <TickLine key={i} transform={`translate(${x(t)},${0})`} y1={0} y2={-TICK_HEIGHT} />
          ))}
          <AxisPath
            d={`M0,-${TICK_HEIGHT * 1.5} 0,0 ${chartWidth},0 ${chartWidth},-${TICK_HEIGHT * 1.5}`}
          />
        </g>

        <g transform={`translate(${x(selectedRange[0])},${-handleHGap})`}>
          <SelectedRangeRect
            ref={rectRef}
            height={handleHeight}
            width={x(selectedRange[1]) - x(selectedRange[0])}
          />
          <TimelineHandle
            width={handleWidth}
            height={handleHeight}
            side="start"
            onMove={handleMoveSide}
          />
        </g>
        <g transform={`translate(${x(selectedRange[1]) - handleWidth},${-handleHGap})`}>
          <TimelineHandle
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
  const { extent, selectedRange, timeInterval, onChange } = props;
  const [internalRange, setInternalRange] = useState<[Date, Date]>(selectedRange);
  const throttledRange = useThrottle(internalRange, 100);
  const onChangeRef = useRef<(range: [Date, Date]) => void>();
  onChangeRef.current = (range) => onChange(range);
  useEffect(() => {
    const { current } = onChangeRef;
    if (current) current(throttledRange);
  }, [throttledRange, onChangeRef]);

  useEffect(() => {
    setInternalRange(selectedRange);
  }, [selectedRange]);

  const [isPlaying, setPlaying] = useState(false);

  const handlePlayAdvance = (start: Date) => {
    const length = selectedRange[1].getTime() - selectedRange[0].getTime();
    const end = new Date(start.getTime() + length);
    if (end > extent[1]) {
      setPlaying(false);
      return [new Date(end.getTime() - length), end];
    }
    setInternalRange([start, end]);
  };

  const handleMove = (range: [Date, Date]) => {
    setInternalRange(range);
  };

  return (
    <Outer>
      <PlayControl
        extent={extent}
        current={internalRange[0]}
        timeStep={timeInterval}
        stepDuration={100}
        isPlaying={isPlaying}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onAdvance={handlePlayAdvance}
      />
      <MeasureTarget ref={measureRef}>
        <TimelineChart
          {...props}
          selectedRange={internalRange}
          width={dimensions.width}
          onChange={handleMove}
        />
      </MeasureTarget>
    </Outer>
  );
};

export default Timeline;