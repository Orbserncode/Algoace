// src/services/strategies-service.ts

/**
 * @fileOverview Service functions for fetching and managing trading strategies.
 * This service connects to the backend API to fetch and manage strategies.
 * The backend is built with FastAPI and uses SQLModel to interact with a SQLite database.
 */
import { SuggestStrategyConfigInput, SuggestStrategyConfigOutput } from '@/ai/flows/suggest-strategy-config'; // Ensure flow types are imported
import { suggestStrategyConfig as suggestStrategyConfigFlow } from '@/ai/flows/suggest-strategy-config'; // Import the actual flow function

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive' | 'Debugging' | 'Backtesting' | 'Archived'; // Added 'Archived'
  pnl: number; // Consider fetching PnL dynamically or storing recent PnL
  winRate: number; // Similarly, fetch/calculate win rate
  // Add other relevant fields: parameters, associated agent ID, creation date, source (AI-gen/Uploaded), filename etc.
  source?: 'AI-Generated' | 'Uploaded';
  fileName?: string; // Store original filename if uploaded
}

// API base URL - use /api prefix to rely on Next.js rewrites

// API base URL - use /api prefix to rely on Next.js rewrites
const API_BASE_URL = '/api';

// Helper function to handle errors
function handleError(error: any): never {
  console.error('API Error:', error);
  throw error;
}

// Helper function to convert backend strategy format to frontend format
function convertBackendStrategy(backendStrategy: any): Strategy {
  return {
    id: `strat-${backendStrategy.id}`, // Convert numeric ID to string format with prefix
    name: backendStrategy.name,
    description: backendStrategy.description,
    status: backendStrategy.status as Strategy['status'],
    pnl: backendStrategy.pnl || 0,
    winRate: backendStrategy.win_rate || 0,
    source: backendStrategy.source as Strategy['source'],
    fileName: backendStrategy.file_name
  };
}

// Helper function to convert frontend strategy format to backend format
function convertFrontendStrategy(frontendStrategy: Partial<Strategy>): any {
  const backendStrategy: Record<string, any> = {
    name: frontendStrategy.name,
    description: frontendStrategy.description,
    status: frontendStrategy.status,
    source: frontendStrategy.source,
    file_name: frontendStrategy.fileName,
    pnl: frontendStrategy.pnl || 0,
    win_rate: frontendStrategy.winRate || 0
  };

  // If ID is provided, extract the numeric part
  if (frontendStrategy.id) {
    const idMatch = frontendStrategy.id.match(/strat-(\d+)/);
    if (idMatch && idMatch[1]) {
      backendStrategy.id = parseInt(idMatch[1], 10);
    }
  }

  return backendStrategy;
}


/**
 * Fetches all strategies from the backend.
 * @param includeArchived Whether to include archived strategies. Defaults to false.
 * @returns A promise that resolves to an array of Strategy objects.
 */
export async function getStrategies(includeArchived: boolean = false): Promise<Strategy[]> {
  console.log(`Fetching strategies (includeArchived: ${includeArchived})...`);
  
  try {
    // Fetch strategies from the file-based API
    const response = await fetch(`${API_BASE_URL}/file-strategies?include_archived=${includeArchived}`);
    
    if (!response.ok) {
      console.error(`Error fetching strategies: ${response.statusText}`);
      // Return empty array instead of throwing error
      return [];
    }
    
    const backendStrategies = await response.json();
    
    // Handle empty response
    if (!backendStrategies || !Array.isArray(backendStrategies)) {
      console.warn("Received invalid strategies data from backend");
      return [];
    }
    
    // Convert backend format to frontend format
    const strategies = backendStrategies.map((backendStrategy: any) => {
      return {
        id: backendStrategy.id || `strat-unknown-${Math.random().toString(36).substring(2, 9)}`, // Fallback ID if missing
        name: backendStrategy.name || "Unnamed Strategy",
        description: backendStrategy.description || "No description available",
        status: (backendStrategy.status as Strategy['status']) || "Active",
        pnl: backendStrategy.pnl || 0,
        winRate: backendStrategy.win_rate || 0,
        source: (backendStrategy.source as Strategy['source']) || "Uploaded",
        fileName: backendStrategy.file_name || ""
      };
    });
    
    console.log("Fetched strategies:", strategies.length);
    return strategies;
  } catch (error) {
    console.error("Failed to fetch strategies:", error);
    // Return empty array instead of throwing error
    return [];
  }
}

/**
 * Fetches a single strategy by ID.
 * @param strategyId The ID of the strategy to fetch.
 * @returns A promise that resolves to the Strategy object or null if not found.
 */
export async function getStrategyById(strategyId: string): Promise<Strategy | null> {
  console.log(`Fetching strategy by ID: ${strategyId}`);
  
  try {
    // Fetch strategy from the file-based API
    const response = await fetch(`${API_BASE_URL}/file-strategies/${strategyId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Strategy ${strategyId} not found.`);
        return null;
      }
      throw new Error(`Error fetching strategy: ${response.statusText}`);
    }
    
    const backendStrategy = await response.json();
    
    // Convert backend format to frontend format
    const strategy: Strategy = {
      id: backendStrategy.id,
      name: backendStrategy.name,
      description: backendStrategy.description,
      status: backendStrategy.status as Strategy['status'],
      pnl: backendStrategy.pnl || 0,
      winRate: backendStrategy.win_rate || 0,
      source: backendStrategy.source as Strategy['source'],
      fileName: backendStrategy.file_name
    };
    
    console.log(`Found strategy: ${strategy.name}`);
    return strategy;
  } catch (error) {
    console.error(`Failed to fetch strategy ${strategyId}:`, error);
    throw error;
  }
}

/**
 * Fetches the code content for a given strategy ID.
 * In a real system, this would involve fetching the file content from storage
 * based on the strategy's fileName or database record.
 * @param strategyId The ID of the strategy.
 * @returns A promise resolving to the code string, or null if not found/applicable.
 */
export async function getStrategyCode(strategyId: string): Promise<string | null> {
  console.log(`Fetching code for strategy ID: ${strategyId}`);
  
  try {
    // Fetch strategy code from the file-based API
    const response = await fetch(`${API_BASE_URL}/file-strategies/${strategyId}/code`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Code for strategy ${strategyId} not found.`);
        return null;
      }
      throw new Error(`Error fetching strategy code: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.code;
  } catch (error) {
    console.error(`Failed to fetch code for strategy ${strategyId}:`, error);
    throw error;
  }
}

/**
 * Saves code for a strategy.
 * @param strategyId The ID of the strategy.
 * @param code The code to save.
 * @returns A promise that resolves to true if successful.
 */
export async function saveStrategyCode(strategyId: string, code: string): Promise<boolean> {
  console.log(`Saving code for strategy ID: ${strategyId}`);
  
  try {
    // Extract the numeric ID from the string ID
    const idMatch = strategyId.match(/strat-(\d+)/);
    if (!idMatch || !idMatch[1]) {
      console.error(`Invalid strategy ID format: ${strategyId}`);
      return false;
    }
    
    const numericId = idMatch[1];
    
    // Save strategy code to the API
    const response = await fetch(`${API_BASE_URL}/strategies/${numericId}/code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      throw new Error(`Error saving strategy code: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to save code for strategy ${strategyId}:`, error);
    throw error;
  }
}

/**
 * Updates a strategy.
 * @param strategyId The ID of the strategy to update.
 * @param updates The updates to apply to the strategy.
 * @returns A promise that resolves to the updated Strategy object.
 */
export async function updateStrategy(strategyId: string, updates: Partial<Strategy>): Promise<Strategy> {
  console.log(`Updating strategy ID: ${strategyId}`, updates);
  
  try {
    // Extract the numeric ID from the string ID
    const idMatch = strategyId.match(/strat-(\d+)/);
    if (!idMatch || !idMatch[1]) {
      throw new Error(`Invalid strategy ID format: ${strategyId}`);
    }
    
    const numericId = idMatch[1];
    
    // Convert frontend format to backend format
    const backendUpdates = convertFrontendStrategy(updates);
    
    // Update strategy via the API
    const response = await fetch(`${API_BASE_URL}/strategies/${numericId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendUpdates),
    });
    
    if (!response.ok) {
      throw new Error(`Error updating strategy: ${response.statusText}`);
    }
    
    const backendStrategy = await response.json();
    
    // Convert backend format to frontend format
    return convertBackendStrategy(backendStrategy);
  } catch (error) {
    console.error(`Failed to update strategy ${strategyId}:`, error);
    throw error;
  }
}

/**
 * Archives a strategy.
 * @param strategyId The ID of the strategy to archive.
 * @returns A promise that resolves to the archived Strategy object.
 */
export async function archiveStrategy(strategyId: string): Promise<Strategy> {
  console.log(`Archiving strategy ID: ${strategyId}`);
  
  // Use updateStrategy to set status to 'Archived'
  return updateStrategy(strategyId, { status: 'Archived' });
}

/**
 * Permanently deletes a strategy.
 * @param strategyId The ID of the strategy to delete.
 * @returns A promise that resolves to true if successful.
 */
export async function deleteStrategyPermanently(strategyId: string): Promise<boolean> {
  console.log(`Deleting strategy ID: ${strategyId}`);
  
  try {
    // Extract the numeric ID from the string ID
    const idMatch = strategyId.match(/strat-(\d+)/);
    if (!idMatch || !idMatch[1]) {
      throw new Error(`Invalid strategy ID format: ${strategyId}`);
    }
    
    const numericId = idMatch[1];
    
    // Delete strategy via the API
    const response = await fetch(`${API_BASE_URL}/strategies/${numericId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting strategy: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to delete strategy ${strategyId}:`, error);
    throw error;
  }
}

/**
 * Creates a new strategy with a file.
 * @param strategy The strategy data.
 * @param file The strategy file.
 * @returns A promise that resolves to the created Strategy object.
 */
export async function addStrategyWithFile(strategy: Partial<Strategy>, file?: File): Promise<Strategy> {
  console.log(`Creating new strategy:`, strategy);
  
  try {
    // Convert frontend format to backend format
    const backendStrategy = convertFrontendStrategy(strategy);
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('strategy_in', JSON.stringify(backendStrategy));
    
    if (file) {
      formData.append('strategy_file', file);
    }
    
    // Create strategy via the API
    const response = await fetch(`${API_BASE_URL}/strategies/`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Error creating strategy: ${response.statusText}`);
    }
    
    const createdStrategy = await response.json();
    
    // Convert backend format to frontend format
    return convertBackendStrategy(createdStrategy);
  } catch (error) {
    console.error('Failed to create strategy:', error);
    throw error;
  }
}

/**
 * Suggests a strategy configuration based on user inputs.
 * @param input The input parameters for the suggestion.
 * @returns A promise that resolves to the suggested configuration.
 */
export async function suggestStrategyConfig(input: any): Promise<any> {
  console.log(`Suggesting strategy config:`, input);
  
  try {
    // Use the imported flow function
    return await suggestStrategyConfigFlow(input);
  } catch (error) {
    console.error('Failed to suggest strategy config:', error);
    throw error;
  }
}

/**
 * Generates and tests a strategy from a suggestion.
 * @param suggestion The strategy suggestion.
 * @returns A promise that resolves to the created Strategy object.
 */
export async function generateAndTestStrategyFromSuggestion(suggestion: any): Promise<Strategy> {
  console.log(`Generating strategy from suggestion:`, suggestion);
  
  try {
    // Create a new strategy with the suggested configuration
    const response = await fetch(`${API_BASE_URL}/strategies/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(suggestion),
    });
    
    if (!response.ok) {
      throw new Error(`Error generating strategy: ${response.statusText}`);
    }
    
    const generatedStrategy = await response.json();
    
    // Convert backend format to frontend format
    return convertBackendStrategy(generatedStrategy);
  } catch (error) {
    console.error('Failed to generate strategy:', error);
    throw error;
  }
}

/**
 * Schedules automated strategy generation.
 * @param scheduleType The type of schedule (startup, daily, weekly).
 * @param config The configuration for the generation.
 * @returns A promise that resolves to true if successful.
 */
export async function scheduleStrategyGeneration(scheduleType: string, config: any): Promise<boolean> {
  console.log(`Scheduling strategy generation (${scheduleType}):`, config);
  
  try {
    // Schedule strategy generation via the API
    const response = await fetch(`${API_BASE_URL}/strategies/schedule-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schedule_type: scheduleType,
        generation_config: config,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error scheduling strategy generation: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to schedule strategy generation:', error);
    throw error;
  }
}
