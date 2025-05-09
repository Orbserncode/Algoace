// src/services/agents-service.ts

/**
 * @fileOverview Service functions for fetching agent data.
 * This service connects to the backend API to fetch and manage agents.
 * The backend is built with FastAPI and uses SQLModel to interact with a SQLite database.
 */

import { z } from 'zod';
import type { BrokerConfig } from './settings-service'; // Import for broker types

// --- Available Tools (Mock) ---
// In a Pydantic-AI setup, these might be classes with `run` methods.
// For UI, we just need their names and descriptions.
export const availableTools = [
    { name: 'MarketDataFetcher', description: 'Fetches historical and real-time market data for specified assets.' },
    { name: 'TechnicalIndicatorCalculator', description: 'Calculates various technical indicators (e.g., RSI, MACD, SMA).' },
    { name: 'WebSearcher', description: 'Performs web searches for news, analysis, or other relevant information (uses SerpAPI if configured).' },
    { name: 'PortfolioManager', description: 'Accesses current portfolio state, positions, and P&L.' },
    { name: 'OrderExecutor', description: 'Places, modifies, or cancels trades via a configured broker.' },
    { name: 'Backtester', description: 'Runs backtests on strategy code with specified parameters.'},
] as const;
export type ToolName = typeof availableTools[number]['name'];


// --- Agent Configuration Schemas (Zod Examples) ---
export const BaseAgentConfigSchema = z.object({
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info').describe("Logging verbosity for the agent."),
  enabledTools: z.array(z.custom<ToolName>((val) => availableTools.some(tool => tool.name === val)))
    .optional()
    .default([])
    .describe("Tools this agent can use."),
  llmModelProviderId: z.string().default('groq').describe("LLM provider ID (e.g., 'openai', 'anthropic', 'groq')"),
  llmModelName: z.string().optional().describe("Specific model name (e.g., 'gpt-4', 'claude-3-opus')"),
});
export type BaseAgentConfig = z.infer<typeof BaseAgentConfigSchema>;

// Strategy Coding Agent Config
export const StrategyCodingAgentConfigSchema = BaseAgentConfigSchema.extend({
  strategyFramework: z.string().default('lumibot').describe("Framework to use for strategy code generation"),
  defaultTimeframe: z.string().default('1D').describe("Default trading timeframe"),
  defaultAssetClass: z.string().default('stock').describe("Default asset class"),
  codingPrompt: z.string().optional().describe("Custom prompt for strategy generation"),
});
export type StrategyCodingAgentConfig = z.infer<typeof StrategyCodingAgentConfigSchema>;

// Execution Agent Config
export const ExecutionAgentConfigSchema = BaseAgentConfigSchema.extend({
  brokerConfigId: z.string().describe("ID of the broker configuration to use"),
  maxConcurrentTrades: z.number().default(5).describe("Maximum number of concurrent trades"),
  orderRetryAttempts: z.number().default(3).describe("Number of retry attempts for failed orders"),
  executionLogicPrompt: z.string().optional().describe("Custom prompt for execution logic"),
  requiresAllAgentConfirmation: z.boolean().default(false).describe("Whether all agents must confirm trades"),
});
export type ExecutionAgentConfig = z.infer<typeof ExecutionAgentConfigSchema>;

// Data Agent Config
export const DataAgentConfigSchema = BaseAgentConfigSchema.extend({
  watchedAssets: z.array(z.object({
    brokerId: z.string(),
    symbol: z.string(),
  })).min(1).describe("Assets to watch for data collection"),
  dataCollectionFrequency: z.string().default('1h').describe("How often to collect data"),
});
export type DataAgentConfig = z.infer<typeof DataAgentConfigSchema>;

// Analysis Agent Config
export const AnalysisAgentConfigSchema = BaseAgentConfigSchema.extend({
  analysisFrequency: z.string().default('1d').describe("How often to run analysis"),
  analysisPrompt: z.string().optional().describe("Custom prompt for analysis"),
});
export type AnalysisAgentConfig = z.infer<typeof AnalysisAgentConfigSchema>;

// Union type for all agent configs
export type AgentConfig = BaseAgentConfig | StrategyCodingAgentConfig | ExecutionAgentConfig | DataAgentConfig | AnalysisAgentConfig;

// Agent interface
export interface Agent {
  id: string;
  name: string;
  type: 'Strategy Coding Agent' | 'Research & News Agent' | 'Portfolio Analyst Agent' | 'Risk Manager Agent' | 'Execution Agent' | 'Data Agent' | 'Analysis Agent';
  status: 'Idle' | 'Running' | 'Stopped' | 'Error';
  description: string;
  tasksCompleted: number;
  errors: number;
  isDefault: boolean;
  associatedStrategyIds?: string[];
}

// Agent with config
export interface AgentWithConfig extends Agent {
  config: AgentConfig;
}

// API base URL - use /api prefix to rely on Next.js rewrites
const API_BASE_URL = '/api';

// Helper function to handle errors
function handleError(error: any): never {
  console.error('API Error:', error);
  throw error;
}

// Helper function to convert backend agent format to frontend format
function convertBackendAgent(backendAgent: any): Agent {
  return {
    id: `agent-${backendAgent.id}`, // Convert numeric ID to string format with prefix
    name: backendAgent.name,
    type: backendAgent.type,
    status: backendAgent.status,
    description: backendAgent.description,
    tasksCompleted: backendAgent.tasksCompleted,
    errors: backendAgent.errors,
    isDefault: backendAgent.isDefault,
    associatedStrategyIds: backendAgent.associatedStrategyIds
  };
}

// Helper function to convert frontend agent format to backend format
function convertFrontendAgent(frontendAgent: Partial<Agent>): any {
  const backendAgent: Record<string, any> = {
    name: frontendAgent.name,
    type: frontendAgent.type,
    status: frontendAgent.status,
    description: frontendAgent.description,
    tasksCompleted: frontendAgent.tasksCompleted,
    errors: frontendAgent.errors,
    isDefault: frontendAgent.isDefault,
    associatedStrategyIds: frontendAgent.associatedStrategyIds
  };

  // If ID is provided, extract the numeric part
  if (frontendAgent.id) {
    const idMatch = frontendAgent.id.match(/agent-(\d+)/);
    if (idMatch && idMatch[1]) {
      backendAgent.id = parseInt(idMatch[1], 10);
    }
  }

  return backendAgent;
}

// Simulate potential API/DB errors
const simulateError = (probability = 0.01) => { // Reduced error probability
    if (Math.random() < probability) {
        throw new Error("Simulated service error.");
    }
}

/**
 * Fetches all agents from the backend.
 * @returns A promise that resolves to an array of Agent objects.
 */
export async function getAgents(): Promise<Agent[]> {
  console.log("Fetching agents...");
  
  try {
    // Fetch agents from the file-based API endpoint
    const response = await fetch(`${API_BASE_URL}/file-agents`);
    
    if (!response.ok) {
      throw new Error(`Error fetching agents: ${response.statusText}`);
    }
    
    const backendAgents = await response.json();
    
    // Convert backend format to frontend format
    const agents = backendAgents.map((backendAgent: any) => {
      return {
        id: backendAgent.id, // Already in the right format
        name: backendAgent.name,
        type: backendAgent.type,
        status: backendAgent.status,
        description: backendAgent.description,
        tasksCompleted: backendAgent.tasksCompleted,
        errors: backendAgent.errors,
        isDefault: backendAgent.isDefault,
        associatedStrategyIds: backendAgent.associatedStrategyIds
      };
    });
    
    console.log("Fetched agents:", agents.length);
    return agents;
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    // Throw the error instead of returning an empty array
    // This allows the frontend to catch it and display an error message
    throw error;
  }
}

/**
 * Fetches a single agent by ID.
 * @param agentId The ID of the agent to fetch.
 * @returns A promise that resolves to the Agent object or null if not found.
 */
export async function getAgentById(agentId: string): Promise<Agent | null> {
  console.log(`Fetching agent by ID: ${agentId}`);
  
  try {
    // Fetch agent from the file-based API
    const response = await fetch(`${API_BASE_URL}/file-agents/${agentId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Agent ${agentId} not found.`);
        return null;
      }
      throw new Error(`Error fetching agent: ${response.statusText}`);
    }
    
    const backendAgent = await response.json();
    
    // Convert backend format to frontend format
    const agent: Agent = {
      id: backendAgent.id,
      name: backendAgent.name,
      type: backendAgent.type,
      status: backendAgent.status,
      description: backendAgent.description,
      tasksCompleted: backendAgent.tasksCompleted,
      errors: backendAgent.errors,
      isDefault: backendAgent.isDefault,
      associatedStrategyIds: backendAgent.associatedStrategyIds
    };
    
    console.log(`Found agent: ${agent.name}`);
    return agent;
  } catch (error) {
    console.error(`Failed to fetch agent ${agentId}:`, error);
    return null;
  }
}

/**
 * Fetches an agent with its configuration.
 * @param agentId The ID of the agent to fetch.
 * @returns A promise that resolves to the AgentWithConfig object or null if not found.
 */
export async function getAgentWithConfig(agentId: string): Promise<AgentWithConfig | null> {
  console.log(`Fetching agent with config by ID: ${agentId}`);
  
  try {
    // First, get the agent
    const agent = await getAgentById(agentId);
    if (!agent) {
      return null;
    }
    
    // Then, get the agent's config
    const config = await getAgentConfig(agentId);
    if (!config) {
      return null;
    }
    
    // Combine the agent and config
    const agentWithConfig: AgentWithConfig = {
      ...agent,
      config
    };
    
    return agentWithConfig;
  } catch (error) {
    console.error(`Failed to fetch agent with config ${agentId}:`, error);
    return null;
  }
}

/**
 * Fetches the configuration for an agent.
 * @param agentId The ID of the agent.
 * @returns A promise that resolves to the AgentConfig object or null if not found.
 */
export async function getAgentConfig(agentId: string): Promise<AgentConfig | null> {
  console.log(`Fetching config for agent ID: ${agentId}`);
  
  try {
    // Fetch agent config from the file-based API
    const response = await fetch(`${API_BASE_URL}/file-agents/${agentId}/config`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Config for agent ${agentId} not found.`);
        return null;
      }
      throw new Error(`Error fetching agent config: ${response.statusText}`);
    }
    
    const config = await response.json();
    
    return config;
  } catch (error) {
    console.error(`Failed to fetch config for agent ${agentId}:`, error);
    
    // Return a default config based on the agent type
    const agent = await getAgentById(agentId);
    if (!agent) {
      return null;
    }
    
    let defaultConfig: AgentConfig;
    switch (agent.type) {
      case 'Strategy Coding Agent':
        defaultConfig = StrategyCodingAgentConfigSchema.parse({});
        break;
      case 'Execution Agent':
        defaultConfig = ExecutionAgentConfigSchema.parse({brokerConfigId: ""});
        break;
      case 'Data Agent':
        defaultConfig = DataAgentConfigSchema.parse({watchedAssets: [{brokerId: "default-broker", symbol: "DEFAULT"}]});
        break;
      case 'Analysis Agent':
        defaultConfig = AnalysisAgentConfigSchema.parse({});
        break;
      default:
        defaultConfig = BaseAgentConfigSchema.parse({});
    }
    
    return defaultConfig;
  }
}

/**
 * Updates the configuration for an agent.
 * @param agentId The ID of the agent.
 * @param config The new configuration.
 * @returns A promise that resolves to the updated AgentConfig object or null if not found.
 */
export async function updateAgentConfig(agentId: string, config: AgentConfig): Promise<AgentConfig | null> {
  console.log(`Updating config for agent ID: ${agentId}`);
  
  try {
    // Extract the numeric ID from the string ID
    const idMatch = agentId.match(/agent-(\d+)/);
    if (!idMatch || !idMatch[1]) {
      console.error(`Invalid agent ID format: ${agentId}`);
      return null;
    }
    
    const numericId = idMatch[1];
    
    // Send the config to the API
    const response = await fetch(`${API_BASE_URL}/agents/${numericId}/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Agent ${agentId} not found for config update.`);
        return null;
      }
      throw new Error(`Error updating agent config: ${response.statusText}`);
    }
    
    const updatedConfig = await response.json();
    
    return updatedConfig;
  } catch (error) {
    console.error(`Failed to update config for agent ${agentId}:`, error);
    return null;
  }
}

/**
 * Creates a new agent.
 * @param agent The agent to create.
 * @param config The configuration for the agent.
 * @returns A promise that resolves to the created AgentWithConfig object or null if creation failed.
 */
export async function createAgent(agent: Omit<Agent, 'id' | 'tasksCompleted' | 'errors'>, config: AgentConfig): Promise<AgentWithConfig | null> {
  console.log(`Creating new agent: ${agent.name}`);
  
  try {
    // Convert frontend format to backend format
    const backendAgent = {
      name: agent.name,
      type: agent.type,
      status: agent.status || 'Idle',
      description: agent.description,
      isDefault: agent.isDefault || false,
      associatedStrategyIds: agent.associatedStrategyIds || [],
      config
    };
    
    // Send the agent to the API
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendAgent)
    });
    
    if (!response.ok) {
      throw new Error(`Error creating agent: ${response.statusText}`);
    }
    
    const createdAgent = await response.json();
    
    // Convert backend format to frontend format
    const frontendAgent = convertBackendAgent(createdAgent);
    
    // Return the agent with config
    const agentWithConfig: AgentWithConfig = {
      ...frontendAgent,
      config
    };
    
    console.log(`Created new agent: ${agentWithConfig.id} - ${agentWithConfig.name}`);
    return agentWithConfig;
  } catch (error) {
    console.error(`Failed to create agent:`, error);
    return null;
  }
}

/**
 * Updates an existing agent.
 * @param agentId The ID of the agent to update.
 * @param updates The updates to apply to the agent.
 * @returns A promise that resolves to the updated Agent object or null if not found.
 */
export async function updateAgent(agentId: string, updates: Partial<Omit<Agent, 'id'>>): Promise<Agent | null> {
  console.log(`Updating agent ${agentId} with:`, updates);
  
  try {
    // Extract the numeric ID from the string ID
    const idMatch = agentId.match(/agent-(\d+)/);
    if (!idMatch || !idMatch[1]) {
      console.error(`Invalid agent ID format: ${agentId}`);
      return null;
    }
    
    const numericId = idMatch[1];
    
    // Convert frontend format to backend format
    const backendUpdates = convertFrontendAgent(updates);
    
    // Remove undefined values
    Object.keys(backendUpdates).forEach(key => {
      if (backendUpdates[key] === undefined) {
        delete backendUpdates[key];
      }
    });
    
    // Send the updates to the API
    const response = await fetch(`${API_BASE_URL}/agents/${numericId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendUpdates)
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Agent ${agentId} not found for update.`);
        return null;
      }
      throw new Error(`Error updating agent: ${response.statusText}`);
    }
    
    const updatedAgent = await response.json();
    
    // Convert backend format to frontend format
    const agent = convertBackendAgent(updatedAgent);
    
    console.log(`Updated agent ${agentId}:`, agent);
    return agent;
  } catch (error) {
    console.error(`Failed to update agent ${agentId}:`, error);
    return null;
  }
}

/**
 * Deletes an agent.
 * @param agentId The ID of the agent to delete.
 * @returns A promise that resolves to true if deleted, false otherwise.
 */
export async function deleteAgent(agentId: string): Promise<boolean> {
  console.log(`Deleting agent ${agentId}`);
  
  try {
    // Extract the numeric ID from the string ID
    const idMatch = agentId.match(/agent-(\d+)/);
    if (!idMatch || !idMatch[1]) {
      console.error(`Invalid agent ID format: ${agentId}`);
      return false;
    }
    
    const numericId = idMatch[1];
    
    // Send the delete request to the API
    const response = await fetch(`${API_BASE_URL}/agents/${numericId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Agent ${agentId} not found for deletion.`);
        return false;
      }
      throw new Error(`Error deleting agent: ${response.statusText}`);
    }
    
    console.log(`Successfully deleted agent ${agentId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete agent ${agentId}:`, error);
    return false;
  }
}

/**
 * Starts an agent.
 * @param agentId The ID of the agent to start.
 * @returns A promise that resolves to the updated Agent object or null if not found.
 */
export async function startAgent(agentId: string): Promise<Agent | null> {
  console.log(`Starting agent ${agentId}`);
  
  // Update the agent's status to 'Running'
  return updateAgent(agentId, { status: 'Running' });
}

/**
 * Stops an agent.
 * @param agentId The ID of the agent to stop.
 * @returns A promise that resolves to the updated Agent object or null if not found.
 */
export async function stopAgent(agentId: string): Promise<Agent | null> {
  console.log(`Stopping agent ${agentId}`);
  
  // Update the agent's status to 'Stopped'
  return updateAgent(agentId, { status: 'Stopped' });
}

/**
 * Resets an agent's error state.
 * @param agentId The ID of the agent to reset.
 * @returns A promise that resolves to the updated Agent object or null if not found.
 */
export async function resetAgentError(agentId: string): Promise<Agent | null> {
  console.log(`Resetting error state for agent ${agentId}`);
  
  // Update the agent's status to 'Idle' and reset errors
  return updateAgent(agentId, { status: 'Idle', errors: 0 });
}