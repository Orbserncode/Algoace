// src/services/agents-service.ts

/**
 * @fileOverview Service functions for fetching agent data.
 * Replace mock implementations with actual data fetching logic (e.g., from a database or API).
 */

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'Running' | 'Idle' | 'Error' | 'Stopped'; // Added 'Stopped'
  description: string;
  tasksCompleted: number;
  errors: number;
}

// Mock data - replace with actual data source
const mockAgents: Agent[] = [
  { id: 'agent-001', name: 'Strategy Generator', type: 'Strategy Coding Agent', status: 'Running', description: 'Automatically codes, debugs, and backtests new strategies.', tasksCompleted: 15, errors: 1 },
  { id: 'agent-002', name: 'Execution Agent - Momentum', type: 'Execution Agent', status: 'Running', description: 'Executes trades for the Momentum Burst strategy.', tasksCompleted: 128, errors: 0 },
  { id: 'agent-003', name: 'Market Scanner', type: 'Data Agent', status: 'Running', description: 'Monitors market data for potential signals.', tasksCompleted: 1532, errors: 3 },
  { id: 'agent-004', name: 'Execution Agent - AI Trend', type: 'Execution Agent', status: 'Idle', description: 'Executes trades for the AI Trend Follower strategy.', tasksCompleted: 95, errors: 0 },
  { id: 'agent-005', name: 'Risk Management Agent', type: 'Analysis Agent', status: 'Running', description: 'Monitors overall portfolio risk.', tasksCompleted: 45, errors: 0 },
];

/**
 * Fetches the list of agents.
 * TODO: Replace with actual data fetching logic.
 * @returns A promise that resolves to an array of Agent objects.
 */
export async function getAgents(): Promise<Agent[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real application, fetch this data from your backend/database
  return mockAgents;
}

/**
 * Fetches a single agent by ID.
 * TODO: Replace with actual data fetching logic.
 * @param agentId The ID of the agent to fetch.
 * @returns A promise that resolves to the Agent object or null if not found.
 */
export async function getAgentById(agentId: string): Promise<Agent | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const agent = mockAgents.find(a => a.id === agentId);
    return agent || null;
}

// Add functions for updating/managing agents as needed
// e.g., startAgent, stopAgent, updateAgentConfig, etc.
// export async function startAgent(agentId: string): Promise<void> { ... }
// export async function stopAgent(agentId: string): Promise<void> { ... }
