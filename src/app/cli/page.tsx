'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Terminal, ChevronRight, Server } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface OutputLine {
  id: number;
  text: string;
  type: 'input' | 'output' | 'error' | 'system';
}

export default function CliPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<OutputLine[]>([
    { id: 0, text: 'AlgoAce Trader CLI Initialized. Type "help" for commands.', type: 'system' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Mock command processing
  const processCommand = async (command: string): Promise<OutputLine> => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500)); // Simulate async processing
    setIsProcessing(false);

    const trimmedCommand = command.trim();
    const lowerCaseCommand = trimmedCommand.toLowerCase();
    let responseText = '';
    let responseType: OutputLine['type'] = 'output';

    // Handle commands with arguments first
    if (lowerCaseCommand.startsWith('start ')) {
      const strategyId = trimmedCommand.substring(6).trim(); // Get the ID after 'start '
      responseText = strategyId
        ? `Attempting to start strategy "${strategyId}"... Success.`
        : `Error: Missing strategy ID for 'start' command.`;
      responseType = strategyId ? 'output' : 'error';
    } else if (lowerCaseCommand.startsWith('stop ')) {
      const strategyId = trimmedCommand.substring(5).trim(); // Get the ID after 'stop '
      responseText = strategyId
        ? `Attempting to stop strategy "${strategyId}"... Success.`
        : `Error: Missing strategy ID for 'stop' command.`;
       responseType = strategyId ? 'output' : 'error';
    } else {
      // Handle exact match commands
      switch (lowerCaseCommand) {
        case 'help':
          responseText = `Available commands:\n  start <strategy_id>   - Start a strategy\n  stop <strategy_id>    - Stop a strategy\n  status [strategy_id] - Show status\n  list strategies     - List all strategies\n  list agents         - List all agents\n  config <key> [value] - View or set config\n  clear               - Clear the console\n  help                - Show this help message`;
          break;
        case 'list strategies':
          responseText = `Strategies:\n  strat-001: Momentum Burst (Active)\n  strat-002: Mean Reversion Scalper (Inactive)\n  strat-003: AI Trend Follower (Active)\n  strat-004: Arbitrage Finder (Debugging)`;
          break;
        case 'list agents':
          responseText = `Agents:\n  agent-001: Strategy Generator (Running)\n  agent-002: Execution Agent - Momentum (Running)\n  agent-003: Market Scanner (Running)\n  agent-004: Execution Agent - AI Trend (Idle)\n  agent-005: Risk Management Agent (Running)`;
          break;
        case 'status':
          responseText = `Platform Status: Running\nActive Strategies: 2\nAgents Running: 4\nErrors: 4`;
          break;
        case 'clear':
          setOutput([{ id: Date.now(), text: 'Console cleared.', type: 'system' }]);
          // Return immediately as setOutput handles the message
          return { id: Date.now(), text: '', type: 'system' };
        case '':
          responseText = ''; // No output for empty command
          break;
        default:
          responseText = `Error: Command not found: "${command}"`;
          responseType = 'error';
          break;
      }
    }
    return { id: Date.now(), text: responseText, type: responseType };
  };


  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const command = input;
    setInput(''); // Clear input field immediately

    // Add input to output
    const inputLine: OutputLine = { id: Date.now(), text: command, type: 'input' };
    setOutput(prev => [...prev, inputLine]);

    // Process command and add output
    const responseLine = await processCommand(command);
    // Only add response if it has text (handles 'clear' command correctly)
    if (responseLine.text) {
        setOutput(prev => [...prev, responseLine]);
    }

    // Focus input after processing
     inputRef.current?.focus();
  };

   // Scroll to bottom when output changes
   useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [output]);

   // Focus input on initial load
   useEffect(() => {
     inputRef.current?.focus();
   }, []);

  return (
    <Card className="h-[calc(100vh-10rem)] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-6 w-6" /> CLI Control
        </CardTitle>
        <CardDescription>Interact with the AlgoAce Trader platform using commands. Type "help" for options.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-2 font-mono text-sm">
            {output.map((line) => (
              <div key={line.id} className={cn(
                 {'text-muted-foreground': line.type === 'system'},
                 {'text-destructive': line.type === 'error'},
              )}>
                 {line.type === 'input' && <span className="text-accent mr-1"><ChevronRight className="inline h-4 w-4" /></span>}
                 {/* Use pre-wrap to preserve whitespace like newlines from 'help' command */}
                 <span className="whitespace-pre-wrap break-words">{line.text}</span>
              </div>
            ))}
             {isProcessing && (
                 <div className="flex items-center gap-1 text-muted-foreground animate-pulse">
                     <Server className="h-3 w-3"/> Processing...
                 </div>
             )}
          </div>
        </ScrollArea>
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2 border-t p-4">
          <span className="text-muted-foreground"><ChevronRight className="h-5 w-5" /></span>
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Enter command..."
            className="flex-1 font-mono"
            disabled={isProcessing}
            autoComplete="off" // Prevent browser autocomplete
          />
          <Button type="submit" disabled={isProcessing || !input.trim()}>
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
