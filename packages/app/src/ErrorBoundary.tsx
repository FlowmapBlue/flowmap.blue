import * as React from 'react';
import ErrorFallback from './ErrorFallback';
import { captureException, withScope } from '@sentry/core';

class ErrorBoundary extends React.Component<{}, {}> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error);
    withScope((scope) => {
      scope.setExtras({
        ...errorInfo,
      });
      captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
