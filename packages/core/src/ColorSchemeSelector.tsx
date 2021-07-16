import { ItemRenderer, Select } from '@blueprintjs/select';
import { Button, Colors, Intent, MenuItem } from '@blueprintjs/core';
import styled from '@emotion/styled';
import React, { FC, useLayoutEffect, useMemo, useRef } from 'react';
import { IconNames } from '@blueprintjs/icons';
import { scaleLinear, scaleSequential } from 'd3-scale';
import { interpolateRgbBasis } from 'd3-interpolate';
import { ClassNames } from '@emotion/core';
import { COLOR_SCHEMES, DEFAULT_COLOR_SCHEME } from '@flowmap.blue/data';
import { Row } from './Boxes';

export interface Props {
  selected?: string;
  reverse?: boolean;
  onChange: (colorScheme: string) => void;
}

const ColorRampLabel = styled.div({
  width: 55,
  fontSize: '10px',
  textAlign: 'center',
});

const ColorRampCanvas = styled.canvas({
  display: 'flex',
  flexGrow: 1,
  border: `1px solid ${Colors.DARK_GRAY5}`,
});

const ColorRamp: React.FC<{
  colorScheme: string;
  width?: number;
  height?: number;
  reverse?: boolean;
}> = (props) => {
  const { colorScheme, width = 60, height = 13, reverse } = props;

  const colorScale = scaleSequential(
    interpolateRgbBasis(COLOR_SCHEMES[colorScheme] || DEFAULT_COLOR_SCHEME)
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xScale = useMemo(() => scaleLinear().range([0, width]), [width]);

  useLayoutEffect(() => {
    const { current } = canvasRef;
    if (current) {
      const ctx = current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < width; i++) {
          ctx.fillStyle = colorScale(xScale.invert(i))!;
          ctx.fillRect(reverse ? width - i - 1 : i, 0, 1, height);
        }
      }
    }
  });
  return (
    <Row>
      <ColorRampLabel>{colorScheme}</ColorRampLabel>
      <ColorRampCanvas ref={canvasRef} width={width} height={height} />
    </Row>
  );
};

const ColorSchemeSelector: FC<Props> = ({ selected = 'Default', reverse, onChange }) => {
  const itemRenderer: ItemRenderer<string> = (colorScheme, { modifiers, handleClick }) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        key={colorScheme}
        active={modifiers.active}
        disabled={modifiers.disabled}
        intent={selected === colorScheme ? Intent.PRIMARY : Intent.NONE}
        onClick={handleClick}
        icon={<ColorRamp colorScheme={colorScheme} reverse={reverse} />}
      />
    );
  };

  return (
    <ClassNames>
      {({ css }) => (
        <Select<string>
          items={Object.keys(COLOR_SCHEMES)}
          filterable={false}
          activeItem={selected}
          itemRenderer={itemRenderer}
          popoverProps={{
            minimal: true,
            captureDismiss: true,
            usePortal: false,
            fill: true,
            targetClassName: css({
              '& > div': {
                flex: '1',
              },
            }),
          }}
          onItemSelect={onChange}
        >
          <Button
            rightIcon={IconNames.CARET_DOWN}
            fill={true}
            icon={<ColorRamp colorScheme={selected} reverse={reverse} />}
          />
        </Select>
      )}
    </ClassNames>
  );
};

export default ColorSchemeSelector;
