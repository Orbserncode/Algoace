import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LogEntry {
  timestamp: string;
  type: 'Trade' | 'Signal' | 'System' | 'Error';
  message: string;
  strategy: string;
}

interface ActivityLogProps {
  logs: LogEntry[];
}

export function ActivityLog({ logs }: ActivityLogProps) {

   const getTypeBadgeVariant = (type: LogEntry['type']) => {
    switch (type) {
      case 'Trade':
        return 'default'; // Primary (Blue)
      case 'Signal':
        return 'secondary'; // Gray
      case 'System':
        return 'outline'; // Outline
       case 'Error':
         return 'destructive'; // Red
      default:
        return 'secondary';
    }
  };

   const formatTimestamp = (timestamp: string) => {
     try {
        return new Date(timestamp).toLocaleTimeString('en-US', {
         hour: '2-digit',
         minute: '2-digit',
         second: '2-digit',
       });
     } catch {
       return timestamp; // Fallback if parsing fails
     }
   }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {logs.map((log, index) => (
          <div key={index} className="flex items-start space-x-3">
             <span className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">
                {formatTimestamp(log.timestamp)}
             </span>
            <div className="flex-1 space-y-1">
                 <div className="flex items-center space-x-2">
                     <Badge variant={getTypeBadgeVariant(log.type)} className="text-xs">
                        {log.type}
                    </Badge>
                    {log.strategy !== 'System' && (
                       <span className="text-xs font-medium text-muted-foreground">
                         ({log.strategy})
                       </span>
                    )}
                 </div>
               <p className={cn(
                   "text-sm",
                   log.type === 'Error' ? 'text-destructive' : 'text-foreground'
               )}>
                   {log.message}
               </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
