// src/services/agents-service.ts

/**
 * @fileOverview Service functions for fetching agent data.
 * Replace mock implementations with actual data fetching logic (e.g., from a database or API).
 */

import { z } from 'zod';

// --- Agent Configuration Schemas (Zod Examples) ---
// These schemas represent the configurable parameters for different agent types.
// In a real app, these might be more complex and potentially dynamic.

export const BaseAgentConfigSchema = z.object({
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const StrategyCodingAgentConfigSchema = BaseAgentConfigSchema.extend({
  llmModel: z.string().default('googleai/gemini-2.0-flash').describe("LLM model to use for code generation"),
  backtestEngine: z.enum(['lumibot', 'vectorbt']).default('lumibot'),
  generationPrompt: z.string().min(50).default(
    `You are an expert quantitative trading strategy developer specializing in Python and the Lumibot framework.
Generate a new trading strategy based on the provided market conditions, risk tolerance, and historical data context.
The strategy should be encapsulated in a Python class inheriting from lumibot.strategies.Strategy.
Include clear comments explaining the logic, parameters, entry/exit conditions, and risk management.
Optimize for the specified risk tolerance: {riskTolerance}.
Current Market Conditions: {marketConditions}.
Historical Context: {historicalData}`
  ).describe("System prompt for the strategy generation LLM"),
  codingRetryAttempts: z.number().int().min(0).max(5).default(2),
});
export type StrategyCodingAgentConfig = z.infer<typeof StrategyCodingAgentConfigSchema>;

export const ExecutionAgentConfigSchema = BaseAgentConfigSchema.extend({
  broker: z.string().default('alpaca').describe("Broker identifier to use for execution"),
  maxConcurrentTrades: z.number().int().min(1).max(10).default(5),
  orderRetryAttempts: z.number().int().min(0).max(10).default(3),
  executionLogicPrompt: z.string().optional().describe("Optional prompt to guide execution adjustments (e.g., scaling orders)"),
});
export type ExecutionAgentConfig = z.infer<typeof ExecutionAgentConfigSchema>;

export const DataAgentConfigSchema = BaseAgentConfigSchema.extend({
  dataProvider: z.enum(['yahoo', 'alpaca', 'broker']).default('yahoo'),
  fetchFrequencyMinutes: z.number().int().min(1).max(60).default(5),
  watchedAssets: z.array(z.string()).default(['AAPL', 'MSFT', 'BTC/USD']),
});
export type DataAgentConfig = z.infer<typeof DataAgentConfigSchema>;

export const AnalysisAgentConfigSchema = BaseAgentConfigSchema.extend({
  analysisPrompt: z.string().default(
    `Analyze the portfolio's current performance, risk exposure, and recent trades.
Identify potential issues like high drawdown, concentration risk, or strategy underperformance.
Portfolio Metrics: {metrics}
Recent Trades: {trades}`
  ).describe("Prompt for the analysis LLM"),
  llmModel: z.string().default('googleai/gemini-2.0-flash').describe("LLM model for analysis"),
});
export type AnalysisAgentConfig = z.infer<typeof AnalysisAgentConfigSchema>;

// Union type for agent configs
export type AgentConfig = StrategyCodingAgentConfig | ExecutionAgentConfig | DataAgentConfig | AnalysisAgentConfig;


// --- Agent Type ---
export interface Agent {
  id: string;
  name: string;
  type: 'Strategy Coding Agent' | 'Execution Agent' | 'Data Agent' | 'Analysis Agent';
  status: 'Running' | 'Idle' | 'Error' | 'Stopped';
  description: string;
  tasksCompleted: number;
  errors: number;
  isDefault: boolean; // Flag to prevent deletion of core agents
  // Configuration might be fetched separately or included here
  config?: AgentConfig; // Optional: Include config directly or fetch separately
  // Association with strategies (for execution agents)
  associatedStrategyIds?: string[];
}

// --- Mock Data ---
// Replace with actual data source
const mockAgents: Agent[] = [
  {
    id: 'agent-gen-default', name: 'Strategy Generator', type: 'Strategy Coding Agent', status: 'Running', description: 'Automatically codes, debugs, and backtests new strategies.', tasksCompleted: 15, errors: 1, isDefault: true,
    config: { logLevel: 'info', llmModel: 'googleai/gemini-2.0-flash', backtestEngine: 'lumibot', generationPrompt: StrategyCodingAgentConfigSchema.shape.generationPrompt.default, codingRetryAttempts: 2 } as StrategyCodingAgentConfig,
  },
  {
    id: 'agent-exec-momentum', name: 'Execution Agent - Momentum', type: 'Execution Agent', status: 'Running', description: 'Executes trades for the Momentum Burst strategy.', tasksCompleted: 128, errors: 0, isDefault: false, associatedStrategyIds: ['strat-001'],
    config: { logLevel: 'info', broker: 'alpaca', maxConcurrentTrades: 5, orderRetryAttempts: 3 } as ExecutionAgentConfig,
  },
  {
    id: 'agent-data-main', name: 'Market Scanner', type: 'Data Agent', status: 'Running', description: 'Monitors market data for potential signals.', tasksCompleted: 1532, errors: 3, isDefault: true,
    config: { logLevel: 'warn', dataProvider: 'yahoo', fetchFrequencyMinutes: 5, watchedAssets: ['AAPL', 'MSFT', 'GOOGL', 'BTC/USD', 'EUR/USD'] } as DataAgentConfig,
  },
  {
    id: 'agent-exec-ai', name: 'Execution Agent - AI Trend', type: 'Execution Agent', status: 'Idle', description: 'Executes trades for the AI Trend Follower strategy.', tasksCompleted: 95, errors: 0, isDefault: false, associatedStrategyIds: ['strat-003'],
    config: { logLevel: 'info', broker: 'alpaca', maxConcurrentTrades: 3, orderRetryAttempts: 5 } as ExecutionAgentConfig,
  },
  {
    id: 'agent-risk-default', name: 'Risk Management Agent', type: 'Analysis Agent', status: 'Running', description: 'Monitors overall portfolio risk.', tasksCompleted: 45, errors: 0, isDefault: true,
    config: { logLevel: 'info', analysisPrompt: AnalysisAgentConfigSchema.shape.analysisPrompt.default, llmModel: 'googleai/gemini-2.0-flash' } as AnalysisAgentConfig,
  },
];

// In-memory store for mock configs (separate for demonstration)
let mockAgentConfigs: Record<string, AgentConfig> = {
    'agent-gen-default': StrategyCodingAgentConfigSchema.parse({}), // Use default values
    'agent-exec-momentum': ExecutionAgentConfigSchema.parse({}),
    'agent-data-main': DataAgentConfigSchema.parse({ watchedAssets: ['AAPL', 'MSFT', 'GOOGL', 'BTC/USD', 'EUR/USD'], logLevel: 'warn'}),
    'agent-exec-ai': ExecutionAgentConfigSchema.parse({ maxConcurrentTrades: 3, orderRetryAttempts: 5 }),
    'agent-risk-default': AnalysisAgentConfigSchema.parse({}),
};


// --- Service Functions ---

/**
 * Fetches the list of agents.
 * TODO: Replace with actual data fetching logic.
 * @returns A promise that resolves to an array of Agent objects.
 */
export async function getAgents(): Promise<Agent[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real application, fetch this data from your backend/database
  // Add config details from the mock store for the simulation
   const agentsWithConfig = mockAgents.map(agent => ({
       ...agent,
       config: mockAgentConfigs[agent.id] || undefined // Add config if found
   }));
  return agentsWithConfig;
}

/**
 * Fetches a single agent by ID, including its configuration.
 * TODO: Replace with actual data fetching logic.
 * @param agentId The ID of the agent to fetch.
 * @returns A promise that resolves to the Agent object or null if not found.
 */
export async function getAgentById(agentId: string): Promise<Agent | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) return null;
     // Add config details from the mock store
     const agentWithConfig = {
         ...agent,
         config: mockAgentConfigs[agent.id] || undefined
     };
    return agentWithConfig;
}

/**
 * Fetches the configuration for a specific agent.
 * TODO: Replace with actual data fetching logic.
 * @param agentId The ID of the agent.
 * @returns A promise resolving to the agent's configuration object or null.
 */
export async function getAgentConfig(agentId: string): Promise<AgentConfig | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return mockAgentConfigs[agentId] || null;
}

/**
 * Updates the configuration for a specific agent.
 * TODO: Replace with actual data persistence logic.
 * @param agentId The ID of the agent to update.
 * @param config The new configuration object.
 * @returns A promise resolving to the updated configuration or null if agent not found.
 */
export async function updateAgentConfig(agentId: string, config: AgentConfig): Promise<AgentConfig | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
     if (!mockAgentConfigs[agentId]) {
        console.warn(`Agent ${agentId} not found for config update.`);
        return null;
     }

     // Add backend logic here: validate config against schema based on agent type, save to DB/config file.
     console.log(`SERVICE: Updating config for agent ${agentId}`, config);

    mockAgentConfigs[agentId] = config; // Update mock store
    return config;
}


/**
 * Activates an agent (sets status to Running or Idle based on type).
 * TODO: Implement actual backend logic to start the agent process/task.
 * @param agentId The ID of the agent to activate.
 * @returns Promise resolving to the updated Agent object or null.
 */
export async function activateAgent(agentId: string): Promise<Agent | null> {
     console.log(`SERVICE: Activating agent ${agentId}`);
     await new Promise(resolve => setTimeout(resolve, 400));
     const index = mockAgents.findIndex(a => a.id === agentId);
     if (index === -1) return null;

     // Determine appropriate active status (Running or Idle)
     const newStatus = (mockAgents[index].type === 'Execution Agent' || mockAgents[index].type === 'Strategy Coding Agent')
         ? 'Idle' // These might wait for triggers
         : 'Running'; // Data/Analysis agents often run continuously

     mockAgents[index].status = newStatus;
     // Add backend logic to actually start the agent process/service/task
     return { ...mockAgents[index], config: mockAgentConfigs[agentId] };
}

/**
 * Deactivates an agent (sets status to Stopped).
 * TODO: Implement actual backend logic to stop the agent process/task.
 * @param agentId The ID of the agent to deactivate.
 * @returns Promise resolving to the updated Agent object or null.
 */
export async function deactivateAgent(agentId: string): Promise<Agent | null> {
     console.log(`SERVICE: Deactivating agent ${agentId}`);
     await new Promise(resolve => setTimeout(resolve, 400));
     const index = mockAgents.findIndex(a => a.id === agentId);
     if (index === -1) return null;

     mockAgents[index].status = 'Stopped';
     // Add backend logic to actually stop the agent process/service/task
     return { ...mockAgents[index], config: mockAgentConfigs[agentId] };
}

/**
 * Adds a new agent (usually not done manually for default agents).
 * Primarily for potentially adding new Execution Agents linked to strategies.
 * TODO: Replace with actual data persistence logic.
 */
export async function addAgent(agentData: Omit<Agent, 'id' | 'tasksCompleted' | 'errors'>): Promise<Agent> {
    console.log(`SERVICE: Adding new agent ${agentData.name}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const newId = `agent-${agentData.type.split(' ')[0].toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const newAgent: Agent = {
        ...agentData,
        id: newId,
        tasksCompleted: 0,
        errors: 0,
        status: 'Stopped', // New agents start stopped
        isDefault: false, // Custom agents are not default
    };
    mockAgents.push(newAgent);
    // Also add default config for the new agent type
    let defaultConfig: AgentConfig;
     switch (newAgent.type) {
        case 'Strategy Coding Agent': defaultConfig = StrategyCodingAgentConfigSchema.parse({}); break;
        case 'Execution Agent': defaultConfig = ExecutionAgentConfigSchema.parse({}); break;
        case 'Data Agent': defaultConfig = DataAgentConfigSchema.parse({}); break;
        case 'Analysis Agent': defaultConfig = AnalysisAgentConfigSchema.parse({}); break;
        default: defaultConfig = BaseAgentConfigSchema.parse({});
     }
     mockAgentConfigs[newId] = defaultConfig;

    console.log(`SERVICE: Added agent ${newId}`);
    return newAgent;
}

/**
 * Deletes a non-default agent.
 * TODO: Replace with actual data deletion logic.
 * @param agentId The ID of the agent to delete.
 * @returns Promise resolving to true if deleted, false otherwise.
 */
export async function deleteAgent(agentId: string): Promise<boolean> {
     console.log(`SERVICE: Deleting agent ${agentId}`);
     await new Promise(resolve => setTimeout(resolve, 300));
     const index = mockAgents.findIndex(a => a.id === agentId);
     if (index === -1 || mockAgents[index].isDefault) {
         console.warn(`Agent ${agentId} not found or is a default agent.`);
         return false; // Not found or cannot delete default
     }
     mockAgents.splice(index, 1); // Remove from array
     delete mockAgentConfigs[agentId]; // Remove config
     // Add backend logic to delete from DB and potentially stop/remove any running process
     console.log(`SERVICE: Deleted agent ${agentId}`);
     return true;
}

    