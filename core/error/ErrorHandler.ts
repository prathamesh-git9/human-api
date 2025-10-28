/**
 * Production-ready error handling system
 * Provides comprehensive error management and logging
 */

export enum ErrorType {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class HumanAPIError extends Error {
  public readonly type: ErrorType;
  public readonly context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    type: ErrorType,
    context: Omit<ErrorContext, 'timestamp'>,
    isRetryable: boolean = false,
    userMessage?: string
  ) {
    super(message);
    this.name = 'HumanAPIError';
    this.type = type;
    this.context = {
      ...context,
      timestamp: new Date()
    };
    this.isRetryable = isRetryable;
    this.userMessage = userMessage || this.getDefaultUserMessage();
  }

  private getDefaultUserMessage(): string {
    switch (this.type) {
      case ErrorType.CRITICAL:
        return 'A critical error occurred. Please restart the application.';
      case ErrorType.HIGH:
        return 'An important operation failed. Please try again.';
      case ErrorType.MEDIUM:
        return 'Something went wrong. Please check your input and try again.';
      case ErrorType.LOW:
        return 'A minor issue occurred. The application should continue working normally.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      context: this.context,
      isRetryable: this.isRetryable,
      userMessage: this.userMessage,
      stack: this.stack
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: HumanAPIError[] = [];
  private maxLogSize = 1000;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error | HumanAPIError, context: Partial<ErrorContext> = {}): HumanAPIError {
    let humanError: HumanAPIError;

    if (error instanceof HumanAPIError) {
      humanError = error;
    } else {
      humanError = new HumanAPIError(
        error.message,
        ErrorType.MEDIUM,
        {
          component: context.component || 'Unknown',
          action: context.action || 'Unknown',
          ...context
        }
      );
    }

    this.logError(humanError);
    this.notifyError(humanError);

    return humanError;
  }

  public createError(
    message: string,
    type: ErrorType,
    context: Omit<ErrorContext, 'timestamp'>,
    isRetryable: boolean = false,
    userMessage?: string
  ): HumanAPIError {
    return new HumanAPIError(message, type, context, isRetryable, userMessage);
  }

  private logError(error: HumanAPIError): void {
    this.errorLog.push(error);
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('HumanAPI Error:', error.toJSON());
    }

    // In production, you would send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(error);
    }
  }

  private notifyError(error: HumanAPIError): void {
    // Only notify for high and critical errors
    if (error.type === ErrorType.HIGH || error.type === ErrorType.CRITICAL) {
      // In a real application, you would show user notifications
      console.warn('User notification:', error.userMessage);
    }
  }

  private sendToLoggingService(error: HumanAPIError): void {
    // In production, implement actual logging service integration
    // This could be Sentry, LogRocket, or a custom logging endpoint
    console.log('Sending to logging service:', error.toJSON());
  }

  public getErrorLog(): HumanAPIError[] {
    return [...this.errorLog];
  }

  public getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    byComponent: Record<string, number>;
    recentErrors: HumanAPIError[];
  } {
    const byType = Object.values(ErrorType).reduce((acc, type) => {
      acc[type] = this.errorLog.filter(e => e.type === type).length;
      return acc;
    }, {} as Record<ErrorType, number>);

    const byComponent = this.errorLog.reduce((acc, error) => {
      const component = error.context.component;
      acc[component] = (acc[component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errorLog.length,
      byType,
      byComponent,
      recentErrors: this.errorLog.slice(-10) // Last 10 errors
    };
  }

  public clearErrorLog(): void {
    this.errorLog = [];
  }
}

// Convenience functions for common error scenarios
export const createDatabaseError = (message: string, context: Partial<ErrorContext> = {}) =>
  new HumanAPIError(
    message,
    ErrorType.HIGH,
    { component: 'Database', action: 'Database Operation', ...context },
    true,
    'Database operation failed. Please try again.'
  );

export const createCryptoError = (message: string, context: Partial<ErrorContext> = {}) =>
  new HumanAPIError(
    message,
    ErrorType.CRITICAL,
    { component: 'Crypto', action: 'Encryption/Decryption', ...context },
    false,
    'Security operation failed. Please restart the application.'
  );

export const createValidationError = (message: string, context: Partial<ErrorContext> = {}) =>
  new HumanAPIError(
    message,
    ErrorType.MEDIUM,
    { component: 'Validation', action: 'Input Validation', ...context },
    false,
    'Invalid input provided. Please check your data and try again.'
  );

export const createNetworkError = (message: string, context: Partial<ErrorContext> = {}) =>
  new HumanAPIError(
    message,
    ErrorType.MEDIUM,
    { component: 'Network', action: 'Network Request', ...context },
    true,
    'Network request failed. Please check your connection and try again.'
  );

// Global error handler for unhandled errors
export const setupGlobalErrorHandling = () => {
  const errorHandler = ErrorHandler.getInstance();

  process.on('uncaughtException', (error) => {
    const humanError = errorHandler.handleError(error, {
      component: 'System',
      action: 'Uncaught Exception'
    });
    
    console.error('Uncaught Exception:', humanError.toJSON());
    
    // For critical errors, exit the process
    if (humanError.type === ErrorType.CRITICAL) {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const humanError = errorHandler.handleError(error, {
      component: 'System',
      action: 'Unhandled Rejection'
    });
    
    console.error('Unhandled Rejection:', humanError.toJSON());
  });
};
