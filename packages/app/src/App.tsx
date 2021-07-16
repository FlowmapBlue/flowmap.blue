import * as React from 'react';
import { Suspense } from 'react';
import { Route, RouteComponentProps, Router, Switch } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import * as Sentry from '@sentry/browser';
import Home from './Home';
import { AppToaster, LoadingSpinner } from '@flowmap.blue/core';
import { FLOWS_SHEET_KEY_RE, SPREADSHEET_KEY_RE } from './constants';
import ErrorFallback from './ErrorFallback';
import ErrorBoundary from './ErrorBoundary';

const GSheetsFlowMap = React.lazy(() => import('./GSheetsFlowMap'));
const InBrowserFlowMap = React.lazy(() => import('./InBrowserFlowMap'));
const FromUrlParamsFlowMap = React.lazy(() => import('./FromUrlParamsFlowMap'));
const ODMatrixConverter = React.lazy(() => import('./ODMatrixConverter'));
const Geocoding = React.lazy(() => import('./Geocoding'));

const history = createBrowserHistory();
history.listen((location) => AppToaster.clear());

type Props = {};

type State = {
  error: any;
  sentryEventId: string | undefined;
};

const makeGSheetsFlowMap = (embed: boolean) => ({
  match,
}: RouteComponentProps<{ sheetKey: string; flowsSheetKey: string }>) => (
  <GSheetsFlowMap
    spreadSheetKey={match.params.sheetKey}
    flowsSheetKey={match.params.flowsSheetKey}
    embed={embed}
  />
);

export default class App extends React.Component<Props, State> {
  state = {
    error: null,
    sentryEventId: undefined,
  };

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ error });
    if (process.env.REACT_APP_SENTRY_DSN) {
      Sentry.withScope((scope) => {
        Object.keys(errorInfo).forEach((key) => {
          scope.setExtra(key, errorInfo[key]);
        });
        this.setState({ sentryEventId: Sentry.captureException(error) });
      });
    }
  }

  render() {
    if (this.state.error) {
      // render fallback UI
      return (
        <Router history={history}>
          <ErrorFallback sentryEventId={this.state.sentryEventId} />
        </Router>
      );
    } else {
      return (
        <Router history={history}>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Switch>
                <Route path="/od-matrix-converter" component={ODMatrixConverter} />
                <Route path="/geocoding" component={Geocoding} />
                <Route path="/in-browser" component={InBrowserFlowMap} />
                <Route path="/from-url" component={FromUrlParamsFlowMap} />
                <Route
                  path={`/:sheetKey(${SPREADSHEET_KEY_RE})/:flowsSheetKey(${FLOWS_SHEET_KEY_RE})/embed`}
                  component={makeGSheetsFlowMap(true)}
                />
                <Route
                  path={`/:sheetKey(${SPREADSHEET_KEY_RE})/:flowsSheetKey(${FLOWS_SHEET_KEY_RE})`}
                  component={makeGSheetsFlowMap(false)}
                />
                <Route
                  path={`/:sheetKey(${SPREADSHEET_KEY_RE})/embed`}
                  component={makeGSheetsFlowMap(true)}
                />
                <Route
                  path={`/:sheetKey(${SPREADSHEET_KEY_RE})`}
                  component={makeGSheetsFlowMap(false)}
                />
                <Route path="/" component={Home} />
              </Switch>
            </Suspense>
          </ErrorBoundary>
        </Router>
      );
    }
  }
}
