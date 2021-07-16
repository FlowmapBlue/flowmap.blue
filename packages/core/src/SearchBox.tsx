import {
  Button,
  IconName,
  IPopoverProps,
  Menu,
  MenuDivider,
  MenuItem,
  Popover,
  Position,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ItemPredicate, ItemRenderer, MultiSelect } from '@blueprintjs/select';
import React, { ReactNode } from 'react';
import { defaultMemoize } from 'reselect';
import { LocationFilterMode } from '@flowmap.blue/data';
import { Column } from './Boxes';
import { ClassNames } from '@emotion/core';

export interface Props<Item> {
  placeholder: string;
  items: Item[];
  maxItems: number;
  selectedItems: Item[] | undefined;
  itemPredicate: ItemPredicate<Item>;
  itemRenderer: ItemRenderer<Item>;
  tagRenderer: (item: Item) => React.ReactNode;
  onSelected: (item: Item) => void;
  onRemoved: (item: Item) => void;
  onCleared: () => void;
  onQueryChange?: (query: string) => void;
  locationFilterMode: LocationFilterMode;
  onLocationFilterModeChange: (mode: LocationFilterMode) => void;
}

const NoResultsItem = <MenuItem disabled={true} text="No matches." />;

const popoverProps: Partial<IPopoverProps> = {
  minimal: true,
  usePortal: false,
  hoverOpenDelay: 0,
};

interface State {
  query: string;
}

function filterItems<Item>(
  items: Item[],
  query: string,
  itemPredicate: ItemPredicate<Item>,
  maxLength: number
) {
  const matches: Item[] = [];
  if (!items || items.length === 0) {
    return matches;
  }
  for (const item of items) {
    if (itemPredicate(query, item)) {
      matches.push(item);
    }
    if (matches.length >= maxLength) {
      break;
    }
  }
  return matches;
}

export default class SearchBox<Item> extends React.PureComponent<Props<Item>, State> {
  state = {
    query: '',
  };

  getFilteredItems = defaultMemoize(filterItems);

  render() {
    const {
      items,
      selectedItems,
      itemRenderer,
      placeholder,
      tagRenderer,
      onCleared,
      onSelected,
      itemPredicate,
      maxItems,
      locationFilterMode,
      onLocationFilterModeChange,
    } = this.props;
    const { query } = this.state;

    const tagInputProps = {
      placeholder,
      onRemove: this.handleItemRemoved,
      leftIcon: IconNames.SEARCH as IconName,
      rightElement:
        selectedItems && selectedItems.length > 0 ? (
          <Column>
            <Button icon={IconNames.CROSS} minimal={true} onClick={onCleared} />
            <Popover
              position={Position.TOP_RIGHT}
              minimal={true}
              usePortal={false}
              hoverOpenDelay={0}
              hoverCloseDelay={0}
              content={
                <ClassNames>
                  {({ css }) => (
                    <Menu>
                      <MenuDivider title="Filter mode" />
                      {[
                        { value: LocationFilterMode.ALL, label: 'All' },
                        { value: LocationFilterMode.INCOMING, label: 'Incoming to selected' },
                        { value: LocationFilterMode.OUTGOING, label: 'Outgoing from selected' },
                        { value: LocationFilterMode.BETWEEN, label: 'Between selected' },
                      ].map((v) => (
                        <MenuItem
                          active={locationFilterMode === v.value}
                          icon={
                            locationFilterMode === v.value
                              ? IconNames.TICK_CIRCLE
                              : IconNames.SMALL_TICK
                          }
                          key={v.value}
                          text={v.label}
                          onClick={() => onLocationFilterModeChange(v.value)}
                          textClassName={css({
                            fontSize: '11px',
                          })}
                        />
                      ))}
                    </Menu>
                  )}
                </ClassNames>
              }
            >
              <Button title="Filter mode" icon={IconNames.COG} minimal={true} />
            </Popover>
          </Column>
        ) : undefined,
    };

    return (
      <MultiSelect<Item>
        items={this.getFilteredItems<Item>(items, query, itemPredicate, maxItems)}
        selectedItems={selectedItems}
        itemRenderer={itemRenderer}
        tagRenderer={tagRenderer}
        noResults={NoResultsItem}
        popoverProps={popoverProps}
        tagInputProps={tagInputProps}
        onItemSelect={onSelected}
        resetOnSelect={true}
        openOnKeyDown={true}
        onQueryChange={this.handleQueryChange}
      />
    );
  }

  private handleQueryChange = (query: string) => {
    this.setState({
      query,
    });
    const { onQueryChange } = this.props;
    if (onQueryChange) {
      onQueryChange(query);
    }
  };

  private handleItemRemoved = (value: ReactNode, index: number) => {
    const { selectedItems, onRemoved } = this.props;
    if (selectedItems) {
      onRemoved(selectedItems[index]);
    }
  };
}
