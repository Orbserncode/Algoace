// src/services/settings-service.ts

/**
 * @fileOverview Mock service functions for managing application settings,
 * including LLM providers, broker configurations, and trading settings.
 * Replace mocks with actual backend API calls and database interactions.
 */

// --- LLM Provider Types ---
type LlmProviderKey = 'google' | 'openai' | 'anthropic' | 'groq' | 'local';

export interface LlmConfig {
    providerId?: string; // Optional: Exists for saved configs
    providerType: LlmProviderKey;
    apiKey?: string;
    baseUrl?: string;
    modelName?: string;
}

// --- Broker Types ---
type BrokerKey = 'alpaca' | 'interactive_brokers' | 'tradier' | 'coinbase';

export interface BrokerConfig {
    type: BrokerKey;
    apiKey?: string;
    apiSecret?: string;
    accountNumber?: string;
    host?: string;
    port?: string;
    paperTrading?: boolean;
    // Include providerId if managing multiple configs per type
    // providerId?: string;
}

// --- Trading Settings / AI Config Types ---
export interface AiConfigRecommendation {
    id: string;
    name: string;
    generatedAt: string; // ISO Date string
    reason: string; // Why the config was recommended
    parameters: Record<string, any>; // The actual recommended settings
}

export interface StoredTradingConfig {
    id: string;
    name: string;
    savedAt: string; // ISO Date string
    parameters: Record<string, any>; // The saved settings
    associatedStrategyId?: string; // Which strategy it was used with (optional)
    performance?: number; // PnL % achieved with this config (optional)
    isArchived?: boolean;
}


// --- Mock Data Store ---
let mockLlmConfigs: LlmConfig[] = [
    { providerId: 'llm-google-1', providerType: 'google', apiKey: 'EXISTING_GOOGLE_KEY_******' },
    { providerId: 'llm-local-1', providerType: 'local', baseUrl: 'http://localhost:11434', modelName: 'llama3' },
];

let mockBrokerConfig: BrokerConfig | null = {
    type: 'alpaca',
    apiKey: 'EXISTING_ALPACA_KEY_******',
    apiSecret: 'EXISTING_ALPACA_SECRET_******',
    paperTrading: true,
}; // Assuming only one broker config active at a time for simplicity

let mockAiRecommendations: AiConfigRecommendation[] = [
    { id: 'rec-001', name: 'Volatile Market Risk Adjustment', generatedAt: new Date(Date.now() - 86400000).toISOString(), reason: 'High VIX detected', parameters: { defaultRiskPerTrade: 0.5, maxPortfolioDrawdown: 15 } },
    { id: 'rec-002', name: 'Bullish Crypto Leverage Increase', generatedAt: new Date(Date.now() - 3600000).toISOString(), reason: 'Strong BTC uptrend signal', parameters: { defaultLeverage: 20 } },
];

let mockStoredConfigs: StoredTradingConfig[] = [
    { id: 'cfg-hist-001', name: 'Q1 2024 Conservative', savedAt: '2024-04-01T10:00:00Z', parameters: { defaultRiskPerTrade: 0.8, maxPortfolioDrawdown: 18, defaultLeverage: 5 }, associatedStrategyId: 'strat-001', performance: 5.2, isArchived: false },
    { id: 'cfg-hist-002', name: 'Dec 2023 Aggressive Crypto', savedAt: '2024-01-05T10:00:00Z', parameters: { defaultRiskPerTrade: 2.0, maxPortfolioDrawdown: 25, defaultLeverage: 25 }, associatedStrategyId: 'strat-003', performance: 15.8, isArchived: false },
    { id: 'cfg-hist-003', name: 'Old Test Config', savedAt: '2023-11-15T10:00:00Z', parameters: { defaultRiskPerTrade: 1.0, maxPortfolioDrawdown: 20 }, isArchived: true },
];

// --- Utility Functions ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const simulateError = (probability = 0.1) => {
    if (Math.random() < probability) {
        throw new Error("Simulated backend service error.");
    }
};

// --- Mock Service Functions ---

// == LLM Providers ==

export async function getLlmConfigs(): Promise<LlmConfig[]> {
    console.log("SERVICE: Fetching LLM configurations...");
    await delay(300);
    // simulateError(0.05);
    console.log("SERVICE: Returning", mockLlmConfigs.length, "LLM configs.");
    return [...mockLlmConfigs]; // Return copy
}

export async function saveLlmConfig(config: LlmConfig): Promise<LlmConfig> {
    console.log("SERVICE: Saving LLM configuration:", config.providerType, config.providerId);
    await delay(500);
    simulateError(0.1);

    // Assign ID if it's a new config
    if (!config.providerId) {
        config.providerId = `llm-${config.providerType}-${Date.now().toString().slice(-4)}`;
    }

    // Update or add to mock store
    const existingIndex = mockLlmConfigs.findIndex(c => c.providerId === config.providerId);
    if (existingIndex > -1) {
        mockLlmConfigs[existingIndex] = config;
        console.log("SERVICE: Updated existing LLM config:", config.providerId);
    } else {
        mockLlmConfigs.push(config);
        console.log("SERVICE: Added new LLM config:", config.providerId);
    }

    // In a real backend:
    // 1. Validate the input.
    // 2. Encrypt sensitive fields (apiKey).
    // 3. Save to database or secure config store.
    // 4. Return the saved config (potentially omitting sensitive fields).

    return { ...config }; // Return a copy
}

export async function deleteLlmConfig(providerId: string): Promise<void> {
    console.log("SERVICE: Deleting LLM configuration:", providerId);
    await delay(400);
    simulateError(0.05);
    const initialLength = mockLlmConfigs.length;
    mockLlmConfigs = mockLlmConfigs.filter(c => c.providerId !== providerId);
    if (mockLlmConfigs.length === initialLength) {
         console.warn("SERVICE: LLM config not found for deletion:", providerId);
        // Optionally throw an error if not found, depending on desired behavior
        // throw new Error("Configuration not found.");
    } else {
         console.log("SERVICE: Deleted LLM config:", providerId);
    }
    // In a real backend: Delete from database/config store.
}

export async function testLlmConnection(config: LlmConfig): Promise<{ success: boolean; message: string }> {
    console.log("SERVICE: Testing LLM connection:", config.providerType);
    await delay(1000 + Math.random() * 500); // Simulate test duration
    simulateError(0.15); // Higher chance of test failure simulation

    // In a real backend:
    // 1. Use the provided config (apiKey, baseUrl, etc.) to instantiate the LLM client.
    // 2. Make a simple test call (e.g., list models, send a short prompt).
    // 3. Based on the response, return success or failure.

    const success = Math.random() > 0.2; // 80% chance of mock success
    const message = success
        ? `Successfully connected to ${config.providerType === 'local' ? config.baseUrl : llmProviders[config.providerType].name}.`
        : `Failed to connect. Check ${config.providerType === 'local' ? 'Base URL and ensure model is running' : 'API Key and provider status'}.`;

    console.log(`SERVICE: LLM test result for ${config.providerType}: ${success ? 'Success' : 'Failure'}`);
    return { success, message };
}

// == Broker Configuration ==

export async function saveBrokerConfig(config: BrokerConfig): Promise<void> {
    console.log("SERVICE: Saving Broker configuration:", config.type);
    await delay(600);
    simulateError(0.1);

    // In a real backend:
    // 1. Validate input.
    // 2. Encrypt sensitive fields (apiKey, apiSecret).
    // 3. Save to a secure configuration store or database (likely replacing the previous config).
    // IMPORTANT: Handle this securely, e.g., updating environment variables requires restart or specific libraries.

    mockBrokerConfig = { ...config }; // Replace mock config
    console.log("SERVICE: Broker config updated (mock). Restart might be needed in real app.");
}

export async function testBrokerConnection(config: BrokerConfig): Promise<{ success: boolean; message: string }> {
    console.log("SERVICE: Testing Broker connection:", config.type, config.paperTrading ? '(Paper)' : '(Live)');
    await delay(1200 + Math.random() * 600); // Simulate test duration
    simulateError(0.2); // Higher chance of test failure simulation

    // In a real backend:
    // 1. Use the provided credentials to instantiate the broker client (e.g., Lumibot Broker).
    // 2. Make a test call (e.g., get_account(), get_clock()).
    // 3. Based on the response/error, return success or failure.

     const success = Math.random() > 0.25; // 75% chance of mock success
     const message = success
         ? `Successfully connected to ${brokers[config.type].name} ${config.paperTrading ? '(Paper)' : ''}.`
         : `Failed to connect to ${brokers[config.type].name}. Check credentials and connection details.`;

    console.log(`SERVICE: Broker test result for ${config.type}: ${success ? 'Success' : 'Failure'}`);
    return { success, message };
}


// == Trading Settings / AI Configs ==

export async function getAiConfigRecommendations(): Promise<AiConfigRecommendation[]> {
    console.log("SERVICE: Fetching AI config recommendations...");
    await delay(400);
    // Simulate new recommendations appearing sometimes
    if (Math.random() < 0.1) {
         mockAiRecommendations.push({
             id: `rec-${Date.now().toString().slice(-4)}`,
             name: `Dynamic Rec ${mockAiRecommendations.length + 1}`,
             generatedAt: new Date().toISOString(),
             reason: 'Simulated new event',
             parameters: { defaultRiskPerTrade: Math.random().toFixed(1) }
         })
    }
    console.log("SERVICE: Returning", mockAiRecommendations.length, "AI recs.");
    return [...mockAiRecommendations];
}

export async function getStoredConfigs(): Promise<StoredTradingConfig[]> {
    console.log("SERVICE: Fetching stored trading configs...");
    await delay(350);
    console.log("SERVICE: Returning", mockStoredConfigs.length, "stored configs.");
    return [...mockStoredConfigs];
}

export async function deleteStoredConfig(configId: string): Promise<void> {
     console.log("SERVICE: Deleting stored trading config:", configId);
     await delay(300);
     simulateError(0.05);
     const initialLength = mockStoredConfigs.length;
     mockStoredConfigs = mockStoredConfigs.filter(c => c.id !== configId);
     if (mockStoredConfigs.length === initialLength) {
         console.warn("SERVICE: Stored config not found for deletion:", configId);
         throw new Error("Configuration not found."); // Throw error if not found
     } else {
          console.log("SERVICE: Deleted stored config:", configId);
     }
     // In real backend: Delete from database.
}

// TODO: Add functions for:
// - Saving current form settings as a new StoredTradingConfig
// - Accepting an AIConfigRecommendation (which likely saves it as a StoredTradingConfig and potentially activates it)
// - Archiving/Unarchiving StoredTradingConfig
// - Loading/Applying a StoredTradingConfig to the active settings
