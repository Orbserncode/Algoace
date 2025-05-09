'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  FileJson, 
  Info, 
  Tag, 
  User, 
  Database, 
  Download, 
  BarChart, 
  Clock, 
  ExternalLink,
  Lightbulb,
  Percent
} from "lucide-react";
import { AgentRecommendation } from '@/services/datasets-service';
import { format } from 'date-fns';

interface RecommendationsListProps {
  recommendations: AgentRecommendation[];
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<AgentRecommendation | null>(null);

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  // Get type badge color
  const getTypeBadgeColor = (type: string): string => {
    const colors: Record<string, string> = {
      sentiment: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      price_prediction: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      strategy_suggestion: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      risk_assessment: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    };
    
    return colors[type] || colors.other;
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Format confidence
  const formatConfidence = (confidence: number): string => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  // Get recommendation summary
  const getRecommendationSummary = (recommendation: AgentRecommendation): string => {
    switch (recommendation.type) {
      case 'sentiment':
        return recommendation.content.sentiment 
          ? `${recommendation.content.sentiment.charAt(0).toUpperCase() + recommendation.content.sentiment.slice(1)} sentiment with ${formatConfidence(recommendation.confidence)} confidence`
          : 'Sentiment analysis';
      case 'price_prediction':
        return recommendation.content.direction 
          ? `Price ${recommendation.content.direction} prediction with ${formatConfidence(recommendation.confidence)} confidence`
          : 'Price prediction';
      case 'strategy_suggestion':
        return recommendation.content.strategyType 
          ? `${recommendation.content.strategyType.replace('_', ' ')} strategy suggestion`
          : 'Strategy suggestion';
      case 'risk_assessment':
        return recommendation.content.riskLevel 
          ? `${recommendation.content.riskLevel.charAt(0).toUpperCase() + recommendation.content.riskLevel.slice(1)} risk assessment`
          : 'Risk assessment';
      default:
        return `${recommendation.type.replace('_', ' ')} analysis`;
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Lightbulb className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No recommendations found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recommendations.map((recommendation) => (
        <Card key={recommendation.id} className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <Badge className={`${getTypeBadgeColor(recommendation.type)} capitalize`}>
                {recommendation.type.replace('_', ' ')}
              </Badge>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => setSelectedRecommendation(recommendation)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  {selectedRecommendation && selectedRecommendation.id === recommendation.id && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <span>{getRecommendationSummary(recommendation)}</span>
                          <Badge className={`${getTypeBadgeColor(recommendation.type)} capitalize`}>
                            {recommendation.type.replace('_', ' ')}
                          </Badge>
                        </DialogTitle>
                        <DialogDescription>
                          Generated by {recommendation.agentName} for {recommendation.datasetName}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Tabs defaultValue="details">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="details">Details</TabsTrigger>
                          <TabsTrigger value="content">Full Content</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="details" className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Agent</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {recommendation.agentName}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Dataset</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Database className="h-4 w-4" />
                                {recommendation.datasetName}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Timestamp</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(recommendation.timestamp)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Confidence</p>
                              <p className={`text-sm flex items-center gap-1 ${getConfidenceColor(recommendation.confidence)}`}>
                                <Percent className="h-4 w-4" />
                                {formatConfidence(recommendation.confidence)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Tags</p>
                            <div className="flex flex-wrap gap-1">
                              {recommendation.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="capitalize">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {recommendation.type === 'sentiment' && recommendation.content.analysis && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Analysis</p>
                              <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                {recommendation.content.analysis}
                              </p>
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="content" className="space-y-4 mt-4">
                          <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[400px] text-xs">
                            {JSON.stringify(recommendation.content, null, 2)}
                          </pre>
                        </TabsContent>
                      </Tabs>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" className="flex items-center gap-1">
                          <BarChart className="h-4 w-4" />
                          Visualize
                        </Button>
                        <Button className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
            <CardTitle className="text-base mt-2">{getRecommendationSummary(recommendation)}</CardTitle>
          </CardHeader>
          
          <CardContent className="pb-2 flex-grow">
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{recommendation.agentName}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Database className="h-3.5 w-3.5" />
                <span>{recommendation.datasetName}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{format(new Date(recommendation.timestamp), 'MMM d, yyyy')}</span>
              </div>
              <div className={`flex items-center gap-1 ${getConfidenceColor(recommendation.confidence)}`}>
                <Percent className="h-3.5 w-3.5" />
                <span>{formatConfidence(recommendation.confidence)}</span>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="pt-2 flex-shrink-0">
            <div className="flex flex-wrap gap-1 w-full">
              {recommendation.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs capitalize">
                  {tag}
                </Badge>
              ))}
              {recommendation.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{recommendation.tags.length - 3}
                </Badge>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}