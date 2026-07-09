import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function TimeTracker() {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [activeTask, setActiveTask] = useState({ 
    id: 't1', 
    name: 'Monthly SEO Audit', 
    project: 'Acme Corp Retainer' 
  });

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((seconds) => seconds + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={cn(
      "border-none shadow-xl overflow-hidden transition-all duration-500",
      isActive ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"
    )}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
            isActive ? "bg-zinc-800 text-brand-secondary" : "bg-zinc-100 text-zinc-400"
          )}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              isActive ? "text-zinc-500" : "text-zinc-400"
            )}>
              {isActive ? "Currently Tracking" : "Timer Paused"}
            </p>
            <div className="flex items-center space-x-2">
              <p className="text-sm font-bold truncate max-w-[150px]">{activeTask.name}</p>
              <Badge variant="outline" className={cn(
                "text-[9px] border-none",
                isActive ? "bg-zinc-800 text-zinc-400" : "bg-zinc-50"
              )}>
                {activeTask.project}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className={cn(
              "font-mono text-2xl font-medium tracking-tighter leading-none",
              isActive ? "text-white" : "text-zinc-900"
            )}>
              {formatTime(seconds)}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {!isActive ? (
              <Button 
                onClick={() => setIsActive(true)} 
                size="icon" 
                className="rounded-full bg-brand-secondary hover:bg-orange-600 text-white shadow-lg shadow-orange-200"
              >
                <Play className="w-4 h-4 fill-current" />
              </Button>
            ) : (
              <Button 
                onClick={() => setIsActive(false)} 
                size="icon" 
                variant="outline"
                className="rounded-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
              >
                <Pause className="w-4 h-4 fill-current" />
              </Button>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              className={cn(
                "rounded-full",
                isActive ? "text-zinc-500 hover:text-white" : "text-zinc-300"
              )}
              onClick={() => {
                setIsActive(false);
                setSeconds(0);
              }}
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
