// src/services/datasets-service.ts

/**
 * Service for managing datasets used for backtesting and agent recommendations
 */

export interface Dataset {
  id: string;
  name: string;
  description: string;
  category: DatasetCategory;
  subcategory: string;
  source: string;
  format: 'csv' | 'json' | 'parquet' | 'other';
  size: number; // in KB
  lastUpdated: string;
  path: string;
  metadata: Record<string, any>;
  tags: string[];
}

export interface AgentRecommendation {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  datasetId: string;
  datasetName: string;
  type: 'sentiment' | 'price_prediction' | 'strategy_suggestion' | 'risk_assessment' | 'other';
  content: Record<string, any>;
  confidence: number;
  tags: string[];
}

export type DatasetCategory = 
  | 'forex' 
  | 'crypto' 
  | 'futures' 
  | 'stocks' 
  | 'commodities' 
  | 'indices' 
  | 'other';

export interface DatasetSubcategory {
  id: string;
  name: string;
  category: DatasetCategory;
  description: string;
}

// API base URL - use /api prefix to rely on Next.js rewrites
const API_BASE_URL = '/api';

// Get all datasets
export async function getDatasets(): Promise<Dataset[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/`);
    if (!response.ok) {
      throw new Error(`Error fetching datasets: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch datasets:', error);
    throw error;
  }
}

// Get datasets by category
export async function getDatasetsByCategory(category: DatasetCategory): Promise<Dataset[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets?category=${category}`);
    if (!response.ok) {
      throw new Error(`Error fetching datasets by category: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch datasets for category ${category}:`, error);
    throw error;
  }
}

// Get dataset by ID
export async function getDatasetById(id: string): Promise<Dataset | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error fetching dataset: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch dataset with ID ${id}:`, error);
    return null;
  }
}

// Create a new dataset
export async function createDataset(dataset: Omit<Dataset, 'id'>): Promise<Dataset | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataset),
    });
    if (!response.ok) {
      throw new Error(`Error creating dataset: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to create dataset:', error);
    return null;
  }
}

// Update a dataset
export async function updateDataset(id: string, updates: Partial<Dataset>): Promise<Dataset | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`Error updating dataset: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to update dataset with ID ${id}:`, error);
    return null;
  }
}

// Delete a dataset
export async function deleteDataset(id: string, deleteFile: boolean = false): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/${id}?delete_file=${deleteFile}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Error deleting dataset: ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error(`Failed to delete dataset with ID ${id}:`, error);
    return false;
  }
}

// Upload a dataset file
export async function uploadDatasetFile(
  file: File,
  name: string,
  description: string,
  category: DatasetCategory,
  subcategory: string,
  source: string,
  tags: string[] = []
): Promise<Dataset | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('subcategory', subcategory);
    formData.append('source', source);
    formData.append('format', file.name.split('.').pop() || 'other');
    formData.append('path', `/data/${category}/${file.name}`);
    formData.append('tags', JSON.stringify(tags));

    const response = await fetch(`${API_BASE_URL}/datasets`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Error uploading dataset: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to upload dataset:', error);
    return null;
  }
}

// Get all subcategories
export async function getSubcategories(): Promise<DatasetSubcategory[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/subcategories`);
    if (!response.ok) {
      throw new Error(`Error fetching subcategories: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch subcategories:', error);
    throw error;
  }
}

// Get subcategories by category
export async function getSubcategoriesByCategory(category: DatasetCategory): Promise<DatasetSubcategory[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/subcategories?category=${category}`);
    if (!response.ok) {
      throw new Error(`Error fetching subcategories by category: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch subcategories for category ${category}:`, error);
    throw error;
  }
}

// Get all agent recommendations
export async function getAgentRecommendations(): Promise<AgentRecommendation[]> {
  try {
    // The backend endpoint is /recommendations/all
    const response = await fetch(`${API_BASE_URL}/recommendations/all`);
    if (!response.ok) {
      throw new Error(`Error fetching recommendations: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch agent recommendations:', error);
    throw error;
  }
}

// Get agent recommendations by dataset ID
export async function getRecommendationsByDataset(datasetId: string): Promise<AgentRecommendation[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/recommendations`);
    if (!response.ok) {
      throw new Error(`Error fetching recommendations: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch recommendations for dataset ${datasetId}:`, error);
    throw error;
  }
}

// Get agent recommendations by agent name
export async function getRecommendationsByAgent(agentName: string): Promise<AgentRecommendation[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/recommendations/${agentName}`);
    if (!response.ok) {
      throw new Error(`Error fetching recommendations: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch recommendations for agent ${agentName}:`, error);
    throw error;
  }
}

// Get recommendation by ID
export async function getRecommendationById(id: string): Promise<AgentRecommendation | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error fetching recommendation: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch recommendation with ID ${id}:`, error);
    return null;
  }
}

// Get dataset data with pagination, sorting, and filtering
export async function getDatasetData(
  datasetId: string,
  page: number = 1,
  pageSize: number = 100,
  sortColumn?: string,
  sortDirection?: 'asc' | 'desc',
  filters?: Record<string, any>
): Promise<{ data: any[], totalRows: number }> {
  try {
    let url = `${API_BASE_URL}/datasets/${datasetId}/data?page=${page}&pageSize=${pageSize}`;
    
    if (sortColumn && sortDirection) {
      url += `&sortColumn=${sortColumn}&sortDirection=${sortDirection}`;
    }
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url += `&${key}=${encodeURIComponent(value)}`;
        }
      });
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching dataset data: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch data for dataset ${datasetId}:`, error);
    throw error;
  }
}