'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  FileType,
  HardDrive,
  Info,
  Tag,
  Database,
  Download,
  BarChart,
  Clock,
  ExternalLink,
  Trash2
} from "lucide-react";
import { Dataset } from '@/services/datasets-service';
import { format } from 'date-fns';

interface DatasetsListProps {
  datasets: Dataset[];
  onDeleteClick?: (dataset: Dataset) => void;
}

export function DatasetsList({ datasets, onDeleteClick }: DatasetsListProps) {
  const router = useRouter();

  // Format file size
  const formatFileSize = (sizeInKB: number): string => {
    if (sizeInKB < 1024) {
      return `${sizeInKB} KB`;
    } else if (sizeInKB < 1024 * 1024) {
      return `${(sizeInKB / 1024).toFixed(2)} MB`;
    } else {
      return `${(sizeInKB / (1024 * 1024)).toFixed(2)} GB`;
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Get category badge color
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      forex: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      crypto: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      stocks: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      futures: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      commodities: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      indices: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    };
    
    return colors[category] || colors.other;
  };

  // Get format icon
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileType className="h-4 w-4" />;
      case 'json':
        return <FileType className="h-4 w-4" />;
      case 'parquet':
        return <Database className="h-4 w-4" />;
      default:
        return <FileType className="h-4 w-4" />;
    }
  };

  if (datasets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Database className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No datasets found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {datasets.map((dataset) => (
        <Card
          key={dataset.id}
          className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => router.push(`/datasets/${dataset.id}`)}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <Badge className={`${getCategoryColor(dataset.category)} capitalize`}>
                {dataset.category}
              </Badge>
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/datasets/${dataset.id}`);
                  }}
                >
                  <Info className="h-4 w-4" />
                </Button>
                {onDeleteClick && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick(dataset);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <CardTitle className="text-base mt-2">{dataset.name}</CardTitle>
          </CardHeader>
          
          <CardContent className="pb-2 flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {dataset.description}
            </p>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <FileType className="h-3.5 w-3.5" />
                <span>{dataset.format.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <HardDrive className="h-3.5 w-3.5" />
                <span>{formatFileSize(dataset.size)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Database className="h-3.5 w-3.5" />
                <span>{dataset.source}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDate(dataset.lastUpdated)}</span>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="pt-2 flex-shrink-0">
            <div className="flex flex-wrap gap-1 w-full">
              {dataset.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs capitalize">
                  {tag}
                </Badge>
              ))}
              {dataset.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{dataset.tags.length - 3}
                </Badge>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}