import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Plus, 
  Search, 
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  BarChart3,
  Paperclip,
  UploadCloud,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientReport, Project, UserRole, ADMIN_ROLES } from '@/src/types';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface ClientReportsProps {
  reports: ClientReport[];
  projects: Project[];
  onAddReport: (report: ClientReport) => void;
  onRemoveReport: (id: string) => void;
}

export function ClientReports({ reports, projects, onAddReport, onRemoveReport }: ClientReportsProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddReportOpen, setIsAddReportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newReport, setNewReport] = useState<Partial<ClientReport>>({
    title: '',
    projectId: '',
    type: 'Monthly',
    status: 'Published',
    date: new Date().toISOString().split('T')[0]
  });

  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (user?.role === UserRole.CLIENT) {
      return matchesSearch && report.status === 'Published';
    }
    
    return matchesSearch;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddReport = () => {
    if (!newReport.title || !newReport.projectId) return;

    const reportToAdd: ClientReport = {
      ...newReport as ClientReport,
      id: 'rep-' + Math.random().toString(36).substr(2, 9),
      fileName: selectedFile?.name,
      url: selectedFile ? URL.createObjectURL(selectedFile) : undefined
    };

    onAddReport(reportToAdd);
    setIsAddReportOpen(false);
    setSelectedFile(null);
    setNewReport({
      title: '',
      projectId: '',
      type: 'Monthly',
      status: 'Published',
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-sans">Project Reports</h1>
          <p className="text-zinc-500 text-sm font-medium">View and manage performance reports and deliverables.</p>
        </div>

        {isAdmin && (
          <Dialog open={isAddReportOpen} onOpenChange={(open) => {
            setIsAddReportOpen(open);
            if (!open) setSelectedFile(null);
          }}>
            <DialogTrigger 
              render={
                <Button className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-6 h-11 font-bold text-xs uppercase tracking-widest shadow-lg shadow-zinc-200">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit New Report
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none">
              <DialogHeader className="px-6 pt-6 pb-4 bg-zinc-50/50 border-b border-zinc-100">
                <DialogTitle className="text-lg font-bold tracking-tight">Submit Client Report</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Report Title</Label>
                  <Input 
                    placeholder="e.g. May Performance Analysis" 
                    className="rounded-xl border-zinc-200 h-10 focus-visible:ring-zinc-900"
                    value={newReport.title}
                    onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Select Project</Label>
                    <Select 
                      value={newReport.projectId} 
                      onValueChange={(v) => setNewReport({...newReport, projectId: v})}
                    >
                      <SelectTrigger className="rounded-xl border-zinc-200 h-10">
                        <SelectValue placeholder="Project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Frequency</Label>
                    <Select 
                      value={newReport.type} 
                      onValueChange={(v) => setNewReport({...newReport, type: v as any})}
                    >
                      <SelectTrigger className="rounded-xl border-zinc-200 h-10">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Publication Date</Label>
                  <Input 
                    type="date"
                    className="rounded-xl border-zinc-200 h-10"
                    value={newReport.date}
                    onChange={(e) => setNewReport({...newReport, date: e.target.value})}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Document Attachment</Label>
                  <div className="relative group/upload">
                    <input 
                      type="file" 
                      id="report-file" 
                      className="hidden" 
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                    />
                    <label 
                      htmlFor="report-file"
                      className={cn(
                        "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                        selectedFile ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-900 transition-colors"
                      )}
                    >
                      {selectedFile ? (
                        <div className="flex items-center space-x-3 px-4">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-700 truncate">{selectedFile.name}</p>
                            <p className="text-[9px] text-emerald-600/60 uppercase font-black">Click to change</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3 px-4">
                          <UploadCloud className="w-5 h-5 text-zinc-400 group-hover/upload:text-zinc-900 transition-colors" />
                          <div>
                            <p className="text-xs font-bold text-zinc-600 group-hover/upload:text-zinc-900 transition-colors">Select report file</p>
                            <p className="text-[10px] text-zinc-400">PDF, Excel, or Word</p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 py-4 bg-white border-t border-zinc-100 mt-0">
                <Button 
                  onClick={handleAddReport}
                  disabled={!newReport.title || !newReport.projectId}
                  className="w-full bg-zinc-900 text-white rounded-xl h-11 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-zinc-200 disabled:opacity-50"
                >
                  Publish Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search reports..." 
            className="pl-9 rounded-xl border-zinc-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-xl border-zinc-200">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => {
          const project = projects.find(p => p.id === report.projectId);
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-zinc-200 hover:shadow-md transition-all group overflow-hidden rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <Badge className={cn(
                      "text-[9px] font-bold uppercase tracking-widest px-2 h-5",
                      report.status === 'Published' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-zinc-100 text-zinc-500"
                    )}>
                      {report.status}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <CardTitle className="text-base font-bold tracking-tight">{report.title}</CardTitle>
                    <CardDescription className="text-xs font-medium text-zinc-500 mt-1">
                      {project?.name || 'Multi-Project'} • {report.type}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-zinc-500 space-x-4 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                      {new Date(report.date).toLocaleDateString()}
                    </div>
                    {report.fileName && (
                      <div className="flex items-center text-emerald-600 font-bold">
                        <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                        {report.fileName.length > 15 ? report.fileName.substring(0, 12) + '...' : report.fileName}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-zinc-50 text-zinc-900 hover:bg-zinc-100 border-none shadow-none font-bold text-[10px] h-9 uppercase tracking-widest"
                      onClick={() => report.url && window.open(report.url, '_blank')}
                    >
                      <Eye className="w-3.5 h-3.5 mr-2" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 w-9 rounded-lg border-zinc-200 p-0">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    {isAdmin && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-9 w-9 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => onRemoveReport(report.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredReports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-100">
          <div className="p-4 bg-zinc-100 rounded-full mb-4">
            <BarChart3 className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No reports found</h3>
          <p className="text-zinc-400 text-xs mt-1">Try adjusting your filters or check back later.</p>
        </div>
      )}
    </div>
  );
}
