// src/services/strategies-service.ts

/**
 * @fileOverview Service functions for fetching and managing trading strategies.
 * Replace mock implementations with actual data fetching logic (e.g., from a database or configuration files).
 */

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive' | 'Debugging' | 'Backtesting';
  pnl: number; // Consider fetching PnL dynamically or storing recent PnL
  winRate: number; // Similarly, fetch/calculate win rate
  // Add other relevant fields: parameters, associated agent ID, creation date, etc.
}

// Mock data - replace with actual data source
let mockStrategies: Strategy[] = [
  { id: 'strat-001', name: 'Momentum Burst', description: 'Captures short-term price surges.', status: 'Active', pnl: 1250.75, winRate: 65.2 },
  { id: 'strat-002', name: 'Mean Reversion Scalper', description: 'Trades price deviations from the mean.', status: 'Inactive', pnl: -340.10, winRate: 48.9 },
  { id: 'strat-003', name: 'AI Trend Follower', description: 'Uses ML to identify and follow trends.', status: 'Active', pnl: 3105.00, winRate: 72.1 },
  { id: 'strat-004', name: 'Arbitrage Finder', description: 'Exploits price differences across exchanges.', status: 'Debugging', pnl: 0, winRate: 0 },
];

/**
 * Fetches the list of all trading strategies.
 * TODO: Replace with actual data fetching logic (e.g., from database).
 * @returns A promise that resolves to an array of Strategy objects.
 */
export async function getStrategies(): Promise<Strategy[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 600));
  // In a real app, fetch from database or config store
  return [...mockStrategies]; // Return a copy to prevent direct mutation
}

/**
 * Fetches a single strategy by ID.
 * TODO: Replace with actual data fetching logic.
 * @param strategyId The ID of the strategy to fetch.
 * @returns A promise that resolves to the Strategy object or null if not found.
 */
export async function getStrategyById(strategyId: string): Promise<Strategy | null> {
    await new Promise(resolve => setTimeout(resolve, 250));
    const strategy = mockStrategies.find(s => s.id === strategyId);
    return strategy || null;
}

/**
 * Adds a new strategy.
 * TODO: Replace with actual data persistence logic.
 * @param newStrategyData Data for the new strategy (excluding ID, which should be generated).
 * @returns A promise that resolves to the newly created Strategy object.
 */
export async function addStrategy(newStrategyData: Omit<Strategy, 'id' | 'pnl' | 'winRate'>): Promise<Strategy> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newId = `strat-${String(Date.now()).slice(-3)}${Math.floor(Math.random() * 100)}`; // Simple unique ID generation
    const newStrategy: Strategy = {
        ...newStrategyData,
        id: newId,
        pnl: 0, // Initialize PnL
        winRate: 0, // Initialize win rate
        status: newStrategyData.status || 'Inactive', // Default status
    };
    mockStrategies.push(newStrategy);
    console.log("Added new strategy:", newStrategy);
    return newStrategy;
}


/**
 * Updates an existing strategy (e.g., status, parameters).
 * TODO: Replace with actual data update logic.
 * @param strategyId The ID of the strategy to update.
 * @param updates Partial data containing the updates.
 * @returns A promise that resolves to the updated Strategy object or null if not found.
 */
export async function updateStrategy(strategyId: string, updates: Partial<Omit<Strategy, 'id'>>): Promise<Strategy | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockStrategies.findIndex(s => s.id === strategyId);
    if (index === -1) {
        return null;
    }
    // Merge updates, ensuring not to overwrite the ID
    mockStrategies[index] = { ...mockStrategies[index], ...updates };
    console.log(`Updated strategy ${strategyId}:`, updates);
    return mockStrategies[index];
}

/**
 * Deletes a strategy.
 * TODO: Replace with actual data deletion logic.
 * @param strategyId The ID of the strategy to delete.
 * @returns A promise that resolves to true if deleted, false otherwise.
 */
export async function deleteStrategy(strategyId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 350));
    const initialLength = mockStrategies.length;
    mockStrategies = mockStrategies.filter(s => s.id !== strategyId);
    const deleted = mockStrategies.length < initialLength;
    if (deleted) {
        console.log(`Deleted strategy ${strategyId}`);
    } else {
         console.warn(`Strategy ${strategyId} not found for deletion.`);
    }
    return deleted;
}

// --- Potential AI-related functions ---

/**
 * Calls the Genkit flow to suggest a strategy configuration.
 * This function remains largely the same, calling the existing AI flow.
 */
import { suggestStrategyConfig as suggestStrategyConfigFlow, SuggestStrategyConfigInput, SuggestStrategyConfigOutput } from '@/ai/flows/suggest-strategy-config';

export async function suggestStrategyConfig(input: SuggestStrategyConfigInput): Promise<SuggestStrategyConfigOutput> {
    // Input validation could be added here
    return suggestStrategyConfigFlow(input);
}

/**
 * Simulates the process of generating, coding, backtesting a strategy based on AI suggestion.
 * In a real app, this would involve more complex steps:
 * 1. Call the LLM to generate code based on the suggested config.
 * 2. Save the code.
 * 3. Trigger a backtesting process (potentially another agent or service).
 * 4. Parse backtest results.
 * 5. If successful, add the strategy using addStrategy.
 * @param suggestion The configuration suggested by the AI.
 * @returns A promise resolving to the new Strategy if successful, null otherwise.
 */
export async function generateAndTestStrategyFromSuggestion(suggestion: SuggestStrategyConfigOutput): Promise<Strategy | null> {
    console.log(`Simulating generation for: ${suggestion.strategyName}`);
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000)); // Simulate coding & backtesting

    // Simulate success/failure
    const isSuccessful = Math.random() > 0.3; // 70% success rate for simulation

    if (isSuccessful) {
        console.log(`Backtesting successful for ${suggestion.strategyName}. Adding to strategies.`);
        const newStrategyData: Omit<Strategy, 'id' | 'pnl' | 'winRate'> = {
            name: suggestion.strategyName,
            description: `AI-generated based on ${suggestion.riskLevel} risk, expected ${suggestion.expectedReturn}% return.`,
            // Initial status might depend on auto-deploy settings
            status: 'Inactive', // Default to Inactive unless auto-deploy is on
            // parameters: suggestion.configurationOptions, // Store parameters if needed
        };
        const createdStrategy = await addStrategy(newStrategyData);
        return createdStrategy;
    } else {
        console.log(`Backtesting failed for ${suggestion.strategyName}.`);
        return null;
    }
}
