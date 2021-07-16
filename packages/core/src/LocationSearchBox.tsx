import { Classes, Intent, MenuItem } from '@blueprintjs/core';
import { ItemPredicate, ItemRenderer } from '@blueprintjs/select';
import { nest } from 'd3-collection';
import React from 'react';
import { defaultMemoize } from 'reselect';
import { matchesSearchQuery } from './matchesSearchQuery';
import SearchBox from './SearchBox';
import { Location, LocationFilterMode } from '@flowmap.blue/data';
import styled from '@emotion/styled';
import { Cluster } from '@flowmap.gl/cluster';

export interface Props {
  selectedLocations: string[] | undefined;
  locations: (Location | Cluster)[];
  locationFilterMode: LocationFilterMode;
  onSelectionChanged: (selectedLocations: string[] | undefined) => void;
  onLocationFilterModeChange: (mode: LocationFilterMode) => void;
}

const LocationTag = styled.div({
  display: 'flex',
  fontSize: 10,
  alignItems: 'center',
  '& > * + *': {
    marginLeft: 5,
  },
});

const itemPredicate: ItemPredicate<Location | Cluster> = (query, location) => {
  const { id, name } = location;
  return matchesSearchQuery(query, `${id} ${name}`);
};

function sortLocations(locations: (Location | Cluster)[]): (Location | Cluster)[] {
  return locations.slice().sort((a, b) => {
    const aname = a.name || a.id;
    const bname = b.name || b.id;
    if (aname < bname) return -1;
    if (aname > bname) return 1;
    return 0;
  });
}

function getSelectedLocationsSet(selectedLocations: string[] | undefined) {
  if (!selectedLocations || selectedLocations.length === 0) {
    return undefined;
  }
  return new Set(selectedLocations);
}

interface LocationsBySelectionStatus {
  selected: (Location | Cluster)[] | undefined;
  unselected: (Location | Cluster)[];
}

function getLocationsBySelectionStatus(
  locations: (Location | Cluster)[],
  selectedLocations: string[] | undefined
): LocationsBySelectionStatus {
  const selectedIds = getSelectedLocationsSet(selectedLocations);
  if (!selectedIds) {
    return {
      selected: undefined,
      unselected: locations,
    };
  }

  const { selected, unselected } = nest<Location | Cluster, LocationsBySelectionStatus>()
    .key((location) => (selectedIds.has(location.id) ? 'selected' : 'unselected'))
    .object(locations);

  return {
    selected,
    unselected,
  };
}

const Outer = styled.div`
  & > * > .${Classes.POPOVER_TARGET} {
    width: 15rem;
  }
  .${Classes.TAG_INPUT} {
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
  }
  .${Classes.TAG_INPUT_VALUES} {
    max-height: 150px;
    overflow-y: auto;
    align-items: flex-start;
  }
  .${Classes.HTML_SELECT} {
    & > select {
      font-size: small;
    }
  }
`;

const TextOverflowEllipsis = styled.span({
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  maxWidth: 180,
});

class LocationsSearchBox extends React.PureComponent<Props> {
  private getSortedLocations = defaultMemoize(sortLocations);
  private getLocationsBySelectionStatus = defaultMemoize(getLocationsBySelectionStatus);

  render() {
    const {
      locations,
      selectedLocations,
      locationFilterMode,
      onLocationFilterModeChange,
    } = this.props;
    const { selected, unselected } = this.getLocationsBySelectionStatus(
      this.getSortedLocations(locations),
      selectedLocations
    );
    return (
      <Outer>
        <SearchBox<Location | Cluster>
          placeholder="Filter by origin and destination…"
          items={unselected}
          selectedItems={selected}
          maxItems={100}
          itemPredicate={itemPredicate}
          itemRenderer={this.itemRenderer}
          tagRenderer={this.tagRenderer}
          onCleared={this.handleSelectionCleared}
          onRemoved={this.handleLocationRemoved}
          onSelected={this.handleLocationSelected}
          locationFilterMode={locationFilterMode}
          onLocationFilterModeChange={onLocationFilterModeChange}
        />
      </Outer>
    );
  }

  private tagRenderer = (location: Location | Cluster) => {
    const { selectedLocations } = this.props;
    const selection = selectedLocations && selectedLocations.find((id) => id === location.id);
    if (!selection) {
      return null;
    }
    return (
      <LocationTag>
        <TextOverflowEllipsis>{location.name}</TextOverflowEllipsis>
      </LocationTag>
    );
  };

  private itemRenderer: ItemRenderer<Location | Cluster> = (item, { handleClick, modifiers }) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    const { id, name } = item as Location | Cluster;
    const { selectedLocations } = this.props;
    const isSelected = selectedLocations && selectedLocations.indexOf(id) >= 0;
    const intent = isSelected ? Intent.PRIMARY : Intent.NONE;
    return (
      <MenuItem
        key={id}
        active={modifiers.active}
        text={name}
        intent={intent}
        onClick={handleClick}
      />
    );
  };

  private handleSelectionCleared = () => this.props.onSelectionChanged(undefined);

  private handleLocationSelected = (location: Location | Cluster) => {
    const { selectedLocations, onSelectionChanged } = this.props;
    const { id } = location;
    if (selectedLocations) {
      if (selectedLocations.indexOf(id) < 0) {
        onSelectionChanged([...selectedLocations, id]);
      }
    } else {
      onSelectionChanged([id]);
    }
  };

  private handleLocationRemoved = (location: Location | Cluster) => {
    const { selectedLocations, onSelectionChanged } = this.props;
    if (selectedLocations) {
      const { id } = location;
      const idx = selectedLocations.indexOf(id);
      if (idx >= 0) {
        const next = selectedLocations.slice();
        next.splice(idx, 1);
        onSelectionChanged(selectedLocations.length === 1 ? undefined : next);
      }
    }
  };
}

export default LocationsSearchBox;
