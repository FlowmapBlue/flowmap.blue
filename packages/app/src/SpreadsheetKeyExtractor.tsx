import React from 'react';
import { InputGroup, Button, Intent, Tooltip } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import styled from '@emotion/styled';
import { SPREADSHEET_KEY_RE } from './constants';
import { Away } from '@flowmap.blue/core';

const StyledInputGroup = styled(InputGroup)`
  max-width: 50em;
  margin-top: 0.5em;
`;

const spreadsheetKeyRegExp = new RegExp(`${SPREADSHEET_KEY_RE}`);

type State = {
  spreadsheetKey: string | null;
  invalid: boolean;
};

const InvalidInputIcon = () => (
  <Tooltip content={"This doesn't contain a valid Google spreadsheet key"}>
    <Button icon={IconNames.ERROR} intent={Intent.DANGER} minimal={true} />
  </Tooltip>
);

const ValidInputIcon = () => (
  <Button icon={IconNames.TICK} intent={Intent.SUCCESS} minimal={true} />
);

export default class SpreadsheetKeyExtractor extends React.Component<{}, State> {
  private ref: HTMLInputElement | null = null;
  state: State = {
    spreadsheetKey: null,
    invalid: false,
  };

  private handleChange = () => {
    if (!this.ref) return;
    const { value } = this.ref;
    const m = spreadsheetKeyRegExp.exec(value);
    this.setState({
      spreadsheetKey: m ? m[0] : null,
      invalid: value && !m ? true : false,
    });
  };

  render() {
    const { spreadsheetKey, invalid } = this.state;
    const items = [
      <li key="input">
        <span>Copy the link to your spreadsheet and paste it here:</span>
        <StyledInputGroup
          inputRef={(ref) => (this.ref = ref)}
          leftIcon={IconNames.LINK}
          rightElement={
            invalid ? <InvalidInputIcon /> : spreadsheetKey ? <ValidInputIcon /> : undefined
          }
          large={true}
          onChange={this.handleChange}
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
      </li>,
    ];
    if (spreadsheetKey) {
      items.push(
        <li key="link">
          Open{` `}
          <Away href={`/${spreadsheetKey}`}>
            {`${document.location.protocol}//${document.location.host}/${spreadsheetKey}`}
          </Away>
        </li>
      );
    }
    return items;
  }
}
