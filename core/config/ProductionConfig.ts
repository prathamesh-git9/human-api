/**
 * Production-ready configuration system
 * Manages application settings, feature flags, and environment-specific configs
 */

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql';
  path?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
}

export interface CryptoConfig {
  algorithm: 'AES-256-GCM' | 'AES-128-GCM';
  keyDerivation: 'PBKDF2' | 'Argon2' | 'scrypt';
  saltRounds: number;
  keyLength: number;
  ivLength: number;
}

export interface PerformanceConfig {
  maxMemoryUsage: string;
  maxConcurrentRequests: number;
  cacheSize: string;
  chunkSize: number;
  batchSize: number;
  timeoutMs: number;
}

export interface SecurityConfig {
  enableEncryption: boolean;
  enableAuditLog: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  requirePasswordChange: boolean;
  passwordMinLength: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  maxFileSize: string;
  maxFiles: number;
  remoteEndpoint?: string;
}

export interface FeatureFlags {
  enableRAG: boolean;
  enableVectorSearch: boolean;
  enableRealTimeSync: boolean;
  enableCloudBackup: boolean;
  enableAnalytics: boolean;
  enableDebugMode: boolean;
  enablePerformanceMonitoring: boolean;
}

export interface ProductionConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  database: DatabaseConfig;
  crypto: CryptoConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  features: FeatureFlags;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    rateLimit: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    animations: boolean;
    compactMode: boolean;
  };
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: ProductionConfig;
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async initialize(): Promise<void> {
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
    } catch (error) {
      console.error('Failed to initialize configuration:', error);
      throw error;
    }
  }

  public getConfig(): ProductionConfig {
    if (!this.isInitialized) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ProductionConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }

  public getFeatureFlag(flag: keyof FeatureFlags): boolean {
    return this.config.features[flag];
  }

  public setFeatureFlag(flag: keyof FeatureFlags, value: boolean): void {
    this.config.features[flag] = value;
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  public isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  private getDefaultConfig(): ProductionConfig {
    const environment = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';
    
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

  private async loadEnvironmentConfig(): Promise<void> {
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

  private loadFromEnvironment(): Partial<ProductionConfig> {
    return {
      environment: process.env.NODE_ENV as any,
      database: {
        path: process.env.DATABASE_PATH,
        maxConnections: process.env.DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DATABASE_MAX_CONNECTIONS) : this.config.database.maxConnections
      },
      crypto: {
        saltRounds: process.env.CRYPTO_SALT_ROUNDS ? parseInt(process.env.CRYPTO_SALT_ROUNDS) : this.config.crypto.saltRounds
      },
      performance: {
        maxMemoryUsage: process.env.MAX_MEMORY_USAGE || this.config.performance.maxMemoryUsage,
        maxConcurrentRequests: process.env.MAX_CONCURRENT_REQUESTS ? parseInt(process.env.MAX_CONCURRENT_REQUESTS) : this.config.performance.maxConcurrentRequests
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || this.config.logging.level,
        enableConsole: process.env.LOG_CONSOLE === 'true' || this.config.logging.enableConsole,
        enableFile: process.env.LOG_FILE === 'true' || this.config.logging.enableFile,
        enableRemote: process.env.LOG_REMOTE === 'true' || this.config.logging.enableRemote,
        maxFileSize: this.config.logging.maxFileSize,
        maxFiles: this.config.logging.maxFiles,
        remoteEndpoint: process.env.LOGGING_ENDPOINT || this.config.logging.remoteEndpoint
      }
    };
  }

  private async loadFromFile(): Promise<Partial<ProductionConfig>> {
    try {
      // In a real application, you would load from a config file
      // For now, return empty object
      return {};
    } catch (error) {
      console.warn('Could not load config file:', error);
      return {};
    }
  }

  private validateConfig(): void {
    const errors: string[] = [];

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

  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

// Export convenience functions
export const getConfig = () => configManager.getConfig();
export const updateConfig = (updates: Partial<ProductionConfig>) => configManager.updateConfig(updates);
export const getFeatureFlag = (flag: keyof FeatureFlags) => configManager.getFeatureFlag(flag);
export const setFeatureFlag = (flag: keyof FeatureFlags, value: boolean) => configManager.setFeatureFlag(flag, value);
export const isProduction = () => configManager.isProduction();
export const isDevelopment = () => configManager.isDevelopment();
