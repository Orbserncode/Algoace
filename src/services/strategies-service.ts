// src/services/strategies-service.ts

/**
 * @fileOverview Service functions for fetching and managing trading strategies.
 * Replace mock implementations with actual data fetching logic (e.g., from a database or configuration files).
 * Backend Tech Stack: While not explicitly defined by the frontend code alone, a typical backend for this Next.js app could use Node.js (potentially with Express or Fastify), Python (with Flask/Django/FastAPI), or Go. The database could be PostgreSQL, MongoDB, or Firebase Firestore. The choice depends on specific requirements like performance, scalability, and team familiarity. The interaction with Lumibot suggests a Python backend might be involved for running strategies.
 */
import { SuggestStrategyConfigInput, SuggestStrategyConfigOutput } from '@/ai/flows/suggest-strategy-config'; // Ensure flow types are imported
import { suggestStrategyConfig as suggestStrategyConfigFlow } from '@/ai/flows/suggest-strategy-config'; // Import the actual flow function

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive' | 'Debugging' | 'Backtesting';
  pnl: number; // Consider fetching PnL dynamically or storing recent PnL
  winRate: number; // Similarly, fetch/calculate win rate
  // Add other relevant fields: parameters, associated agent ID, creation date, source (AI-gen/Uploaded), filename etc.
  source?: 'AI-Generated' | 'Uploaded';
  fileName?: string; // Store original filename if uploaded
}

// Mock data - replace with actual data source
// Use `let` to allow modification by add/update/delete functions
let mockStrategies: Strategy[] = [
  { id: 'strat-001', name: 'Momentum Burst', description: 'Captures short-term price surges.', status: 'Active', pnl: 1250.75, winRate: 65.2, source: 'Uploaded', fileName: 'momentum_burst_v1.py' },
  { id: 'strat-002', name: 'Mean Reversion Scalper', description: 'Trades price deviations from the mean.', status: 'Inactive', pnl: -340.10, winRate: 48.9, source: 'Uploaded', fileName: 'mr_scalper_final.py' },
  { id: 'strat-003', name: 'AI Trend Follower', description: 'Uses ML to identify and follow trends.', status: 'Active', pnl: 3105.00, winRate: 72.1, source: 'AI-Generated' },
  { id: 'strat-004', name: 'Arbitrage Finder', description: 'Exploits price differences across exchanges.', status: 'Debugging', pnl: 0, winRate: 0, source: 'Uploaded', fileName: 'arb_bot_exp.py' },
];

// Simulate potential API/DB errors
const simulateError = (probability = 0.1) => {
    if (Math.random() < probability) {
        throw new Error("Simulated service error.");
    }
}

/**
 * Fetches the list of all trading strategies.
 * TODO: Replace with actual data fetching logic (e.g., from database).
 * @returns A promise that resolves to an array of Strategy objects.
 */
export async function getStrategies(): Promise<Strategy[]> {
  console.log("Fetching strategies...");
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400)); // Slightly variable delay
  simulateError(0.05); // 5% chance of error on fetch
  console.log("Fetched strategies:", mockStrategies.length);
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
    console.log(`Fetching strategy by ID: ${strategyId}`);
    await new Promise(resolve => setTimeout(resolve, 250 + Math.random() * 200));
    simulateError(0.02); // Lower chance for single fetch
    const strategy = mockStrategies.find(s => s.id === strategyId);
    console.log(strategy ? `Found strategy: ${strategy.name}` : `Strategy ${strategyId} not found.`);
    return strategy || null;
}

/**
 * Adds a new strategy (typically AI-generated or manually defined without file).
 * TODO: Replace with actual data persistence logic.
 * @param newStrategyData Data for the new strategy (excluding ID, which should be generated).
 * @returns A promise that resolves to the newly created Strategy object.
 */
export async function addStrategy(newStrategyData: Omit<Strategy, 'id' | 'pnl' | 'winRate'>): Promise<Strategy> {
    console.log("Adding new strategy:", newStrategyData.name);
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));
    simulateError(0.1); // Simulate potential creation error
    const newId = `strat-${String(Date.now()).slice(-4)}${Math.floor(Math.random() * 90 + 10)}`; // Slightly better unique ID
    const newStrategy: Strategy = {
        ...newStrategyData,
        id: newId,
        pnl: 0, // Initialize PnL
        winRate: 0, // Initialize win rate
        status: newStrategyData.status || 'Inactive', // Default status
        source: newStrategyData.source || 'AI-Generated', // Default source if not provided
    };
    mockStrategies.push(newStrategy);
    console.log("Added new strategy:", newStrategy.id, newStrategy.name);
    return newStrategy;
}

/**
 * Adds a new strategy from an uploaded file (mock implementation).
 * TODO: Requires backend implementation for file storage, validation (Lumibot compatibility), and processing.
 * @param newStrategyData Data including name, description, and original filename.
 * @returns A promise that resolves to the newly created Strategy object.
 */
export async function addStrategyWithFile(newStrategyData: {
    name: string;
    description: string;
    fileName: string;
    // status?: 'Active' | 'Inactive' | 'Debugging' | 'Backtesting'; // Optional status override
    // fileContent?: string; // Could be sent if backend processes content directly
}): Promise<Strategy> {
    console.log("Adding new strategy from file:", newStrategyData.fileName);
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300)); // Simulate processing/DB save
    simulateError(0.1); // Simulate potential upload/save error

    // --- Backend actions needed here: ---
    // 1. Receive the file (e.g., via FormData).
    // 2. Validate the file (is it a .py? does it seem like Lumibot code? size check?).
    // 3. Store the file securely (e.g., S3, GCS, local disk).
    // 4. Save strategy metadata (name, description, file path/ID, status) to the database.
    // -------------------------------------

    const newId = `strat-up-${String(Date.now()).slice(-3)}${Math.floor(Math.random() * 90 + 10)}`;
    const newStrategy: Strategy = {
        id: newId,
        name: newStrategyData.name,
        description: newStrategyData.description,
        status: 'Inactive', // Uploaded strategies likely start inactive for review/backtesting
        pnl: 0,
        winRate: 0,
        source: 'Uploaded',
        fileName: newStrategyData.fileName,
    };
    mockStrategies.push(newStrategy);
    console.log("Added new strategy from file:", newStrategy.id, newStrategy.name);
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
    console.log(`Updating strategy ${strategyId} with:`, updates);
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 150));
    simulateError(0.1); // Simulate potential update error
    const index = mockStrategies.findIndex(s => s.id === strategyId);
    if (index === -1) {
        console.warn(`Strategy ${strategyId} not found for update.`);
        return null;
    }
    // Merge updates, ensuring not to overwrite the ID
    // Create a new object to ensure immutability for state updates
    const updatedStrategy = { ...mockStrategies[index], ...updates };
    mockStrategies[index] = updatedStrategy;
    console.log(`Updated strategy ${strategyId}:`, updatedStrategy);
    return updatedStrategy; // Return the new object
}

/**
 * Deletes a strategy.
 * TODO: Replace with actual data deletion logic (including associated files if applicable).
 * @param strategyId The ID of the strategy to delete.
 * @returns A promise that resolves to true if deleted, false otherwise.
 */
export async function deleteStrategy(strategyId: string): Promise<boolean> {
    console.log(`Deleting strategy ${strategyId}`);
    await new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 150));
    simulateError(0.1); // Simulate potential deletion error

    // --- Backend actions needed here: ---
    // 1. Find strategy metadata in the database.
    // 2. If it's an uploaded strategy, delete the associated file from storage.
    // 3. Delete the strategy metadata record from the database.
    // -------------------------------------

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

// --- AI-related functions ---

/**
 * Calls the Genkit flow to suggest a strategy configuration.
 * This function directly calls the imported AI flow function.
 */
export async function suggestStrategyConfig(input: SuggestStrategyConfigInput): Promise<SuggestStrategyConfigOutput> {
    console.log("Calling Genkit flow 'suggestStrategyConfig'...");
    try {
        // Input validation could be added here before calling the flow
        const result = await suggestStrategyConfigFlow(input);
        console.log("Genkit flow 'suggestStrategyConfig' successful.");
        return result;
    } catch (error) {
         console.error("Error calling Genkit flow 'suggestStrategyConfig':", error);
         // Re-throw or handle error appropriately
         throw new Error(`AI suggestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Simulates the process of generating, coding, backtesting a strategy based on AI suggestion.
 * In a real app, this would involve more complex steps:
 * 1. Call the LLM to generate code based on the suggested config (potentially another Genkit flow).
 * 2. Save the code (potentially using the backend file storage mechanism).
 * 3. Trigger a backtesting process (potentially another agent or service, referencing the saved code).
 * 4. Parse backtest results.
 * 5. If successful, add the strategy using addStrategy.
 * @param suggestion The configuration suggested by the AI.
 * @returns A promise resolving to the new Strategy if successful, null otherwise.
 */
export async function generateAndTestStrategyFromSuggestion(suggestion: SuggestStrategyConfigOutput): Promise<Strategy | null> {
    console.log(`Simulating generation & backtesting for: ${suggestion.strategyName}`);
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000)); // Simulate coding & backtesting (longer delay)

    // Simulate success/failure based on suggestion (e.g., higher risk might fail more often)
    let successRate = 0.7; // Base success rate
    if (suggestion.riskLevel === 'high') successRate = 0.5;
    if (suggestion.riskLevel === 'low') successRate = 0.8;
    const isSuccessful = Math.random() < successRate;

    // Simulate potential random errors during the process
    try {
         simulateError(0.15); // 15% chance of random error during generation/backtest
    } catch(error) {
        console.error(`Simulated error during generation/backtest for ${suggestion.strategyName}:`, error);
        throw new Error(`Generation/Backtesting process failed unexpectedly for ${suggestion.strategyName}.`);
    }


    if (isSuccessful) {
        console.log(`Backtesting successful for ${suggestion.strategyName}. Adding to strategies.`);
        try {
            const newStrategyData: Omit<Strategy, 'id' | 'pnl' | 'winRate'> = {
                name: suggestion.strategyName,
                description: `AI-generated (${suggestion.riskLevel} risk, exp. ${suggestion.expectedReturn}% return). Config: ${JSON.stringify(suggestion.configurationOptions)}`,
                status: 'Inactive', // Default to Inactive unless auto-deploy is on
                source: 'AI-Generated',
                // parameters: suggestion.configurationOptions, // Store parameters if needed
            };
            // Use the actual addStrategy function which includes its own delay and error simulation
            const createdStrategy = await addStrategy(newStrategyData);
            // Simulate assigning some realistic (maybe slightly random) initial PnL/WinRate after "backtest"
             if (createdStrategy) {
                 createdStrategy.pnl = (Math.random() - 0.4) * 500; // Example: Random PnL around 0
                 createdStrategy.winRate = 40 + Math.random() * 30; // Example: Win rate between 40-70%
                 await updateStrategy(createdStrategy.id, { pnl: createdStrategy.pnl, winRate: createdStrategy.winRate });
             }
            return createdStrategy;
        } catch (addError) {
             console.error(`Failed to add successfully backtested strategy ${suggestion.strategyName}:`, addError);
             // Even if backtest was "successful", adding might fail
             throw new Error(`Failed to save the generated strategy ${suggestion.strategyName} after successful backtest.`);
        }
    } else {
        console.log(`Backtesting failed for ${suggestion.strategyName}. Strategy not added.`);
        return null; // Indicate failure clearly
    }
}
