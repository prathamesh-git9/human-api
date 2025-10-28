/**
 * Production-ready configuration system
 * Manages application settings, feature flags, and environment-specific configs
 */
class ConfigManager {
    static instance;
    config;
    isInitialized = false;
    constructor() {
        this.config = this.getDefaultConfig();
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Load environment-specific configuration
            await this.loadEnvironmentConfig();
            // Validate configuration
            this.validateConfig();
            this.isInitialized = true;
            console.log('Configuration initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize configuration:', error);
            throw error;
        }
    }
    getConfig() {
        if (!this.isInitialized) {
            throw new Error('Configuration not initialized. Call initialize() first.');
        }
        return { ...this.config };
    }
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.validateConfig();
    }
    getFeatureFlag(flag) {
        return this.config.features[flag];
    }
    setFeatureFlag(flag, value) {
        this.config.features[flag] = value;
    }
    isProduction() {
        return this.config.environment === 'production';
    }
    isDevelopment() {
        return this.config.environment === 'development';
    }
    isStaging() {
        return this.config.environment === 'staging';
    }
    getDefaultConfig() {
        const environment = process.env.NODE_ENV || 'development';
        return {
            version: '1.0.0',
            environment,
            database: {
                type: 'sqlite',
                path: environment === 'production' ? './data/memories.db' : './data/dev-memories.db',
                maxConnections: environment === 'production' ? 100 : 10,
                connectionTimeout: 30000,
                queryTimeout: 10000
            },
            crypto: {
                algorithm: 'AES-256-GCM',
                keyDerivation: 'PBKDF2',
                saltRounds: environment === 'production' ? 100000 : 10000,
                keyLength: 32,
                ivLength: 12
            },
            performance: {
                maxMemoryUsage: environment === 'production' ? '1GB' : '512MB',
                maxConcurrentRequests: environment === 'production' ? 100 : 20,
                cacheSize: environment === 'production' ? '256MB' : '64MB',
                chunkSize: environment === 'production' ? 1000 : 500,
                batchSize: environment === 'production' ? 50 : 10,
                timeoutMs: environment === 'production' ? 30000 : 10000
            },
            security: {
                enableEncryption: true,
                enableAuditLog: environment === 'production',
                maxLoginAttempts: 5,
                sessionTimeout: environment === 'production' ? 3600000 : 1800000, // 1 hour vs 30 minutes
                requirePasswordChange: environment === 'production',
                passwordMinLength: environment === 'production' ? 12 : 8
            },
            logging: {
                level: environment === 'production' ? 'warn' : 'debug',
                enableConsole: true,
                enableFile: environment === 'production',
                enableRemote: environment === 'production',
                maxFileSize: '10MB',
                maxFiles: 5,
                remoteEndpoint: environment === 'production' ? process.env.LOGGING_ENDPOINT : undefined
            },
            features: {
                enableRAG: true,
                enableVectorSearch: true,
                enableRealTimeSync: environment === 'production',
                enableCloudBackup: false, // Local-first by default
                enableAnalytics: environment === 'production',
                enableDebugMode: environment === 'development',
                enablePerformanceMonitoring: environment === 'production'
            },
            api: {
                baseUrl: environment === 'production' ? 'https://api.humanapi.com' : 'http://localhost:3000',
                timeout: 30000,
                retries: environment === 'production' ? 3 : 1,
                rateLimit: environment === 'production' ? 1000 : 100
            },
            ui: {
                theme: 'auto',
                language: 'en',
                animations: environment !== 'production',
                compactMode: false
            }
        };
    }
    async loadEnvironmentConfig() {
        // Load from environment variables
        const envConfig = this.loadFromEnvironment();
        // Load from config file if exists
        const fileConfig = await this.loadFromFile();
        // Merge configurations (file > env > default)
        this.config = {
            ...this.config,
            ...envConfig,
            ...fileConfig
        };
    }
    loadFromEnvironment() {
        return {
            environment: process.env.NODE_ENV,
            database: {
                path: process.env.DATABASE_PATH,
                maxConnections: process.env.DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DATABASE_MAX_CONNECTIONS) : undefined
            },
            crypto: {
                saltRounds: process.env.CRYPTO_SALT_ROUNDS ? parseInt(process.env.CRYPTO_SALT_ROUNDS) : undefined
            },
            performance: {
                maxMemoryUsage: process.env.MAX_MEMORY_USAGE,
                maxConcurrentRequests: process.env.MAX_CONCURRENT_REQUESTS ? parseInt(process.env.MAX_CONCURRENT_REQUESTS) : undefined
            },
            logging: {
                level: process.env.LOG_LEVEL,
                enableConsole: process.env.LOG_CONSOLE === 'true',
                enableFile: process.env.LOG_FILE === 'true',
                enableRemote: process.env.LOG_REMOTE === 'true',
                remoteEndpoint: process.env.LOGGING_ENDPOINT
            }
        };
    }
    async loadFromFile() {
        try {
            // In a real application, you would load from a config file
            // For now, return empty object
            return {};
        }
        catch (error) {
            console.warn('Could not load config file:', error);
            return {};
        }
    }
    validateConfig() {
        const errors = [];
        // Validate database config
        if (this.config.database.maxConnections < 1) {
            errors.push('Database maxConnections must be at least 1');
        }
        // Validate crypto config
        if (this.config.crypto.saltRounds < 1000) {
            errors.push('Crypto saltRounds must be at least 1000 for security');
        }
        // Validate performance config
        if (this.config.performance.maxConcurrentRequests < 1) {
            errors.push('Performance maxConcurrentRequests must be at least 1');
        }
        // Validate security config
        if (this.config.security.passwordMinLength < 8) {
            errors.push('Security passwordMinLength must be at least 8');
        }
        if (errors.length > 0) {
            throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
    }
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }
    resetToDefaults() {
        this.config = this.getDefaultConfig();
    }
}
// Export singleton instance
export const configManager = ConfigManager.getInstance();
// Export convenience functions
export const getConfig = () => configManager.getConfig();
export const updateConfig = (updates) => configManager.updateConfig(updates);
export const getFeatureFlag = (flag) => configManager.getFeatureFlag(flag);
export const setFeatureFlag = (flag, value) => configManager.setFeatureFlag(flag, value);
export const isProduction = () => configManager.isProduction();
export const isDevelopment = () => configManager.isDevelopment();
