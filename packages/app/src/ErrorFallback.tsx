import * as React from 'react';
import { Fallback } from '@flowmap.blue/core';
import { ColorScheme } from '@flowmap.blue/data';
import * as Sentry from '@sentry/browser';

const ErrorFallback: React.FC<{ error?: any; sentryEventId?: string }> = ({
  error,
  sentryEventId,
}) => (
  <Fallback>
    <>
      Oops… Sorry, but something went wrong.
      {error && (
        <div
          style={{
            margin: '10px 0',
          }}
        >
          {error.toString()}
        </div>
      )}
      {sentryEventId && (
        <p>
          <button
            style={{
              border: 'none',
              color: ColorScheme.primary,
              padding: 0,
              cursor: 'pointer',
              fontSize: 15,
              marginTop: '1em',
              textDecoration: 'underline',
            }}
            onClick={() => Sentry.showReportDialog({ eventId: sentryEventId })}
          >
            Click to report feedback
          </button>
        </p>
      )}
    </>
  </Fallback>
);

export default ErrorFallback;
