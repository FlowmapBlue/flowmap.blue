import * as React from 'react';
import styled from '@emotion/styled';
import { Colors } from '@blueprintjs/core';

export enum Direction {
  LEFT,
  RIGHT,
}

export interface Props {
  width: number;
  initialCollapsed?: boolean;
  direction?: Direction;
  darkMode: boolean;
}

export interface State {
  collapsed: boolean;
}

const Outer = styled.div`
  display: flex;
  justify-items: center;
  flex-direction: row;
`;

type BodyProps = { direction: Direction; collapsed: boolean; width: number };
const Body = styled.div<BodyProps>(
  ({ direction, collapsed, width }: BodyProps) => `
  order: ${direction === Direction.LEFT ? 2 : 1};
  overflow: hidden;
  max-width: ${collapsed ? 0 : `${width}px`};
  transition: max-width 0.15s ease-out;  
`
);

type ContentProps = { direction: Direction; width: number };
const Content = styled.div<ContentProps>(
  ({ direction, width }: ContentProps) => `
  width: ${width}px;
`
);

type RotateProps = { degrees: number };
const Rotate = styled.div<RotateProps>(
  ({ degrees }: RotateProps) => `
  transform-origin: center;
  transform: rotate(${degrees}deg);
  transition: transform 0.15s ease-out;  
`
);

type ButtonProps = {
  collapsed: boolean;
  direction: Direction;
  darkMode: boolean;
};

const Button = styled.button<ButtonProps>(
  ({ collapsed, direction, darkMode }: ButtonProps) => `
  display: flex;
  order: ${direction === Direction.LEFT ? 1 : 2};  
  border: none;
  cursor: pointer;
  align-items: center;
  font-size: 22px;
  background-color: ${darkMode ? Colors.DARK_GRAY4 : Colors.LIGHT_GRAY5};
  color: #ccc;
  border-radius: ${collapsed ? 4 : 0}px;
  transition: background-color 0.25s, border-radius 0.15s;  
  &:hover {
    background-color: ${darkMode ? Colors.DARK_GRAY3 : Colors.LIGHT_GRAY4};
  }
`
);

export default class Collapsible extends React.Component<Props, State> {
  static defaultProps = {
    initialCollapsed: false,
    direction: Direction.LEFT,
  };

  state: State = {
    collapsed:
      this.props.initialCollapsed != null
        ? this.props.initialCollapsed
        : Collapsible.defaultProps.initialCollapsed,
  };

  bodyRef = React.createRef<HTMLDivElement>();

  handleClick = () => {
    this.setState((state: State) => ({
      collapsed: !state.collapsed,
    }));
  };

  getArrow = () => {
    const { direction } = this.props;
    const { collapsed } = this.state;
    switch (direction) {
      case Direction.LEFT:
        return <Rotate degrees={collapsed ? 180 : 360}>{'<'}</Rotate>;
      case Direction.RIGHT:
        return <Rotate degrees={collapsed ? 180 : 360}>{'>'}</Rotate>;
      default:
        return null;
    }
  };

  render() {
    const {
      width,
      direction = Collapsible.defaultProps.direction,
      darkMode,
      children,
    } = this.props;
    const { collapsed } = this.state;
    return (
      <Outer>
        <Body ref={this.bodyRef} width={width} direction={direction} collapsed={collapsed}>
          <Content width={width} direction={direction}>
            {children}
          </Content>
        </Body>
        <Button
          darkMode={darkMode}
          collapsed={collapsed}
          direction={direction}
          onClick={this.handleClick}
        >
          {' '}
          {this.getArrow()}
        </Button>
      </Outer>
    );
  }
}
