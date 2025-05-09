// src/services/agents-service.new.ts

/**
 * @fileOverview Service functions for fetching agent data.
 * This service connects to the backend API to fetch and manage agents.
 * The backend is built with FastAPI and uses SQLModel to interact with a SQLite database.
 * This version includes Pydantic-AI specific configuration options.
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

// --- Pydantic-AI Dependencies Schema ---
export const DependenciesSchema = z.object({
    client: z.string().optional().describe("HTTP client configuration"),
    weather_api_key: z.string().optional().describe("API key for weather services"),
    news_api_key: z.string().optional().describe("API key for news services"),
    market_data_api_key: z.string().optional().describe("API key for market data services"),
    geo_api_key: z.string().optional().describe("API key for geolocation services"),
    serp_api_key: z.string().optional().describe("API key for search engine results"),
    broker_credentials: z.record(z.string()).optional().describe("Credentials for broker connections"),
}).describe("Resources that tools might need, such as API clients, database connections, etc.");

// --- Base Agent Configuration Schema ---
export const BaseAgentConfigSchema = z.object({
    // Core Pydantic-AI parameters
    system_prompt: z.string().optional().describe("System prompt that guides the agent's behavior"),
    retries: z.number().default(2).describe("Number of retries for failed operations"),
    instrument: z.boolean().default(true).describe("Whether to instrument the agent for monitoring"),
    
    // LLM configuration
    llm_provider: z.enum(['openai', 'google', 'anthropic', 'groq', 'local']).default('groq').describe("LLM provider to use"),
    llm_model: z.string().optional().describe("Specific model name (e.g., 'gpt-4', 'claude-3-opus')"),
    
    // Tool configuration
    enabled_tools: z.array(z.custom<ToolName>((val) => availableTools.some(tool => tool.name === val)))
        .optional()
        .default([])
        .describe("Tools this agent can use"),
    
    // Logging and monitoring
    log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info').describe("Logging verbosity for the agent"),
    
    // Dependencies configuration
    dependencies: DependenciesSchema.optional().describe("Dependencies for the agent's tools"),
});
export type BaseAgentConfig = z.infer<typeof BaseAgentConfigSchema>;

// --- Research Agent Config ---
export const ResearchAgentConfigSchema = BaseAgentConfigSchema.extend({
    research_depth: z.enum(['shallow', 'moderate', 'deep']).default('moderate').describe("Depth of research to perform"),
    max_sources: z.number().default(5).describe("Maximum number of sources to consult"),
    include_sentiment_analysis: z.boolean().default(true).describe("Whether to include sentiment analysis"),
    research_prompt_template: z.string().optional().describe("Custom prompt template for research"),
});
export type ResearchAgentConfig = z.infer<typeof ResearchAgentConfigSchema>;

// --- Strategy Coding Agent Config ---
export const StrategyCodingAgentConfigSchema = BaseAgentConfigSchema.extend({
    strategy_framework: z.string().default('lumibot').describe("Framework to use for strategy code generation"),
    default_timeframe: z.string().default('1D').describe("Default trading timeframe"),
    default_asset_class: z.string().default('stock').describe("Default asset class"),
    coding_prompt_template: z.string().optional().describe("Custom prompt template for code generation"),
    include_comments: z.boolean().default(true).describe("Whether to include detailed comments in generated code"),
    include_tests: z.boolean().default(false).describe("Whether to generate test cases"),
});
export type StrategyCodingAgentConfig = z.infer<typeof StrategyCodingAgentConfigSchema>;

// --- Execution Agent Config ---
export const ExecutionAgentConfigSchema = BaseAgentConfigSchema.extend({
    broker_id: z.string().describe("ID of the broker configuration to use"),
    max_concurrent_trades: z.number().default(5).describe("Maximum number of concurrent trades"),
    risk_per_trade: z.number().default(1).describe("Maximum risk percentage per trade"),
    require_confirmation: z.boolean().default(true).describe("Whether to require confirmation before executing trades"),
    execution_prompt_template: z.string().optional().describe("Custom prompt template for execution decisions"),
    trading_hours: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
        timezone: z.string().default('UTC'),
    }).optional().describe("Trading hours configuration"),
});
export type ExecutionAgentConfig = z.infer<typeof ExecutionAgentConfigSchema>;

// --- Portfolio Agent Config ---
export const PortfolioAgentConfigSchema = BaseAgentConfigSchema.extend({
    rebalance_frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).default('monthly').describe("How often to rebalance the portfolio"),
    max_allocation_per_asset: z.number().default(20).describe("Maximum allocation percentage for any single asset"),
    risk_profile: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate').describe("Risk profile for portfolio management"),
    portfolio_prompt_template: z.string().optional().describe("Custom prompt template for portfolio decisions"),
});
export type PortfolioAgentConfig = z.infer<typeof PortfolioAgentConfigSchema>;

// --- Risk Agent Config ---
export const RiskAgentConfigSchema = BaseAgentConfigSchema.extend({
    max_drawdown: z.number().default(10).describe("Maximum drawdown percentage allowed"),
    volatility_threshold: z.number().default(15).describe("Volatility threshold for risk warnings"),
    correlation_threshold: z.number().default(0.7).describe("Correlation threshold for diversification warnings"),
    risk_prompt_template: z.string().optional().describe("Custom prompt template for risk assessment"),
});
export type RiskAgentConfig = z.infer<typeof RiskAgentConfigSchema>;

// --- Data Agent Config ---
export const DataAgentConfigSchema = BaseAgentConfigSchema.extend({
    watched_assets: z.array(z.object({
        symbol: z.string(),
        broker_id: z.string(),
    })).default([]).describe("Assets to watch for data collection"),
    data_sources: z.array(z.string()).default(['market', 'news', 'social']).describe("Data sources to monitor"),
    update_frequency: z.enum(['realtime', 'minute', 'hour', 'day']).default('hour').describe("How often to update data"),
    data_prompt_template: z.string().optional().describe("Custom prompt template for data analysis"),
});
export type DataAgentConfig = z.infer<typeof DataAgentConfigSchema>;

// --- Analysis Agent Config ---
export const AnalysisAgentConfigSchema = BaseAgentConfigSchema.extend({
    analysis_types: z.array(z.enum(['technical', 'fundamental', 'sentiment', 'macro'])).default(['technical']).describe("Types of analysis to perform"),
    indicator_preferences: z.record(z.any()).default({}).describe("Preferences for technical indicators"),
    analysis_prompt_template: z.string().optional().describe("Custom prompt template for analysis"),
});
export type AnalysisAgentConfig = z.infer<typeof AnalysisAgentConfigSchema>;

// --- Agent Type Union ---
export type AgentConfig = 
    | BaseAgentConfig 
    | ResearchAgentConfig 
    | StrategyCodingAgentConfig 
    | ExecutionAgentConfig 
    | PortfolioAgentConfig 
    | RiskAgentConfig 
    | DataAgentConfig 
    | AnalysisAgentConfig;

// --- Agent Interface ---
export interface Agent {
    id: string;
    name: string;
    type: 'Research Agent' | 'Strategy Coding Agent' | 'Execution Agent' | 'Portfolio Agent' | 'Risk Agent' | 'Data Agent' | 'Analysis Agent';
    description: string;
    status: 'Active' | 'Idle' | 'Error';
    tasksCompleted: number;
    errors: number;
    isDefault: boolean;
    associatedStrategyIds: string[];
    config: AgentConfig;
}

// --- Mock Data ---
const mockAgents: Agent[] = [
    {
        id: 'agent-research',
        name: 'Research Agent',
        type: 'Research Agent',
        description: 'Analyzes market data and news to provide insights.',
        status: 'Idle',
        tasksCompleted: 0,
        errors: 0,
        isDefault: true,
        associatedStrategyIds: [],
        config: {
            system_prompt: "You are a financial research agent. Analyze market data and news to provide insights.",
            llm_provider: 'groq',
            llm_model: 'llama3-70b-8192',
            enabled_tools: ['WebSearcher', 'MarketDataFetcher'],
            log_level: 'info',
            retries: 2,
            instrument: true,
            research_depth: 'moderate',
            max_sources: 5,
            include_sentiment_analysis: true,
        }
    },
    {
        id: 'agent-strategy-coding',
        name: 'Strategy Coding Agent',
        type: 'Strategy Coding Agent',
        description: 'Generates trading strategy code based on specifications.',
        status: 'Idle',
        tasksCompleted: 0,
        errors: 0,
        isDefault: true,
        associatedStrategyIds: [],
        config: {
            system_prompt: "You are a strategy coding agent. Generate trading strategy code based on specifications.",
            llm_provider: 'openai',
            llm_model: 'gpt-4-turbo',
            enabled_tools: ['TechnicalIndicatorCalculator', 'Backtester'],
            log_level: 'info',
            retries: 2,
            instrument: true,
            strategy_framework: 'lumibot',
            default_timeframe: '1D',
            default_asset_class: 'stock',
            include_comments: true,
            include_tests: false,
        }
    },
    {
        id: 'agent-execution',
        name: 'Execution Agent',
        type: 'Execution Agent',
        description: 'Executes trades based on strategy signals.',
        status: 'Idle',
        tasksCompleted: 0,
        errors: 0,
        isDefault: true,
        associatedStrategyIds: [],
        config: {
            system_prompt: "You are an execution agent. Execute trades based on strategy signals.",
            llm_provider: 'anthropic',
            llm_model: 'claude-3-sonnet-20240229',
            enabled_tools: ['OrderExecutor', 'PortfolioManager'],
            log_level: 'info',
            retries: 2,
            instrument: true,
            broker_id: 'broker-alpaca-paper',
            max_concurrent_trades: 5,
            risk_per_trade: 1,
            require_confirmation: true,
        }
    },
    {
        id: 'agent-portfolio',
        name: 'Portfolio Agent',
        type: 'Portfolio Agent',
        description: 'Manages portfolio allocation and rebalancing.',
        status: 'Idle',
        tasksCompleted: 0,
        errors: 0,
        isDefault: true,
        associatedStrategyIds: [],
        config: {
            system_prompt: "You are a portfolio management agent. Manage portfolio allocation and rebalancing.",
            llm_provider: 'groq',
            llm_model: 'llama3-70b-8192',
            enabled_tools: ['PortfolioManager', 'MarketDataFetcher'],
            log_level: 'info',
            retries: 2,
            instrument: true,
            rebalance_frequency: 'monthly',
            max_allocation_per_asset: 20,
            risk_profile: 'moderate',
        }
    },
    {
        id: 'agent-risk',
        name: 'Risk Agent',
        type: 'Risk Agent',
        description: 'Monitors and manages trading risk.',
        status: 'Idle',
        tasksCompleted: 0,
        errors: 0,
        isDefault: true,
        associatedStrategyIds: [],
        config: {
            system_prompt: "You are a risk management agent. Monitor and manage trading risk.",
            llm_provider: 'openai',
            llm_model: 'gpt-4-turbo',
            enabled_tools: ['PortfolioManager', 'MarketDataFetcher'],
            log_level: 'info',
            retries: 2,
            instrument: true,
            max_drawdown: 10,
            volatility_threshold: 15,
            correlation_threshold: 0.7,
        }
    },
];

// --- Service Functions ---

/**
 * Fetches all agents from the backend.
 * @returns A promise resolving to an array of Agent objects.
 */
export async function getAgents(): Promise<Agent[]> {
    console.log("Fetching agents from backend...");
    
    // In a real implementation, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [...mockAgents]; // Return a copy to prevent mutation
}

/**
 * Fetches a specific agent by ID.
 * @param agentId The ID of the agent to fetch.
 * @returns A promise resolving to the Agent object or null if not found.
 */
export async function getAgent(agentId: string): Promise<Agent | null> {
    console.log(`Fetching agent with ID: ${agentId}`);
    
    // In a real implementation, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const agent = mockAgents.find(a => a.id === agentId);
    return agent ? { ...agent } : null; // Return a copy to prevent mutation
}

/**
 * Fetches the configuration for a specific agent.
 * @param agentId The ID of the agent to fetch configuration for.
 * @returns A promise resolving to the agent's configuration or null if not found.
 */
export async function getAgentConfig(agentId: string): Promise<AgentConfig | null> {
    console.log(`Fetching configuration for agent with ID: ${agentId}`);
    
    // In a real implementation, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const agent = mockAgents.find(a => a.id === agentId);
    return agent ? { ...agent.config } : null; // Return a copy to prevent mutation
}

/**
 * Updates the configuration for a specific agent.
 * @param agentId The ID of the agent to update configuration for.
 * @param config The new configuration to apply.
 * @returns A promise resolving to the updated configuration or null if the agent was not found.
 */
export async function updateAgentConfig(agentId: string, config: AgentConfig): Promise<AgentConfig | null> {
    console.log(`Updating configuration for agent with ID: ${agentId}`);
    console.log("New config:", config);
    
    // In a real implementation, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const agentIndex = mockAgents.findIndex(a => a.id === agentId);
    if (agentIndex === -1) return null;
    
    // Update the agent's configuration
    mockAgents[agentIndex].config = { ...config };
    
    return { ...mockAgents[agentIndex].config }; // Return a copy to prevent mutation
}

/**
 * Activates an agent, changing its status to 'Active'.
 * @param agentId The ID of the agent to activate.
 * @returns A promise resolving to the updated Agent object or null if not found.
 */
export async function activateAgent(agentId: string): Promise<Agent | null> {
    console.log(`Activating agent with ID: ${agentId}`);
    
    // In a real implementation, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const agentIndex = mockAgents.findIndex(a => a.id === agentId);
    if (agentIndex === -1) return null;
    
    // Update the agent's status
    mockAgents[agentIndex].status = 'Active';
    
    return { ...mockAgents[agentIndex] }; // Return a copy to prevent mutation
}

/**
 * Deactivates an agent, changing its status to 'Idle'.
 * @param agentId The ID of the agent to deactivate.
 * @returns A promise resolving to the updated Agent object or null if not found.
 */
export async function deactivateAgent(agentId: string): Promise<Agent | null> {
    console.log(`Deactivating agent with ID: ${agentId}`);
    
    // In a real implementation, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const agentIndex = mockAgents.findIndex(a => a.id === agentId);
    if (agentIndex === -1) return null;
    
    // Update the agent's status
    mockAgents[agentIndex].status = 'Idle';
    
    return { ...mockAgents[agentIndex] }; // Return a copy to prevent mutation
}

/**
 * Creates a new custom agent.
 * @param agent The agent to create.
 * @returns A promise resolving to the created Agent object.
 */
export async function createAgent(agent: Omit<Agent, 'id'>): Promise<Agent> {
    console.log("Creating new agent:", agent);
    
    // In a real implementation, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // Generate a new ID for the agent
    const newAgent: Agent = {
        ...agent,
        id: `agent-custom-${Date.now()}`,
    };
    
    // Add the new agent to the mock data
    mockAgents.push(newAgent);
    
    return { ...newAgent }; // Return a copy to prevent mutation
}

/**
 * Deletes an agent.
 * @param agentId The ID of the agent to delete.
 * @returns A promise resolving to a boolean indicating success.
 */
export async function deleteAgent(agentId: string): Promise<boolean> {
    console.log(`Deleting agent with ID: ${agentId}`);
    
    // In a real implementation, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const agentIndex = mockAgents.findIndex(a => a.id === agentId);
    if (agentIndex === -1) return false;
    
    // Remove the agent from the mock data
    mockAgents.splice(agentIndex, 1);
    
    return true;
}

/**
 * Gets the schema for a specific agent type.
 * @param agentType The type of agent to get the schema for.
 * @returns The Zod schema for the specified agent type.
 */
export function getSchemaForAgentType(agentType: Agent['type']): z.ZodType<any> {
    switch (agentType) {
        case 'Research Agent':
            return ResearchAgentConfigSchema;
        case 'Strategy Coding Agent':
            return StrategyCodingAgentConfigSchema;
        case 'Execution Agent':
            return ExecutionAgentConfigSchema;
        case 'Portfolio Agent':
            return PortfolioAgentConfigSchema;
        case 'Risk Agent':
            return RiskAgentConfigSchema;
        case 'Data Agent':
            return DataAgentConfigSchema;
        case 'Analysis Agent':
            return AnalysisAgentConfigSchema;
        default:
            return BaseAgentConfigSchema;
    }
}