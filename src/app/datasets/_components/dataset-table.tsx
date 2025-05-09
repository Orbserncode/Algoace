// src/app/datasets/_components/dataset-table.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  Info,
  FileType,
  Database,
  Calendar,
  HardDrive,
  ExternalLink,
  Filter,
  ArrowUpDown,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dataset } from '@/services/datasets-service';
import { format } from 'date-fns';

interface DatasetTableProps {
  datasets: Dataset[];
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
  onDeleteClick?: (dataset: Dataset) => void;
}

export function DatasetTable({ datasets, onDeleteClick }: DatasetTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Handle view details
  const handleViewDetails = (dataset: Dataset) => {
    router.push(`/datasets/${dataset.id}`);
  };

  // Handle download
  const handleDownload = (dataset: Dataset) => {
    toast({
      title: "Download Started",
      description: `Downloading ${dataset.name}...`,
    });
    // Actual download logic would go here
  };

  if (datasets.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="hidden lg:table-cell">Description</TableHead>
            <TableHead className="w-[100px]">Category</TableHead>
            <TableHead className="w-[100px] hidden md:table-cell">Format</TableHead>
            <TableHead className="hidden sm:table-cell w-[120px]">Size</TableHead>
            <TableHead className="hidden lg:table-cell w-[120px]">Last Updated</TableHead>
            <TableHead className="text-right w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
              No datasets found. Try adjusting your search or filters.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                <Button 
                  variant="ghost" 
                  className="p-0 hover:bg-transparent" 
                  onClick={() => handleSort('name')}
                >
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Description</TableHead>
              <TableHead className="w-[100px]">
                <Button 
                  variant="ghost" 
                  className="p-0 hover:bg-transparent" 
                  onClick={() => handleSort('category')}
                >
                  Category
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[100px] hidden md:table-cell">
                <Button 
                  variant="ghost" 
                  className="p-0 hover:bg-transparent" 
                  onClick={() => handleSort('format')}
                >
                  Format
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden sm:table-cell w-[120px]">
                <Button 
                  variant="ghost" 
                  className="p-0 hover:bg-transparent" 
                  onClick={() => handleSort('size')}
                >
                  Size
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell w-[120px]">
                <Button 
                  variant="ghost" 
                  className="p-0 hover:bg-transparent" 
                  onClick={() => handleSort('lastUpdated')}
                >
                  Last Updated
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datasets.map((dataset) => (
              <TableRow
                key={dataset.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/datasets/${dataset.id}`)}
              >
                <TableCell className="font-medium">{dataset.name}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs truncate" title={dataset.description}>
                  {dataset.description}
                </TableCell>
                <TableCell>
                  <Badge className={`${getCategoryColor(dataset.category)} capitalize`}>
                    {dataset.category}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-1">
                    {getFormatIcon(dataset.format)}
                    <span>{dataset.format.toUpperCase()}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {formatFileSize(dataset.size)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {formatDate(dataset.lastUpdated)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end space-x-1 items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="View Details" onClick={() => handleViewDetails(dataset)}>
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Details</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Download Dataset" onClick={() => handleDownload(dataset)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download Dataset</p>
                      </TooltipContent>
                    </Tooltip>
                    {onDeleteClick && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete Dataset"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClick(dataset);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete Dataset</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TooltipProvider>

      {/* No dialog needed anymore as we navigate to the explorer page */}
    </>
  );
}