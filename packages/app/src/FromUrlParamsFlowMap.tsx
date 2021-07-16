import React, { useMemo } from 'react';
import { Config, ConfigPropName, DEFAULT_CONFIG } from '@flowmap.blue/data';
import * as queryString from 'query-string';
import { useLocation } from 'react-router-dom';
import FromUrlFlowMap from './FromUrlFlowMap';

// A custom hook that builds on useLocation to parse
// the query string for you.
function useQuery() {
  return queryString.parse(useLocation().search);
}

const FromUrlParamsFlowMap: React.FC<{}> = (props) => {
  const params = useQuery();
  if (typeof params.locations !== 'string') {
    throw new Error(`Invalid locations URL`);
  }
  if (typeof params.flows !== 'string') {
    throw new Error(`Invalid flows URL`);
  }

  const config: Config = useMemo(() => {
    const config = { ...DEFAULT_CONFIG };
    for (const prop of Object.values(ConfigPropName)) {
      const val = params[prop];
      if (typeof val === 'string' && val.length > 0) {
        config[prop] = val;
      }
    }
    return config;
  }, [params]);

  return (
    <FromUrlFlowMap
      inBrowser={true}
      dataFormat="csv"
      locationsUrl={params.locations as string}
      flowsUrl={params.flows as string}
      config={config}
    />
  );
};

export default FromUrlParamsFlowMap;
