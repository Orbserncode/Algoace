import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LogEntry } from '@/services/monitoring-service'; // Import type

interface ActivityLogProps {
  logs: LogEntry[];
  compact?: boolean;
}

export function ActivityLog({ logs, compact = false }: ActivityLogProps) {

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
        // Attempt to show time only, assuming logs are recent
        const date = new Date(timestamp);
        // Check if the date is valid before formatting
        if (isNaN(date.getTime())) {
             throw new Error("Invalid Date");
        }
        return date.toLocaleTimeString('en-US', {
         hour: '2-digit',
         minute: '2-digit',
         second: '2-digit',
         hour12: false, // Use 24-hour format for clarity
       });
     } catch (error) {
       // Fallback for invalid timestamps or if formatting fails
       return "??:??:??";
     }
   }

  return (
    <ScrollArea className={compact ? "h-[250px] w-full rounded-md border p-2" : "h-[400px] w-full rounded-md border p-4"}>
      <div className={compact ? "space-y-2" : "space-y-4"}>
         {logs.length === 0 && (
             <p className="text-center text-muted-foreground py-4">No recent activity.</p>
         )}
        {logs.map((log, index) => (
          <div key={index} className={compact ? "flex items-start space-x-2" : "flex items-start space-x-3"}>
             <span className={compact ? "text-[10px] text-muted-foreground w-12 shrink-0 pt-0.5 tabular-nums" : "text-xs text-muted-foreground w-16 shrink-0 pt-0.5 tabular-nums"}>
                {formatTimestamp(log.timestamp)}
             </span>
            <div className="flex-1 space-y-1">
                 <div className="flex items-center space-x-2 flex-wrap"> {/* Allow wrapping */}
                     <Badge variant={getTypeBadgeVariant(log.type)} className={compact ? "text-[10px] shrink-0 px-1 py-0" : "text-xs shrink-0"}> {/* Prevent badge shrinking */}
                        {log.type}
                    </Badge>
                    {log.strategy && log.strategy !== 'System' && !compact && (
                       <span className="text-xs font-medium text-muted-foreground truncate"> {/* Truncate long names */}
                         ({log.strategy})
                       </span>
                    )}
                 </div>
               <p className={cn(
                   compact ? "text-xs break-words line-clamp-1" : "text-sm break-words", // Allow long messages to wrap
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