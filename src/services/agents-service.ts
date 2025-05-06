// src/services/agents-service.ts

/**
 * @fileOverview Service functions for fetching agent data.
 * Replace mock implementations with actual data fetching logic (e.g., from a database or API).
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
    .describe("List of tools this agent is permitted to use."),
});

export const StrategyCodingAgentConfigSchema = BaseAgentConfigSchema.extend({
  llmModelProviderId: z.string().optional().describe("ID of the configured LLM provider to use."),
  llmModelName: z.string().optional().describe("Specific model name from the selected provider (e.g., gemini-2.0-flash, gpt-4-turbo)."),
  backtestEngine: z.enum(['lumibot', 'vectorbt', 'internal_mock']).default('lumibot').describe("Engine to use for backtesting generated strategies."),
  generationPrompt: z.string().min(50).default(
    `You are an expert quantitative trading strategy developer specializing in Python and the Lumibot framework.
Generate a new trading strategy based on the provided market conditions, risk tolerance, and historical data context.
The strategy should be encapsulated in a Python class inheriting from lumibot.strategies.Strategy.
Include clear comments explaining the logic, parameters, entry/exit conditions, and risk management.
Optimize for the specified risk tolerance: {riskTolerance}.
Current Market Conditions: {marketConditions}.
Historical Context: {historicalData}`
  ).describe("System prompt for the strategy generation LLM. Use placeholders like {riskTolerance}, {marketConditions}, {historicalData}."),
  codingRetryAttempts: z.number().int().min(0).max(5).default(2).describe("Number of attempts to generate and debug code if errors occur."),
});
export type StrategyCodingAgentConfig = z.infer<typeof StrategyCodingAgentConfigSchema>;

export const ExecutionAgentConfigSchema = BaseAgentConfigSchema.extend({
  brokerConfigId: z.string().min(1, "A configured broker is required.").describe("ID of the configured broker to use for execution."),
  llmModelProviderId: z.string().optional().describe("ID of the LLM provider for dynamic execution adjustments (optional)."),
  llmModelName: z.string().optional().describe("Specific model name for execution adjustments (optional)."),
  maxConcurrentTrades: z.number().int().min(1).max(20).default(5).describe("Maximum number of trades the agent can manage simultaneously."),
  orderRetryAttempts: z.number().int().min(0).max(10).default(3).describe("Number of times to retry placing an order if it fails."),
  executionLogicPrompt: z.string().optional().default(
    `You are an AI assistant for an automated trading Execution Agent.
Given the current market data, a proposed trade signal, and portfolio status, decide if the trade should proceed, be modified, or skipped.
Consider factors like: extreme volatility, news events, current portfolio exposure, and confidence of the signal.
Trade Signal: {tradeSignal}
Market Context: {marketContext}
Portfolio Status: {portfolioStatus}
Your decision (Proceed/Modify/Skip) and reasoning:`
  ).describe("Optional prompt for AI-assisted execution adjustments (e.g., dynamic order sizing, news impact). Use placeholders like {tradeSignal}, {marketContext}, {portfolioStatus}."),
  requiresAllAgentConfirmation: z.boolean().default(true).describe("Requires explicit confirmation from relevant analysis/risk agents before executing a trade."),
});
export type ExecutionAgentConfig = z.infer<typeof ExecutionAgentConfigSchema>;

export const DataAgentConfigSchema = BaseAgentConfigSchema.extend({
  dataProviderConfigId: z.string().optional().describe("ID of a specific data provider configuration (e.g., a specific broker or direct API)."),
  fetchFrequencyMinutes: z.number().int().min(1).max(1440).default(15).describe("How often to fetch new market data, in minutes."),
  watchedAssets: z.array(z.object({
      brokerId: z.string().min(1, "Broker ID is required for watched asset.").describe("ID of the broker providing this asset."),
      symbol: z.string().min(1, "Symbol is required for watched asset.").describe("Asset symbol (e.g., AAPL, BTC/USD).")
    }))
    .min(1, "At least one asset must be watched.")
    .default([{brokerId: "broker-alpaca-paper", symbol: "SPY"}]) // Provide a default valid asset
    .describe("List of assets to monitor, potentially from multiple brokers."),
  useSerpApiForNews: z.boolean().default(false).describe("Enable fetching news and sentiment via SerpAPI for watched assets."),
});
export type DataAgentConfig = z.infer<typeof DataAgentConfigSchema>;

export const AnalysisAgentConfigSchema = BaseAgentConfigSchema.extend({
  llmModelProviderId: z.string().optional().describe("ID of the configured LLM provider to use."),
  llmModelName: z.string().optional().describe("Specific model name from the selected provider."),
  analysisPrompt: z.string().default(
    `Analyze the portfolio's current performance, risk exposure, and recent trades.
Identify potential issues like high drawdown, concentration risk, or strategy underperformance.
Provide actionable insights and recommendations for adjustments.
Portfolio Metrics: {metrics}
Recent Trades: {trades}
Market News/Sentiment: {marketNews}`
  ).describe("Prompt for the analysis LLM. Use placeholders like {metrics}, {trades}, {marketNews}."),
  analysisFrequencyHours: z.number().int().min(1).max(24).default(4).describe("How often to perform and report analysis, in hours."),
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
  isDefault: boolean;
  config?: AgentConfig;
  associatedStrategyIds?: string[];
}

// --- Mock Data ---
const mockAgents: Agent[] = [
  {
    id: 'agent-gen-default', name: 'Strategy Generator', type: 'Strategy Coding Agent', status: 'Running', description: 'Automatically codes, debugs, and backtests new strategies.', tasksCompleted: 15, errors: 1, isDefault: true,
    // config: StrategyCodingAgentConfigSchema.parse({ llmModelProviderId: 'llm-google-default', llmModelName: 'gemini-2.0-flash', enabledTools: ['Backtester', 'TechnicalIndicatorCalculator'] }),
  },
  {
    id: 'agent-exec-momentum', name: 'Momentum Executor', type: 'Execution Agent', status: 'Running', description: 'Executes trades for momentum strategies.', tasksCompleted: 128, errors: 0, isDefault: false, associatedStrategyIds: ['strat-001'],
    // config: ExecutionAgentConfigSchema.parse({ brokerConfigId: 'broker-alpaca-paper', enabledTools: ['OrderExecutor', 'PortfolioManager'], requiresAllAgentConfirmation: true }),
  },
  {
    id: 'agent-data-main', name: 'Market Scanner', type: 'Data Agent', status: 'Running', description: 'Monitors market data for signals & news.', tasksCompleted: 1532, errors: 3, isDefault: true,
    // config: DataAgentConfigSchema.parse({ dataProviderConfigId: 'broker-alpaca-paper', watchedAssets: [{brokerId: 'broker-alpaca-paper', symbol: 'AAPL'}, {brokerId: 'broker-alpaca-paper', symbol: 'MSFT'}], useSerpApiForNews: true, enabledTools: ['MarketDataFetcher', 'WebSearcher']}),
  },
  {
    id: 'agent-exec-ai', name: 'AI Trend Executor', type: 'Execution Agent', status: 'Idle', description: 'Executes trades for AI-driven trend strategies.', tasksCompleted: 95, errors: 0, isDefault: false, associatedStrategyIds: ['strat-003'],
    // config: ExecutionAgentConfigSchema.parse({ brokerConfigId: 'broker-alpaca-paper', llmModelProviderId: 'llm-google-default', llmModelName: 'gemini-2.0-flash', maxConcurrentTrades: 3, orderRetryAttempts: 5, requiresAllAgentConfirmation: false, enabledTools: ['OrderExecutor', 'PortfolioManager'] }),
  },
  {
    id: 'agent-risk-default', name: 'Portfolio Analyst', type: 'Analysis Agent', status: 'Running', description: 'Monitors overall portfolio risk and performance.', tasksCompleted: 45, errors: 0, isDefault: true,
    // config: AnalysisAgentConfigSchema.parse({llmModelProviderId: 'llm-google-default', llmModelName: 'gemini-2.0-flash', enabledTools: ['PortfolioManager', 'TechnicalIndicatorCalculator', 'MarketDataFetcher']}),
  },
];

// Update mockAgentConfigs to use the new schemas
let mockAgentConfigs: Record<string, AgentConfig> = {
    'agent-gen-default': StrategyCodingAgentConfigSchema.parse({ 
        llmModelProviderId: 'llm-google-default', 
        llmModelName: 'gemini-2.0-flash', 
        enabledTools: ['Backtester', 'TechnicalIndicatorCalculator'],
        // generationPrompt: StrategyCodingAgentConfigSchema.shape.generationPrompt.default(undefined) // Let Zod handle default
    }),
    'agent-exec-momentum': ExecutionAgentConfigSchema.parse({ 
        brokerConfigId: 'broker-alpaca-paper', 
        enabledTools: ['OrderExecutor', 'PortfolioManager'],
        // executionLogicPrompt: ExecutionAgentConfigSchema.shape.executionLogicPrompt.default(undefined), // Let Zod handle default
        requiresAllAgentConfirmation: true
    }),
    'agent-data-main': DataAgentConfigSchema.parse({ 
        dataProviderConfigId: 'broker-alpaca-paper', 
        watchedAssets: [{brokerId: 'broker-alpaca-paper', symbol: 'AAPL'}, {brokerId: 'broker-alpaca-paper', symbol: 'MSFT'}, {brokerId: 'broker-alpaca-paper', symbol: 'GOOGL'}], 
        useSerpApiForNews: true, 
        fetchFrequencyMinutes: 5, 
        enabledTools: ['MarketDataFetcher', 'WebSearcher']
    }),
    'agent-exec-ai': ExecutionAgentConfigSchema.parse({ 
        brokerConfigId: 'broker-alpaca-paper', 
        llmModelProviderId: 'llm-google-default', 
        llmModelName: 'gemini-2.0-flash', 
        maxConcurrentTrades: 3, 
        orderRetryAttempts: 5, 
        enabledTools: ['OrderExecutor', 'PortfolioManager'],
        // executionLogicPrompt: ExecutionAgentConfigSchema.shape.executionLogicPrompt.default(undefined), // Let Zod handle default
        requiresAllAgentConfirmation: false,
    }),
    'agent-risk-default': AnalysisAgentConfigSchema.parse({
        llmModelProviderId: 'llm-google-default', 
        llmModelName: 'gemini-2.0-flash', 
        enabledTools: ['PortfolioManager', 'TechnicalIndicatorCalculator', 'MarketDataFetcher'],
        // analysisPrompt: AnalysisAgentConfigSchema.shape.analysisPrompt.default(undefined), // Let Zod handle default
    }),
};


// --- Service Functions ---

export async function getAgents(): Promise<Agent[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const agentsWithConfig = mockAgents.map(agent => ({
       ...agent,
       config: mockAgentConfigs[agent.id] || undefined
   }));
  return agentsWithConfig;
}

export async function getAgentById(agentId: string): Promise<Agent | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) return null;
     const agentWithConfig = {
         ...agent,
         config: mockAgentConfigs[agent.id] || undefined
     };
    return agentWithConfig;
}

export async function getAgentConfig(agentId: string): Promise<AgentConfig | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) return null;
    // Ensure a default config is created if one doesn't exist
    if (!mockAgentConfigs[agentId]) {
        let defaultConfig: AgentConfig;
        switch (agent.type) {
            case 'Strategy Coding Agent': defaultConfig = StrategyCodingAgentConfigSchema.parse({}); break;
            case 'Execution Agent': defaultConfig = ExecutionAgentConfigSchema.parse({brokerConfigId: ""}); break; // Provide minimal valid
            case 'Data Agent': defaultConfig = DataAgentConfigSchema.parse({watchedAssets: [{brokerId: "default-broker", symbol: "DEFAULT"}] }); break; // Provide minimal valid
            case 'Analysis Agent': defaultConfig = AnalysisAgentConfigSchema.parse({}); break;
            default: defaultConfig = BaseAgentConfigSchema.parse({});
        }
        mockAgentConfigs[agentId] = defaultConfig;
    }
    return mockAgentConfigs[agentId];
}

export async function updateAgentConfig(agentId: string, config: AgentConfig): Promise<AgentConfig | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
     const agent = mockAgents.find(a => a.id === agentId);
     if (!agent) {
        console.warn(`Agent ${agentId} not found for config update.`);
        return null;
     }

    // Basic validation: Ensure the config type matches the agent type (simplified)
    let validationResult;
    switch (agent.type) {
        case 'Strategy Coding Agent': validationResult = StrategyCodingAgentConfigSchema.safeParse(config); break;
        case 'Execution Agent': validationResult = ExecutionAgentConfigSchema.safeParse(config); break;
        case 'Data Agent': validationResult = DataAgentConfigSchema.safeParse(config); break;
        case 'Analysis Agent': validationResult = AnalysisAgentConfigSchema.safeParse(config); break;
        default: validationResult = BaseAgentConfigSchema.safeParse(config); // Fallback for safety
    }

    if (!validationResult.success) {
        console.error(`Config for agent ${agentId} (type: ${agent.type}) is invalid:`, config, validationResult.error.flatten());
        // In a real app, throw a more specific error or return detailed validation errors
        throw new Error(`Configuration data is invalid for the agent type: ${validationResult.error.flatten().formErrors.join(', ')}`);
    }

    console.log(`SERVICE: Updating config for agent ${agentId}`, validationResult.data);
    mockAgentConfigs[agentId] = validationResult.data; // Store the validated and potentially transformed data
    return validationResult.data;
}


export async function activateAgent(agentId: string): Promise<Agent | null> {
     console.log(`SERVICE: Activating agent ${agentId}`);
     await new Promise(resolve => setTimeout(resolve, 400));
     const index = mockAgents.findIndex(a => a.id === agentId);
     if (index === -1) return null;
     const newStatus = (mockAgents[index].type === 'Execution Agent' || mockAgents[index].type === 'Strategy Coding Agent')
         ? 'Idle'
         : 'Running';
     mockAgents[index].status = newStatus;
     return { ...mockAgents[index], config: mockAgentConfigs[agentId] };
}

export async function deactivateAgent(agentId: string): Promise<Agent | null> {
     console.log(`SERVICE: Deactivating agent ${agentId}`);
     await new Promise(resolve => setTimeout(resolve, 400));
     const index = mockAgents.findIndex(a => a.id === agentId);
     if (index === -1) return null;
     mockAgents[index].status = 'Stopped';
     return { ...mockAgents[index], config: mockAgentConfigs[agentId] };
}

export async function addAgent(agentData: Omit<Agent, 'id' | 'tasksCompleted' | 'errors'>): Promise<Agent> {
    console.log(`SERVICE: Adding new agent ${agentData.name}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const newId = `agent-${agentData.type.split(' ')[0].toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const newAgent: Agent = {
        ...agentData,
        id: newId,
        tasksCompleted: 0,
        errors: 0,
        status: 'Stopped',
        isDefault: false,
    };
    mockAgents.push(newAgent);
    let defaultConfig: AgentConfig;
     switch (newAgent.type) {
        case 'Strategy Coding Agent': defaultConfig = StrategyCodingAgentConfigSchema.parse({}); break;
        case 'Execution Agent': defaultConfig = ExecutionAgentConfigSchema.parse({ brokerConfigId: "" }); break;
        case 'Data Agent': defaultConfig = DataAgentConfigSchema.parse({ watchedAssets: [{brokerId: "default-broker", symbol: "DEFAULT"}] }); break;
        case 'Analysis Agent': defaultConfig = AnalysisAgentConfigSchema.parse({}); break;
        default: defaultConfig = BaseAgentConfigSchema.parse({});
     }
     mockAgentConfigs[newId] = defaultConfig;
    console.log(`SERVICE: Added agent ${newId}`);
    return newAgent;
}

export async function deleteAgent(agentId: string): Promise<boolean> {
     console.log(`SERVICE: Deleting agent ${agentId}`);
     await new Promise(resolve => setTimeout(resolve, 300));
     const index = mockAgents.findIndex(a => a.id === agentId);
     if (index === -1 || mockAgents[index].isDefault) {
         console.warn(`Agent ${agentId} not found or is a default agent.`);
         return false;
     }
     mockAgents.splice(index, 1);
     delete mockAgentConfigs[agentId];
     console.log(`SERVICE: Deleted agent ${agentId}`);
     return true;
}
