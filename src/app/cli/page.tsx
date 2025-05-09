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

    // Handle 'clear' command first as it modifies state directly
    if (lowerCaseCommand === 'clear') {
        setOutput([{ id: Date.now(), text: 'Console cleared.', type: 'system' }]);
        // Return an object indicating no text to add to the current output flow
        return { id: Date.now(), text: '', type: 'system' };
    }
    // Handle commands with arguments
    else if (lowerCaseCommand.startsWith('start ')) {
      const strategyId = trimmedCommand.substring(6).trim(); // Get the ID after 'start '
      if (strategyId) {
          responseText = `Attempting to start strategy "${strategyId}"... Success.`;
          responseType = 'output';
      } else {
          responseText = `Error: Missing strategy ID for 'start' command.`;
          responseType = 'error';
      }
    } else if (lowerCaseCommand.startsWith('stop ')) {
      const strategyId = trimmedCommand.substring(5).trim(); // Get the ID after 'stop '
       if (strategyId) {
          responseText = `Attempting to stop strategy "${strategyId}"... Success.`;
          responseType = 'output';
       } else {
           responseText = `Error: Missing strategy ID for 'stop' command.`;
           responseType = 'error';
       }
    } else if (lowerCaseCommand.startsWith('status ')) {
        const strategyId = trimmedCommand.substring(7).trim();
        responseText = `Status for strategy "${strategyId}": Active`; // Example specific status
    } else if (lowerCaseCommand.startsWith('config ')) {
        const parts = trimmedCommand.substring(7).trim().split(' ');
        const key = parts[0];
        const value = parts.slice(1).join(' ');
        if (value) {
             responseText = `Setting config "${key}" to "${value}"... Success.`;
        } else if (key) {
             responseText = `Current value for config "${key}": [some_value]`; // Example view
        } else {
             responseText = `Error: Missing key for 'config' command.`;
             responseType = 'error';
        }
    }
    // Handle exact match commands
    else if (lowerCaseCommand === 'help') {
      responseText = `Available commands:\n  start <strategy_id>   - Start a strategy\n  stop <strategy_id>    - Stop a strategy\n  status [strategy_id] - Show status\n  list strategies     - List all strategies\n  list agents         - List all agents\n  config <key> [value] - View or set config\n  ssh info            - Show SSH access information\n  clear               - Clear the console\n  help                - Show this help message`;
    } else if (lowerCaseCommand === 'list strategies') {
      responseText = `Strategies:\n  strat-001: Momentum Burst (Active)\n  strat-002: Mean Reversion Scalper (Inactive)\n  strat-003: AI Trend Follower (Active)\n  strat-004: Arbitrage Finder (Debugging)`;
    } else if (lowerCaseCommand === 'list agents') {
      responseText = `Agents:\n  agent-001: Strategy Generator (Running)\n  agent-002: Execution Agent - Momentum (Running)\n  agent-003: Market Scanner (Running)\n  agent-004: Execution Agent - AI Trend (Idle)\n  agent-005: Risk Management Agent (Running)`;
    } else if (lowerCaseCommand === 'status') {
      responseText = `Platform Status: Running\nActive Strategies: 2\nAgents Running: 4\nErrors: 4`;
    } else if (lowerCaseCommand === 'ssh info') {
      responseText = `
SSH Access Information:
======================

Generate SSH Keys:
-----------------
# Linux/macOS Terminal
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/algoace_key

# Windows PowerShell
ssh-keygen -t ed25519 -C "your_email@example.com" -f "$env:USERPROFILE\\.ssh\\algoace_key"

# Windows Command Prompt
ssh-keygen -t ed25519 -C "your_email@example.com" -f "%USERPROFILE%\\.ssh\\algoace_key"

Secure Your Private Key:
-----------------------
# Linux/macOS Terminal
chmod 600 ~/.ssh/algoace_key

Connect to AlgoAce:
------------------
# Linux/macOS Terminal
ssh -i ~/.ssh/algoace_key user@algoace-server.example.com -p 2222

# Windows PowerShell
ssh -i "$env:USERPROFILE\\.ssh\\algoace_key" user@algoace-server.example.com -p 2222

# Windows Command Prompt
ssh -i "%USERPROFILE%\\.ssh\\algoace_key" user@algoace-server.example.com -p 2222

Add to SSH Config (for easier access):
-------------------------------------
# Add to ~/.ssh/config (Linux/macOS) or %USERPROFILE%\\.ssh\\config (Windows)
Host algoace
    HostName algoace-server.example.com
    User user
    Port 2222
    IdentityFile ~/.ssh/algoace_key
    IdentitiesOnly yes

# Then connect simply with:
ssh algoace

Security Best Practices:
-----------------------
1. Use strong passphrases for your SSH keys
2. Keep private keys secure and never share them
3. Use SSH key authentication only (password auth is disabled)
4. Server uses only modern, secure ciphers and protocols
5. SSH access is restricted by IP and uses fail2ban protection
6. All connections are logged and monitored

Remote Commands:
--------------
# Start a strategy
ssh algoace "algoace-cli start strat-001"

# Check system status
ssh algoace "algoace-cli status"

# View logs
ssh algoace "tail -f /var/log/algoace/system.log"
`;
    } else if (lowerCaseCommand === '') {
      responseText = ''; // No output for empty command
    }
    // Default case for unknown commands
    else {
      responseText = `Error: Command not found: "${command}"`;
      responseType = 'error';
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
