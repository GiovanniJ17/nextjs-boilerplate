/**
 * Analytics & Logging Utilities
 * Per produzione: implementare integrazione con servizio analytics
 * Per sviluppo: console logging condizionale
 */

const isDev = process.env.NODE_ENV === 'development';

export const analytics = {
  // Track page views
  pageview: (url: string) => {
    if (isDev) {
      console.log('📊 Pageview:', url);
    }
    // TODO: Implementare analytics (es. Google Analytics, Plausible)
  },

  // Track eventi
  event: (eventName: string, properties?: Record<string, any>) => {
    if (isDev) {
      console.log('🎯 Event:', eventName, properties);
    }
    // TODO: Implementare tracking eventi
  },

  // Track errori
  error: (error: Error, context?: Record<string, any>) => {
    if (isDev) {
      console.error('❌ Error:', error, context);
    }
    // TODO: Implementare error tracking (es. Sentry)
  },
};

export const logger = {
  info: (message: string, data?: any) => {
    if (isDev) {
      console.log('ℹ️', message, data);
    }
  },
  
  warn: (message: string, data?: any) => {
    if (isDev) {
      console.warn('⚠️', message, data);
    }
  },
  
  error: (message: string, error?: any) => {
    if (isDev) {
      console.error('❌', message, error);
    }
  },
  
  success: (message: string, data?: any) => {
    if (isDev) {
      console.log('✅', message, data);
    }
  },
};
