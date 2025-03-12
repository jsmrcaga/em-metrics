const Sentry = require('@sentry/node');

const SENTRY_DSN = process.env.SENTRY_DSN;

if(SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.APP_ENV || 'unknown',
    release: process.env.EM_METRICS_VERSION
  });
}
