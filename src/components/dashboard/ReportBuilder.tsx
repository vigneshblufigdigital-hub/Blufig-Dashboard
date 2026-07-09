import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Download, 
  Share2, 
  Plus, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function ReportBuilder() {
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-brand-secondary/10 rounded-2xl">
            <BarChart3 className="w-6 h-6 text-brand-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Performance Report Builder</h3>
            <p className="text-sm text-zinc-400 font-medium">Monthly Performance Analysis • Acme Corp</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="font-bold uppercase tracking-tighter text-[10px]">
            <Download className="w-3 h-3 mr-2" /> Export PDF
          </Button>
          <Button size="sm" className="bg-zinc-900 text-white font-bold uppercase tracking-tighter text-[10px]">
            <Share2 className="w-3 h-3 mr-2" /> Publish to Portal
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="flex bg-zinc-50 border-b">
          <div className="flex-1 flex p-1">
             <Button variant="ghost" className="text-xs font-bold uppercase tracking-tighter h-8 bg-white shadow-sm">Metrics</Button>
             <Button variant="ghost" className="text-xs font-bold uppercase tracking-tighter h-8 text-zinc-400">Commentary</Button>
             <Button variant="ghost" className="text-xs font-bold uppercase tracking-tighter h-8 text-zinc-400">Assets</Button>
          </div>
          <div className="p-1">
             <Button variant="outline" className="text-xs h-8 px-4" onClick={() => setIsGenerating(true)}>
               {isGenerating ? "Refreshing Data..." : "Auto-Fetch Platforms"}
             </Button>
          </div>
        </div>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricsGroup 
              title="Paid Search" 
              platform="Google Ads"
              metrics={[
                { label: 'Spend', value: '$4,250.00', change: '+12%', trend: 'up' },
                { label: 'Conversions', value: '142', change: '+8%', trend: 'up' },
                { label: 'CPA', value: '$29.90', change: '-5%', trend: 'down' }
              ]} 
            />
            <MetricsGroup 
              title="Paid Social" 
              platform="LinkedIn"
              metrics={[
                { label: 'Spend', value: '$2,800.00', change: '+5%', trend: 'up' },
                { label: 'Leads', value: '42', change: '-2%', trend: 'down' },
                { label: 'CPL', value: '$66.60', change: '+7%', trend: 'up' }
              ]} 
              warning="CPL exceeds target baseline"
            />
            <MetricsGroup 
              title="SEO Organic" 
              platform="Search Console"
              metrics={[
                { label: 'Impressions', value: '820K', change: '+15%', trend: 'up' },
                { label: 'Clicks', value: '24.5K', change: '+10%', trend: 'up' },
                { label: 'Avg Position', value: '14.2', change: '+2.1', trend: 'up' }
              ]} 
            />
          </div>

          <div className="mt-8 pt-8 border-t space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Strategic Commentary</h4>
            <div className="bg-zinc-50 rounded-xl p-4 border border-dashed border-zinc-200 min-h-[150px] text-zinc-400 text-sm italic">
              AI analysis results: Performance remains strong across Google Ads. Higher LinkedIn CPL is attributed to more restrictive target account list filtering in May. Recommended action: Expand lookalike audiences for Q3 targeting.
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="text-xs">
                Edit Commentary
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricsGroup({ title, platform, metrics, warning }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold tracking-tight">{title}</h4>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none mt-1">{platform}</p>
        </div>
        {warning && <AlertTriangle className="w-4 h-4 text-orange-500" />}
      </div>
      
      <div className="space-y-px bg-zinc-100 rounded-lg overflow-hidden border">
        {metrics.map((m: any) => (
          <div key={m.label} className="flex justify-between bg-white p-3">
             <span className="text-xs font-semibold text-zinc-500">{m.label}</span>
             <div className="text-right">
                <p className="text-sm font-bold leading-none">{m.value}</p>
                <span className={cn(
                  "text-[9px] font-bold",
                  m.trend === 'up' ? "text-emerald-500" : "text-red-500"
                )}>
                  {m.change}
                </span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
