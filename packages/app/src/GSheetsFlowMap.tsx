import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  AppToaster,
  Away,
  Collapsible,
  Column,
  Description,
  LoadingSpinner,
  MapContainer,
  Title,
  TitleBox,
} from '@flowmap.blue/core';
import {
  ConfigProp,
  ConfigPropName,
  DEFAULT_CONFIG,
  FlowMapStore,
  FlowTotals,
  getFlowsSheets,
  LoadingStatus,
  makeSheetQueryUrl,
} from '@flowmap.blue/data';
import { Helmet } from 'react-helmet';
import sendEvent from './ga';
import { useAsync } from 'react-use';
import { csvParse } from 'd3-dsv';
import { Colors, HTMLSelect, Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import md5 from 'blueimp-md5';
import { Link, useHistory } from 'react-router-dom';
import styled from '@emotion/styled';
import FromUrlFlowMap from './FromUrlFlowMap';
import { useAppStore, useFlowMapStore } from './AppStore';
import { formatCount } from './globals';

interface Props {
  spreadSheetKey: string;
  flowsSheetKey?: string;
  embed: boolean;
}

const ToastContent = styled.div`
  font-size: 12px;
`;

const getFlowsSheetKey = (name: string) => md5(name).substr(0, 7);

const TotalCount = styled.div<{ darkMode: boolean }>((props) => ({
  padding: 5,
  borderRadius: 5,
  backgroundColor: props.darkMode ? Colors.DARK_GRAY4 : Colors.LIGHT_GRAY4,
  textAlign: 'center',
}));

const GSheetsFlowMap: React.FC<Props> = ({ spreadSheetKey, flowsSheetKey, embed }) => {
  const url = makeSheetQueryUrl(spreadSheetKey, 'properties', 'SELECT A,B', 'csv');
  const [selectedSheet, setSelectedSheet] = useState<string>('flows');
  const history = useHistory();

  const handleChangeFlowsSheet = (name: string, replaceUrl: boolean) => {
    if (replaceUrl) {
      history.replace({
        ...history.location,
        pathname: `/${spreadSheetKey}/${getFlowsSheetKey(name)}${embed ? '/embed' : ''}`,
      });
    }
    setSelectedSheet(name);
  };

  const configFetch = useAsync(async () => {
    const response = await fetch(url);
    const rows = csvParse(await response.text()) as ConfigProp[];
    const configProps = { ...DEFAULT_CONFIG };
    for (const prop of rows) {
      if (prop.value != null && `${prop.value}`.length > 0) {
        configProps[prop.property] = prop.value;
      }
    }
    sendEvent(
      `${spreadSheetKey} "${configProps[ConfigPropName.TITLE] || 'Untitled'}"`,
      `Load config`,
      `Load config "${configProps[ConfigPropName.TITLE] || 'Untitled'}"`
    );

    const flowsSheets = getFlowsSheets(configProps);
    if (flowsSheets && flowsSheets.length > 0) {
      let name = undefined;
      if (flowsSheetKey) {
        name = flowsSheets.find((fs) => getFlowsSheetKey(fs) === flowsSheetKey);
      } else {
        name = flowsSheets[0];
      }
      if (name != null) {
        handleChangeFlowsSheet(name, flowsSheets.length > 1);
      }
    }

    configProps.spreadSheetKey = spreadSheetKey;
    return configProps;
  }, [url]);

  useEffect(() => {
    if (configFetch.error) {
      AppToaster.show({
        intent: Intent.WARNING,
        icon: IconNames.WARNING_SIGN,
        timeout: 0,
        message: (
          <ToastContent>
            <p>
              Couldn't load the properties sheet from{` `}
              <a href={`https://docs.google.com/spreadsheets/d/${spreadSheetKey}`}>
                this spreadsheet
              </a>
              .
            </p>
            <p>Cause: {configFetch.error.message}</p>
            <p>
              If you are the owner of this spreadsheet, make sure you have shared it by doing the
              following:
              <ol>
                <li>Click the “Share” button in the spreadsheet</li>
                <li>
                  Change the selection from “Restricted” to “Anyone with the link” in the drop-down
                  under “Get link”
                </li>
              </ol>
            </p>
            <p>Make sure that there is a sheet called "properties" in the spreadsheet.</p>
          </ToastContent>
        ),
      });
    }
  }, [configFetch.error]);

  const config = useMemo(() => (configFetch.value ? configFetch.value : DEFAULT_CONFIG), [
    configFetch.value,
  ]);
  const flowsSheets = useMemo(() => getFlowsSheets(config), [config]);
  const title = config[ConfigPropName.TITLE];
  const description = config[ConfigPropName.DESCRIPTION];
  const sourceUrl = config[ConfigPropName.SOURCE_URL];
  const sourceName = config[ConfigPropName.SOURCE_NAME];
  const authorUrl = config[ConfigPropName.AUTHOR_URL];
  const authorName = config[ConfigPropName.AUTHOR_NAME];

  const darkMode = useFlowMapStore(
    (state: FlowMapStore) => state.flowMapState.settingsState.darkMode
  );

  const handleSelectFlowsSheet: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const sheet = event.currentTarget.value;
    handleChangeFlowsSheet(sheet, true);
  };

  const flowTotals = useAppStore((state) => state.flowTotals);

  return (
    <MapContainer embed={embed} darkMode={darkMode}>
      {configFetch.loading || selectedSheet == null ? (
        <LoadingSpinner />
      ) : (
        <>
          <FromUrlFlowMap
            // embed={embed}
            dataFormat={'gsheets'}
            locationsUrl={makeSheetQueryUrl(spreadSheetKey!, 'locations', 'SELECT A,B,C,D', 'json')}
            flowsUrl={makeSheetQueryUrl(spreadSheetKey!, selectedSheet, 'SELECT *', 'json')}
            config={config}
          />
          {configFetch.value && spreadSheetKey && !embed && (
            <TitleBox top={52} left={0} darkMode={darkMode}>
              <Collapsible darkMode={darkMode} width={300}>
                <Column spacing={10} padding="12px 20px">
                  {title && (
                    <div>
                      <Title>{title}</Title>
                      <Description>{description}</Description>
                    </div>
                  )}
                  {flowsSheets && flowsSheets.length > 1 && (
                    <HTMLSelect
                      value={selectedSheet}
                      onChange={handleSelectFlowsSheet}
                      options={flowsSheets.map((sheet) => ({
                        label: sheet,
                        value: sheet,
                      }))}
                    />
                  )}
                  {authorUrl ? (
                    <div>
                      {`Created by: `}
                      <Away href={`${authorUrl.indexOf('://') < 0 ? 'http://' : ''}${authorUrl}`}>
                        {authorName || 'Author'}
                      </Away>
                    </div>
                  ) : authorName ? (
                    <div>Created by: {authorName}</div>
                  ) : null}{' '}
                  {sourceName && sourceUrl && (
                    <div>
                      {'Original data source: '}
                      <>
                        <Away href={`${sourceUrl.indexOf('://') < 0 ? 'http://' : ''}${sourceUrl}`}>
                          {sourceName}
                        </Away>
                      </>
                    </div>
                  )}
                  <div>
                    {'Data behind this map is in '}
                    <Away href={`https://docs.google.com/spreadsheets/d/${spreadSheetKey}`}>
                      this spreadsheet
                    </Away>
                    . You can <Link to="/">publish your own</Link> too.
                  </div>
                  {flowTotals?.data?.filteredCount != null &&
                    flowTotals.data.unfilteredCount != null && (
                      <TotalCount darkMode={darkMode}>
                        {Math.round(flowTotals.data.filteredCount) ===
                        Math.round(flowTotals.data.unfilteredCount)
                          ? config['msg.totalCount.allTrips']?.replace(
                              '{0}',
                              formatCount(flowTotals.data.unfilteredCount)
                            )
                          : config['msg.totalCount.countOfTrips']
                              ?.replace('{0}', formatCount(flowTotals.data.filteredCount))
                              .replace('{1}', formatCount(flowTotals.data.unfilteredCount))}
                      </TotalCount>
                    )}
                </Column>
              </Collapsible>
            </TitleBox>
          )}
        </>
      )}
      {configFetch.value && configFetch.value[ConfigPropName.TITLE] && (
        <Helmet>
          <title>{`${configFetch.value[ConfigPropName.TITLE]} - Flowmap.blue`}</title>
          <link href={`https://flowmap.blue/${spreadSheetKey}`} rel="canonical" />
        </Helmet>
      )}
    </MapContainer>
  );
};

export default GSheetsFlowMap;
