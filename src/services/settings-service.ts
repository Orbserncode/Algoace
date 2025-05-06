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
  apiUrl?: string;
}

// Broker Config type (align with credentials form schema - using a generic version for mock)
export interface BrokerConfig {
    brokerType: "alpaca" | "interactive_brokers" | "coinbase" | "kraken" | "binance" | "mock";
    [key: string]: any; // Allow other properties like apiKey, apiSecret, paperTrading etc.
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
        { id: 'llm-1', providerType: 'google', apiKey: 'EXISTING_GOOGLE_KEY_******' },
    ] as LLMProviderConfig[],
    brokerConfig: {
        brokerType: 'alpaca',
        apiKey: 'EXISTING_ALPACA_KEY_******',
        apiSecret: 'EXISTING_ALPACA_SECRET_******',
        paperTrading: true
    } as BrokerConfig | undefined,
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
 * Fetches the current credentials (LLM providers and Broker config).
 * NOTE: In a real app, sensitive data like API keys should NOT be sent to the frontend.
 * The backend should store them securely and the frontend might only get metadata (e.g., provider types configured).
 * This mock function returns redacted data for demonstration.
 */
export async function getCredentials(): Promise<{ llmProviders: LLMProviderConfig[], brokerConfig?: BrokerConfig }> {
    console.log("SERVICE: Fetching credentials (mock, redacted)");
    await simulateDelay();
    // Return copies to prevent direct mutation
    return {
        llmProviders: mockCredentials.llmProviders.map(p => ({ ...p, apiKey: p.apiKey ? '******' : undefined })),
        brokerConfig: mockCredentials.brokerConfig ? { ...mockCredentials.brokerConfig, apiKey: '******', apiSecret: '******' } : undefined,
    };
}

/**
 * Saves updated credentials to the backend.
 * The backend must handle secure storage (e.g., updating .env variables or a secure database).
 * @param credentials The credentials object containing potentially updated LLM providers and broker config.
 */
export async function saveCredentials(credentials: { llmProviders?: LLMProviderConfig[], brokerConfig?: BrokerConfig }): Promise<void> {
    console.log("SERVICE: Saving credentials (mock)");
    await simulateDelay(500, 1000);
    simulateError(0.1);

    // --- Backend actions needed here: ---
    // 1. Receive the credentials data.
    // 2. Validate the input.
    // 3. **Carefully** update the secure configuration source (e.g., .env file, secret manager, database).
    //    - Only update fields that were actually provided in the request.
    //    - Handle adding/removing LLM providers.
    //    - NEVER log the actual secret keys.
    // 4. Restarting the backend service might be required for .env changes to take effect.
    // -------------------------------------

    // Mock update: Merge new data (be careful with merging sensitive fields in real app)
    if (credentials.llmProviders) {
        // Basic merge/replace logic for mock
        mockCredentials.llmProviders = credentials.llmProviders.map((p, index) => ({
             id: p.id || `llm-${Date.now()}-${index}`, // Assign ID if new
             ...p
        }));
    }
    if (credentials.brokerConfig !== undefined) { // Allow clearing broker config
         mockCredentials.brokerConfig = credentials.brokerConfig;
    }

    console.log("SERVICE: Mock credentials updated.");
}


/**
 * Tests the connection for a given LLM provider configuration.
 * @param providerConfig The configuration of the LLM provider to test.
 * @returns A promise resolving to an object with a success message or throwing an error.
 */
export async function testLLMConnection(providerConfig: LLMProviderConfig): Promise<{ success: boolean; message?: string }> {
    console.log(`SERVICE: Testing LLM connection for ${providerConfig.providerType} (mock)`);
    await simulateDelay(400, 800);

    // --- Backend actions needed here: ---
    // 1. Based on providerType, use the apiKey/apiUrl to make a simple test request
    //    (e.g., list models, perform a small completion).
    // 2. Handle API-specific errors and authentication issues.
    // -------------------------------------

    // Mock success/failure
    const shouldFail = providerConfig.providerType === 'anthropic' || Math.random() < 0.15; // Example: Anthropic fails, 15% random fail
    if (shouldFail) {
        console.error(`SERVICE: Mock LLM connection test FAILED for ${providerConfig.providerType}`);
        throw new Error(`Connection failed. Check API key or URL.`);
    }

    console.log(`SERVICE: Mock LLM connection test SUCCEEDED for ${providerConfig.providerType}`);
    return { success: true, message: `Successfully listed models.` }; // Example success message
}

/**
 * Tests the connection for a given Broker configuration.
 * @param brokerConfig The configuration of the broker to test.
 * @returns A promise resolving to an object with a success message or throwing an error.
 */
export async function testBrokerConnection(brokerConfig: BrokerConfig): Promise<{ success: boolean; message?: string }> {
    console.log(`SERVICE: Testing Broker connection for ${brokerConfig.brokerType} (mock)`);
    await simulateDelay(500, 1000);

    // --- Backend actions needed here: ---
    // 1. Based on brokerType, instantiate the appropriate Lumibot broker client (or other library).
    // 2. Use the provided credentials (apiKey, secret, account details etc.).
    // 3. Attempt a simple authenticated request (e.g., get_account_details, check_connection).
    // 4. Handle API-specific errors and authentication issues.
    // -------------------------------------

     // Mock success/failure
    const shouldFail = brokerConfig.brokerType === 'binance' || Math.random() < 0.2; // Example: Binance fails, 20% random fail
    if (shouldFail) {
        console.error(`SERVICE: Mock Broker connection test FAILED for ${brokerConfig.brokerType}`);
        throw new Error(`Connection failed. Check credentials or broker status.`);
    }

    console.log(`SERVICE: Mock Broker connection test SUCCEEDED for ${brokerConfig.brokerType}`);
    return { success: true, message: `Account details fetched successfully.` }; // Example success message
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

    // --- Backend actions needed here: ---
    // 1. Receive settings data.
    // 2. Validate input.
    // 3. Save to configuration source (database, config file).
    // -------------------------------------

    mockTradingSettings = { ...settings };
    console.log("SERVICE: Mock trading settings updated.");
}

// --- AI Configuration Management ---

/**
 * Fetches pending AI configuration suggestions.
 * In a real system, this might query a specific status in the config database.
 */
export async function getAIConfigSuggestions(): Promise<SavedConfig[]> {
     console.log("SERVICE: Fetching AI config suggestions (mock)");
     await simulateDelay(300, 700);
     // Filter mock data for AI-generated and Active status
     return mockSavedConfigs.filter(c => c.source === 'AI-Generated' && c.status === 'Active');
}

/**
 * Fetches all saved configurations (user and AI, excluding archived by default).
 */
export async function getSavedConfigs(includeArchived = false): Promise<SavedConfig[]> {
     console.log(`SERVICE: Fetching saved configs (includeArchived: ${includeArchived}) (mock)`);
     await simulateDelay(400, 800);
     const filtered = includeArchived
         ? [...mockSavedConfigs]
         : mockSavedConfigs.filter(c => c.status !== 'Archived');
    return filtered;
}

/**
 * Archives a specific configuration.
 */
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

/**
 * Deletes a specific configuration permanently.
 */
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

/**
 * Loads/applies an accepted configuration.
 * In a real app, this would update the *active* trading parameters used by execution agents.
 * This might involve updating the main trading settings or a specific agent's config.
 * @param config The configuration to apply.
 */
export async function applyConfiguration(config: SavedConfig): Promise<void> {
     console.log(`SERVICE: Applying configuration ${config.id} (${config.name}) (mock)`);
     await simulateDelay(300, 500);
     simulateError(0.05);

     // --- Backend actions needed here: ---
     // 1. Fetch the full config data if not already passed.
     // 2. Update the active configuration source (e.g., main settings in DB, agent-specific settings).
     // 3. Potentially notify running agents to reload their configuration.
     // -------------------------------------

     // Mock: Update the main trading settings with the config data (simple merge)
     // WARNING: This is overly simplistic. A real implementation needs careful mapping
     // and consideration of which settings are part of a "config preset".
     mockTradingSettings = {
         ...mockTradingSettings,
         ...config.configData, // Overwrite with config data
         // Ensure management types are handled correctly if config implies AI management
     };

     console.log(`SERVICE: Configuration ${config.name} applied (mock).`);

     // Maybe update the status of the applied config in the DB (e.g., mark as 'Active' or remove from 'suggestions')
     const index = mockSavedConfigs.findIndex(c => c.id === config.id);
     if (index !== -1 && mockSavedConfigs[index].source === 'AI-Generated') {
         // Example: Remove from suggestions list implicitly by changing status or deleting
         // For mock, let's just log it. Real app needs DB update.
         console.log(`SERVICE: Suggestion ${config.id} considered applied.`);
     }
}
