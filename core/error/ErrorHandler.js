/**
 * Production-ready error handling system
 * Provides comprehensive error management and logging
 */
export var ErrorType;
(function (ErrorType) {
    ErrorType["CRITICAL"] = "CRITICAL";
    ErrorType["HIGH"] = "HIGH";
    ErrorType["MEDIUM"] = "MEDIUM";
    ErrorType["LOW"] = "LOW";
    ErrorType["INFO"] = "INFO";
})(ErrorType || (ErrorType = {}));
export class HumanAPIError extends Error {
    type;
    context;
    isRetryable;
    userMessage;
    constructor(message, type, context, isRetryable = false, userMessage) {
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
    getDefaultUserMessage() {
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
    static instance;
    errorLog = [];
    maxLogSize = 1000;
    constructor() { }
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    handleError(error, context = {}) {
        let humanError;
        if (error instanceof HumanAPIError) {
            humanError = error;
        }
        else {
            humanError = new HumanAPIError(error.message, ErrorType.MEDIUM, {
                component: context.component || 'Unknown',
                action: context.action || 'Unknown',
                ...context
            });
        }
        this.logError(humanError);
        this.notifyError(humanError);
        return humanError;
    }
    createError(message, type, context, isRetryable = false, userMessage) {
        return new HumanAPIError(message, type, context, isRetryable, userMessage);
    }
    logError(error) {
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
    notifyError(error) {
        // Only notify for high and critical errors
        if (error.type === ErrorType.HIGH || error.type === ErrorType.CRITICAL) {
            // In a real application, you would show user notifications
            console.warn('User notification:', error.userMessage);
        }
    }
    sendToLoggingService(error) {
        // In production, implement actual logging service integration
        // This could be Sentry, LogRocket, or a custom logging endpoint
        console.log('Sending to logging service:', error.toJSON());
    }
    getErrorLog() {
        return [...this.errorLog];
    }
    getErrorStats() {
        const byType = Object.values(ErrorType).reduce((acc, type) => {
            acc[type] = this.errorLog.filter(e => e.type === type).length;
            return acc;
        }, {});
        const byComponent = this.errorLog.reduce((acc, error) => {
            const component = error.context.component;
            acc[component] = (acc[component] || 0) + 1;
            return acc;
        }, {});
        return {
            total: this.errorLog.length,
            byType,
            byComponent,
            recentErrors: this.errorLog.slice(-10) // Last 10 errors
        };
    }
    clearErrorLog() {
        this.errorLog = [];
    }
}
// Convenience functions for common error scenarios
export const createDatabaseError = (message, context = {}) => new HumanAPIError(message, ErrorType.HIGH, { component: 'Database', action: 'Database Operation', ...context }, true, 'Database operation failed. Please try again.');
export const createCryptoError = (message, context = {}) => new HumanAPIError(message, ErrorType.CRITICAL, { component: 'Crypto', action: 'Encryption/Decryption', ...context }, false, 'Security operation failed. Please restart the application.');
export const createValidationError = (message, context = {}) => new HumanAPIError(message, ErrorType.MEDIUM, { component: 'Validation', action: 'Input Validation', ...context }, false, 'Invalid input provided. Please check your data and try again.');
export const createNetworkError = (message, context = {}) => new HumanAPIError(message, ErrorType.MEDIUM, { component: 'Network', action: 'Network Request', ...context }, true, 'Network request failed. Please check your connection and try again.');
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
