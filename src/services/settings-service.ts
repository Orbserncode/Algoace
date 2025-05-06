// src/services/settings-service.ts

/**
 * @fileOverview Service functions for managing application settings.
 * Replace mock implementations with actual backend interactions.
 */

import { z } from 'zod'; // For potential schema validation if needed

// Define types used in the settings forms
// Should align with the Zod schemas in the components

// LLM Provider type (align with credentials form schema)
export interface LLMProviderConfig {
  id?: string;
  providerType: "google" | "openai" | "anthropic" | "groq" | "local";
  apiKey?: string;
  apiUrl?: string; // For local provider
  modelName?: string; // For local provider, specific model
}

// Broker Config type (align with credentials form schema - using a generic version for mock)
export interface BrokerConfig {
    brokerType: "alpaca" | "interactive_brokers" | "coinbase" | "kraken" | "binance" | "mock";
    id?: string; // Add an ID for broker configs
    apiKey?: string;
    apiSecret?: string;
    accountNumber?: string;
    host?: string;
    port?: string | number;
    paperTrading?: boolean;
    clientId?: number;
    // [key: string]: any; // Allow other properties like apiKey, apiSecret, paperTrading etc.
}

// Trading Settings type (align with trading settings form schema)
export interface TradingSettings {
    defaultRiskPerTrade?: number;
    defaultRiskManagement?: "user_defined" | "ai_managed";
    maxPortfolioDrawdown?: number;
    maxPortfolioDrawdownManagement?: "user_defined" | "ai_managed";
    defaultLeverage?: number;
    leverageManagement?: "user_defined" | "ai_managed";
    defaultTrailingStopPercent?: number;
    trailingStopManagement?: "user_defined" | "ai_managed";
    allowedTradeTypes?: ("buy" | "sell")[];
    allowedTradingMethods?: ("spot" | "futures" | "options")[];
    allowedAssetTypes?: ("stock" | "crypto" | "forex" | "etf")[];
    allowedCategories?: string;
    preferredMarkets?: string;
}

// Saved Configuration type (for AI suggestions and history)
export interface SavedConfig {
    id: string;
    name: string;
    description?: string;
    createdAt: string; // ISO date string
    configData: Record<string, any>; // The actual configuration parameters (YAML/JSON parsed)
    source: 'AI-Generated' | 'User-Saved';
    status: 'Active' | 'Archived';
    strategyName?: string; // Optional: Name of strategy used with this config
    performanceSummary?: string; // Optional: Brief summary of performance
}


// --- Mock Data (Replace with actual backend storage/retrieval) ---

let mockCredentials = {
    llmProviders: [
        { id: 'llm-google-default', providerType: 'google', apiKey: 'GOOGLE_API_KEY_PLACEHOLDER', modelName: 'gemini-2.0-flash' },
        { id: 'llm-openai-default', providerType: 'openai', apiKey: 'OPENAI_API_KEY_PLACEHOLDER', modelName: 'gpt-4-turbo' },
        { id: 'llm-local-ollama', providerType: 'local', apiUrl: 'http://localhost:11434/v1', modelName: 'llama3:latest' },
    ] as LLMProviderConfig[],
    brokerConfigs: [ // Now an array
        {
            id: 'broker-alpaca-paper',
            brokerType: 'alpaca',
            apiKey: 'ALPACA_PAPER_KEY',
            apiSecret: 'ALPACA_PAPER_SECRET',
            paperTrading: true
        },
        {
            id: 'broker-ibkr-live',
            brokerType: 'interactive_brokers',
            accountNumber: 'U1234567',
            host: '127.0.0.1',
            port: 7496, // Live TWS port
        }
    ] as BrokerConfig[],
    serpApiKey: 'SERPAPI_KEY_PLACEHOLDER' as string | undefined,
};

let mockTradingSettings: TradingSettings = {
    defaultRiskPerTrade: 1,
    defaultRiskManagement: "user_defined",
    maxPortfolioDrawdown: 20,
    maxPortfolioDrawdownManagement: "user_defined",
    preferredMarkets: "NYSE, NASDAQ",
    defaultLeverage: 1,
    leverageManagement: "user_defined",
    allowedTradeTypes: ["buy", "sell"],
    allowedTradingMethods: ["spot"],
    allowedAssetTypes: ["stock", "etf"],
    allowedCategories: "Tech, Healthcare",
};

let mockSavedConfigs: SavedConfig[] = [
     { id: 'cfg-ai-1', name: 'AI Aggressive Growth (July)', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), source: 'AI-Generated', status: 'Active', configData: { defaultRiskPerTrade: 2.5, defaultLeverage: 10, defaultTrailingStopPercent: 1.5 }, strategyName: 'Momentum Burst', performanceSummary: '+5.2% last run' },
     { id: 'cfg-ai-2', name: 'AI Low Volatility (July)', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), source: 'AI-Generated', status: 'Active', configData: { defaultRiskPerTrade: 0.8, maxPortfolioDrawdown: 8 }, strategyName: 'Mean Reversion Scalper', performanceSummary: '+1.1% last run' },
     { id: 'cfg-user-1', name: 'My Conservative Setup', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), source: 'User-Saved', status: 'Active', configData: { defaultRiskPerTrade: 0.5, maxPortfolioDrawdown: 10, allowedAssetTypes: ['stock', 'etf'] } },
     { id: 'cfg-old-1', name: 'Old Crypto Config', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), source: 'User-Saved', status: 'Archived', configData: { defaultRiskPerTrade: 3, defaultLeverage: 20, allowedAssetTypes: ['crypto'] } },
];


// --- Helper Functions ---

// Simulate potential API/DB errors
const simulateError = (probability = 0.1): void => {
    if (Math.random() < probability) {
        console.warn(`Simulating a service error (probability: ${probability})`);
        throw new Error("Simulated settings service error.");
    }
}

const simulateDelay = (min = 200, max = 500): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
}


// --- Service Functions ---

/**
 * Fetches the current credentials (LLM providers, Broker configs, SerpAPI key).
 * NOTE: In a real app, sensitive data like API keys should NOT be sent to the frontend.
 * This mock function returns redacted data for demonstration.
 */
export async function getCredentials(): Promise<{ llmProviders: LLMProviderConfig[], brokerConfigs: BrokerConfig[], serpApiKey?: string }> {
    console.log("SERVICE: Fetching credentials (mock, redacted)");
    await simulateDelay();
    return {
        llmProviders: mockCredentials.llmProviders.map(p => ({ ...p, apiKey: p.apiKey ? '******' : undefined })),
        brokerConfigs: mockCredentials.brokerConfigs.map(b => ({ ...b, apiKey: b.apiKey ? '******' : undefined, apiSecret: b.apiSecret ? '******' : undefined })),
        serpApiKey: mockCredentials.serpApiKey ? '******' : undefined,
    };
}

/**
 * Saves updated credentials to the backend.
 * The backend must handle secure storage.
 * @param credentials The credentials object.
 */
export async function saveCredentials(credentials: { llmProviders?: LLMProviderConfig[], brokerConfigs?: BrokerConfig[], serpApiKey?: string }): Promise<void> {
    console.log("SERVICE: Saving credentials (mock)");
    await simulateDelay(500, 1000);
    simulateError(0.1);

    // Mock update: Merge new data
    if (credentials.llmProviders) {
        mockCredentials.llmProviders = credentials.llmProviders.map((p, index) => ({
             id: p.id || `llm-${p.providerType}-${Date.now()}-${index}`,
             ...p
        }));
    }
    if (credentials.brokerConfigs) {
        mockCredentials.brokerConfigs = credentials.brokerConfigs.map((b, index) => ({
            id: b.id || `broker-${b.brokerType}-${Date.now()}-${index}`,
            ...b
        }));
    }
    if (credentials.serpApiKey !== undefined) {
        mockCredentials.serpApiKey = credentials.serpApiKey;
    }

    console.log("SERVICE: Mock credentials updated.", mockCredentials);
}


/**
 * Tests the connection for a given LLM provider configuration.
 * @param providerConfig The configuration of the LLM provider to test.
 * @returns A promise resolving to an object with a success message or throwing an error.
 */
export async function testLLMConnection(providerConfig: LLMProviderConfig): Promise<{ success: boolean; message?: string }> {
    console.log(`SERVICE: Testing LLM connection for ${providerConfig.providerType} (mock)`);
    await simulateDelay(400, 800);
    const shouldFail = Math.random() < 0.15;
    if (shouldFail) {
        console.error(`SERVICE: Mock LLM connection test FAILED for ${providerConfig.providerType}`);
        throw new Error(`Connection failed. Check API key or URL.`);
    }
    console.log(`SERVICE: Mock LLM connection test SUCCEEDED for ${providerConfig.providerType}`);
    return { success: true, message: `Successfully listed models (mock).` };
}

/**
 * Tests the connection for a given Broker configuration.
 * @param brokerConfig The configuration of the broker to test.
 * @returns A promise resolving to an object with a success message or throwing an error.
 */
export async function testBrokerConnection(brokerConfig: BrokerConfig): Promise<{ success: boolean; message?: string }> {
    console.log(`SERVICE: Testing Broker connection for ${brokerConfig.brokerType} (mock)`);
    await simulateDelay(500, 1000);
    const shouldFail = Math.random() < 0.2;
    if (shouldFail) {
        console.error(`SERVICE: Mock Broker connection test FAILED for ${brokerConfig.brokerType}`);
        throw new Error(`Connection failed. Check credentials or broker status.`);
    }
    console.log(`SERVICE: Mock Broker connection test SUCCEEDED for ${brokerConfig.brokerType}`);
    return { success: true, message: `Account details fetched successfully (mock).` };
}


/**
 * Fetches the current trading settings.
 */
export async function getTradingSettings(): Promise<TradingSettings> {
    console.log("SERVICE: Fetching trading settings (mock)");
    await simulateDelay();
    return { ...mockTradingSettings }; // Return a copy
}

/**
 * Saves updated trading settings to the backend.
 * @param settings The updated trading settings.
 */
export async function saveTradingSettings(settings: TradingSettings): Promise<void> {
    console.log("SERVICE: Saving trading settings (mock)");
    await simulateDelay(300, 600);
    simulateError(0.05);
    mockTradingSettings = { ...settings };
    console.log("SERVICE: Mock trading settings updated.");
}

// --- AI Configuration Management ---

export async function getAIConfigSuggestions(): Promise<SavedConfig[]> {
     console.log("SERVICE: Fetching AI config suggestions (mock)");
     await simulateDelay(300, 700);
     return mockSavedConfigs.filter(c => c.source === 'AI-Generated' && c.status === 'Active');
}

export async function getSavedConfigs(includeArchived = false): Promise<SavedConfig[]> {
     console.log(`SERVICE: Fetching saved configs (includeArchived: ${includeArchived}) (mock)`);
     await simulateDelay(400, 800);
     const filtered = includeArchived
         ? [...mockSavedConfigs]
         : mockSavedConfigs.filter(c => c.status !== 'Archived');
    return filtered;
}

export async function archiveConfig(configId: string): Promise<SavedConfig | null> {
    console.log(`SERVICE: Archiving config ${configId} (mock)`);
    await simulateDelay();
    simulateError(0.05);
    const index = mockSavedConfigs.findIndex(c => c.id === configId);
    if (index === -1) return null;
    mockSavedConfigs[index].status = 'Archived';
    console.log(`SERVICE: Config ${configId} archived.`);
    return { ...mockSavedConfigs[index] };
}

export async function deleteConfig(configId: string): Promise<boolean> {
    console.log(`SERVICE: Deleting config ${configId} (mock)`);
    await simulateDelay();
    simulateError(0.1);
    const initialLength = mockSavedConfigs.length;
    mockSavedConfigs = mockSavedConfigs.filter(c => c.id !== configId);
    const deleted = mockSavedConfigs.length < initialLength;
     if (deleted) {
        console.log(`SERVICE: Config ${configId} deleted.`);
    } else {
         console.warn(`SERVICE: Config ${configId} not found for deletion.`);
    }
    return deleted;
}

export async function applyConfiguration(config: SavedConfig): Promise<void> {
     console.log(`SERVICE: Applying configuration ${config.id} (${config.name}) (mock)`);
     await simulateDelay(300, 500);
     simulateError(0.05);
     mockTradingSettings = {
         ...mockTradingSettings,
         ...config.configData,
     };
     console.log(`SERVICE: Configuration ${config.name} applied (mock).`);
     const index = mockSavedConfigs.findIndex(c => c.id === config.id);
     if (index !== -1 && mockSavedConfigs[index].source === 'AI-Generated') {
         console.log(`SERVICE: Suggestion ${config.id} considered applied.`);
     }
}


// --- LLM Provider Specific Functions ---

/**
 * Fetches a list of available models for a given LLM provider type.
 * This is a MOCK function. A real implementation would make API calls to the respective LLM provider.
 * @param providerType The type of the LLM provider.
 * @param apiKey Optional API key if needed for the provider's API.
 * @returns A promise resolving to an array of model name strings.
 */
export async function getAvailableLlmModels(providerType: LLMProviderConfig['providerType'], apiKey?: string): Promise<string[]> {
    console.log(`SERVICE: Fetching available models for ${providerType} (mock)`);
    await simulateDelay();
    // SimulateError if API key is missing for providers that need it (except local)
    if (providerType !== 'local' && !apiKey) {
        // throw new Error(`API key is required to fetch models for ${providerType}.`);
        // For mock, return empty or default if no key, rather than throwing error here
        return [];
    }

    switch (providerType) {
        case 'google':
            return ['gemini-2.0-flash', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-1.0-pro'];
        case 'openai':
            return ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'dall-e-3'];
        case 'anthropic':
            return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
        case 'groq':
            return ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'];
        case 'local':
            // For local, models are usually self-managed. Could have a mechanism to list from Ollama, etc.
            // Or user specifies model name directly.
            return ['llama3:latest', 'mistral:latest', 'phi3:latest', 'custom-local-model']; // Example local models
        default:
            return [];
    }
}

// --- Broker Specific Functions ---

/**
 * Fetches the list of currently configured brokers.
 */
export async function getConfiguredBrokers(): Promise<BrokerConfig[]> {
    console.log("SERVICE: Fetching configured brokers (mock)");
    await simulateDelay();
    // Return copies to prevent direct mutation, redact sensitive fields
    return mockCredentials.brokerConfigs.map(b => ({
        ...b,
        apiKey: b.apiKey ? '******' : undefined,
        apiSecret: b.apiSecret ? '******' : undefined,
    }));
}