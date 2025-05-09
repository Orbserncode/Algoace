'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Database, FileJson, RefreshCw, Plus, LayoutGrid, LayoutList, Trash2 } from "lucide-react";
import { DatasetsList } from './_components/datasets-list';
import { DatasetTable } from './_components/dataset-table';
import { RecommendationsList } from './_components/recommendations-list';
import { DatasetCategoryFilter } from './_components/dataset-category-filter';
import { DatasetUploadDialog } from './_components/dataset-upload-dialog';
import {
  getDatasets,
  getAgentRecommendations,
  deleteDataset,
  Dataset,
  AgentRecommendation,
  DatasetCategory
} from '@/services/datasets-service';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DatasetsPage() {
  const { toast } = useToast();
  
  // State for datasets and recommendations
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<AgentRecommendation[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<string>('datasets');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<DatasetCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Filter datasets based on search query and category
  useEffect(() => {
    if (datasets.length > 0) {
      let filtered = [...datasets];
      
      // Apply category filter
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(dataset => dataset.category === selectedCategory);
      }
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(dataset => 
          dataset.name.toLowerCase().includes(query) || 
          dataset.description.toLowerCase().includes(query) ||
          dataset.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      setFilteredDatasets(filtered);
    }
  }, [datasets, searchQuery, selectedCategory]);

  // Filter recommendations based on search query
  useEffect(() => {
    if (recommendations.length > 0) {
      let filtered = [...recommendations];
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(rec => 
          rec.agentName.toLowerCase().includes(query) || 
          rec.datasetName.toLowerCase().includes(query) ||
          rec.type.toLowerCase().includes(query) ||
          rec.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      setFilteredRecommendations(filtered);
    }
  }, [recommendations, searchQuery]);

  // Load data from API
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [datasetsData, recommendationsData] = await Promise.all([
        getDatasets(),
        getAgentRecommendations()
      ]);
      
      setDatasets(datasetsData);
      setFilteredDatasets(datasetsData);
      setRecommendations(recommendationsData);
      setFilteredRecommendations(recommendationsData);
    } catch (err) {
      console.error('Failed to load datasets data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Handle category change
  const handleCategoryChange = (category: DatasetCategory | 'all') => {
    setSelectedCategory(category);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Datasets & Recommendations</h1>
          <p className="text-muted-foreground">
            Manage datasets for backtesting and view agent recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2">
            <div className="border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="px-2"
                onClick={() => setViewMode('grid')}
                aria-label="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="px-2"
                onClick={() => setViewMode('table')}
                aria-label="Table View"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
            <DatasetUploadDialog onUploadComplete={handleRefresh} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search datasets or recommendations..."
            className="pl-8 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {activeTab === 'datasets' && (
          <DatasetCategoryFilter 
            selectedCategory={selectedCategory} 
            onCategoryChange={handleCategoryChange} 
          />
        )}
      </div>

      <Tabs defaultValue="datasets" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="datasets" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Datasets
            <Badge variant="secondary" className="ml-1">
              {datasets.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Agent Recommendations
            <Badge variant="secondary" className="ml-1">
              {recommendations.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        
        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="pt-6 text-destructive">
              {error}
            </CardContent>
          </Card>
        )}
        
        <TabsContent value="datasets" className="m-0">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading datasets...</span>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <DatasetsList
              datasets={filteredDatasets}
              onDeleteClick={(dataset) => {
                setDatasetToDelete(dataset);
                setDeleteDialogOpen(true);
              }}
            />
          ) : (
            <DatasetTable
              datasets={filteredDatasets}
              onDeleteClick={(dataset) => {
                setDatasetToDelete(dataset);
                setDeleteDialogOpen(true);
              }}
            />
          )}
        </TabsContent>
        
        <TabsContent value="recommendations" className="m-0">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
              </CardContent>
            </Card>
          ) : (
            <RecommendationsList recommendations={filteredRecommendations} />
          )}
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the dataset "{datasetToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!datasetToDelete) return;
                
                setIsDeleting(true);
                try {
                  const success = await deleteDataset(datasetToDelete.id, true);
                  if (success) {
                    toast({
                      title: "Dataset deleted",
                      description: `${datasetToDelete.name} has been successfully deleted.`,
                    });
                    handleRefresh();
                  } else {
                    toast({
                      title: "Error",
                      description: "Failed to delete dataset. Please try again.",
                      variant: "destructive",
                    });
                  }
                } catch (err) {
                  console.error("Failed to delete dataset:", err);
                  toast({
                    title: "Error",
                    description: `Failed to delete dataset: ${err instanceof Error ? err.message : "Unknown error"}`,
                    variant: "destructive",
                  });
                } finally {
                  setIsDeleting(false);
                  setDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}