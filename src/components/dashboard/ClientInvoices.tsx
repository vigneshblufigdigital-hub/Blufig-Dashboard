import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Plus, 
  Search, 
  Calendar,
  Filter,
  CreditCard,
  Clock,
  Trash2,
  DollarSign,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
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
import { ClientInvoice, Project, UserRole, ADMIN_ROLES } from '@/src/types';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface ClientInvoicesProps {
  invoices: ClientInvoice[];
  projects: Project[];
  onAddInvoice: (invoice: ClientInvoice) => void;
  onRemoveInvoice: (id: string) => void;
}

export function ClientInvoices({ invoices, projects, onAddInvoice, onRemoveInvoice }: ClientInvoicesProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newInvoice, setNewInvoice] = useState<Partial<ClientInvoice>>({
    invoiceNumber: '',
    projectId: '',
    amount: 0,
    currency: 'USD',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  const filteredInvoices = invoices.filter(invoice => {
    const project = projects.find(p => p.id === invoice.projectId);
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (user?.role === UserRole.CLIENT) {
      // In a real app, filter by client projects. For demo, we'll show all.
      return matchesSearch && invoice.status !== 'Draft';
    }
    
    return matchesSearch;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddInvoice = () => {
    if (!newInvoice.invoiceNumber || !newInvoice.projectId || !newInvoice.amount) return;

    const invoiceToAdd: ClientInvoice = {
      ...newInvoice as ClientInvoice,
      id: 'inv-' + Math.random().toString(36).substr(2, 9),
      url: selectedFile ? URL.createObjectURL(selectedFile) : undefined
    };

    onAddInvoice(invoiceToAdd);
    setIsAddInvoiceOpen(false);
    setSelectedFile(null);
    setNewInvoice({
      invoiceNumber: '',
      projectId: '',
      amount: 0,
      currency: 'USD',
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-sans">Billing & Invoices</h1>
          <p className="text-zinc-500 text-sm font-medium">Manage and track project financials and client billing.</p>
        </div>

        {isAdmin && (
          <Dialog open={isAddInvoiceOpen} onOpenChange={(open) => {
            setIsAddInvoiceOpen(open);
            if (!open) setSelectedFile(null);
          }}>
            <DialogTrigger 
              render={
                <Button className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-6 h-11 font-bold text-xs uppercase tracking-widest shadow-lg shadow-zinc-200">
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Upload New Bill
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none">
              <DialogHeader className="px-6 pt-6 pb-4 bg-zinc-50/50 border-b border-zinc-100">
                <DialogTitle className="text-lg font-bold tracking-tight">Generate Client Invoice</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Invoice Number</Label>
                    <Input 
                      placeholder="INV-2024-001" 
                      className="rounded-xl border-zinc-200 h-10 focus-visible:ring-zinc-900"
                      value={newInvoice.invoiceNumber}
                      onChange={(e) => setNewInvoice({...newInvoice, invoiceNumber: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Project</Label>
                    <Select 
                      value={newInvoice.projectId} 
                      onValueChange={(v) => setNewInvoice({...newInvoice, projectId: v})}
                    >
                      <SelectTrigger className="rounded-xl border-zinc-200 h-10">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input 
                        type="number"
                        placeholder="0.00" 
                        className="pl-8 rounded-xl border-zinc-200 h-10"
                        value={newInvoice.amount || ''}
                        onChange={(e) => setNewInvoice({...newInvoice, amount: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Currency</Label>
                    <Select 
                      value={newInvoice.currency} 
                      onValueChange={(v) => setNewInvoice({...newInvoice, currency: v})}
                    >
                      <SelectTrigger className="rounded-xl border-zinc-200 h-10">
                        <SelectValue placeholder="USD" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Issue Date</Label>
                    <Input 
                      type="date"
                      className="rounded-xl border-zinc-200 h-10"
                      value={newInvoice.date}
                      onChange={(e) => setNewInvoice({...newInvoice, date: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Due Date</Label>
                    <Input 
                      type="date"
                      className="rounded-xl border-zinc-200 h-10"
                      value={newInvoice.dueDate}
                      onChange={(e) => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Bill Copy</Label>
                  <div className="relative group/upload">
                    <input 
                      type="file" 
                      id="invoice-file" 
                      className="hidden" 
                      onChange={handleFileChange}
                      accept=".pdf,.csv,.xls,.xlsx"
                    />
                    <label 
                      htmlFor="invoice-file"
                      className={cn(
                        "flex flex-col items-center justify-center w-full h-16 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                        selectedFile ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-900 transition-colors"
                      )}
                    >
                      {selectedFile ? (
                        <div className="flex items-center space-x-2 px-4 w-full">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <p className="text-[11px] font-bold text-emerald-700 truncate">{selectedFile.name}</p>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 px-4">
                          <UploadCloud className="w-4 h-4 text-zinc-400" />
                          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Select file</p>
                        </div>
                      )}
                    </label>
                    {selectedFile && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white shadow-md border"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedFile(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 py-4 bg-white border-t border-zinc-100 mt-0">
                <Button 
                  onClick={handleAddInvoice}
                  disabled={!newInvoice.invoiceNumber || !newInvoice.projectId || !newInvoice.amount}
                  className="w-full bg-zinc-900 text-white rounded-xl h-11 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-zinc-200 disabled:opacity-50"
                >
                  Finalize and Send
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
            placeholder="Search by invoice # or project..." 
            className="pl-9 rounded-xl border-zinc-200 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-xl border-zinc-200 h-11 px-4">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredInvoices.map((invoice) => {
          const project = projects.find(p => p.id === invoice.projectId);
          const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status === 'Pending';
          
          return (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="border-zinc-200 hover:border-zinc-300 transition-all rounded-xl group overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="p-6 flex-1 border-b md:border-b-0 md:border-r border-zinc-100">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                          <div className={cn(
                            "w-12 h-12 flex items-center justify-center rounded-2xl ring-4 ring-offset-2 transition-all",
                            invoice.status === 'Paid' ? "bg-emerald-50 text-emerald-600 ring-emerald-50/50" : 
                            isOverdue ? "bg-red-50 text-red-600 ring-red-50/50" :
                            "bg-zinc-100 text-zinc-600 ring-zinc-50/50"
                          )}>
                            <CreditCard className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-3">
                              <h3 className="font-bold text-lg tracking-tight text-zinc-900">{invoice.invoiceNumber}</h3>
                              <Badge className={cn(
                                "text-[9px] font-bold uppercase tracking-widest px-2 h-5 rounded-md",
                                invoice.status === 'Paid' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                isOverdue ? "bg-red-50 text-red-600 border border-red-100" :
                                "bg-zinc-100 text-zinc-500 border border-zinc-200"
                              )}>
                                {isOverdue ? 'Overdue' : invoice.status}
                              </Badge>
                            </div>
                            <p className="text-zinc-500 text-xs font-medium mt-0.5">{project?.name || 'Unknown Project'}</p>
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-1">
                          <span className="text-xl font-black text-zinc-900 tracking-tight">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
                          </span>
                          <div className="flex items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                            <Calendar className="w-3 h-3 mr-1" />
                            Due {new Date(invoice.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-50/50 p-4 md:w-48 flex md:flex-col items-center justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full md:w-auto flex-1 md:flex-none h-9 text-xs font-bold uppercase tracking-widest hover:bg-white border text-zinc-600 hover:text-zinc-900 transition-all rounded-lg"
                        onClick={() => invoice.url && window.open(invoice.url, '_blank')}
                      >
                        <Eye className="w-3.5 h-3.5 mr-2" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full md:w-auto flex-1 md:flex-none h-9 text-xs font-bold uppercase tracking-widest hover:bg-white border text-zinc-600 hover:text-zinc-900 transition-all rounded-lg">
                        <Download className="w-3.5 h-3.5 mr-2" />
                        PDF
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          onClick={() => onRemoveInvoice(invoice.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-100">
            <div className="p-4 bg-zinc-100 rounded-full mb-4">
              <DollarSign className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No invoices found</h3>
            <p className="text-zinc-400 text-xs mt-1">There are no financial documents available for display.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Card className="bg-emerald-50/30 border-emerald-100 rounded-xl overflow-hidden relative group hover:bg-emerald-50/50 transition-all">
          <CardContent className="p-6">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg w-fit mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 opacity-70">Paid to Date</p>
            <h4 className="text-2xl font-black text-emerald-950 mt-1">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0))}
            </h4>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/30 border-amber-100 rounded-xl overflow-hidden relative group hover:bg-amber-50/50 transition-all">
          <CardContent className="p-6">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg w-fit mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 opacity-70">Pending</p>
            <h4 className="text-2xl font-black text-amber-950 mt-1">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoices.filter(i => i.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0))}
            </h4>
          </CardContent>
        </Card>

        <Card className="bg-red-50/30 border-red-100 rounded-xl overflow-hidden relative group hover:bg-red-50/50 transition-all">
          <CardContent className="p-6">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg w-fit mb-4">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 opacity-70">Overdue</p>
            <h4 className="text-2xl font-black text-red-950 mt-1">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoices.filter(i => {
                const isOverdue = new Date(i.dueDate) < new Date() && i.status === 'Pending';
                return isOverdue;
              }).reduce((acc, curr) => acc + curr.amount, 0))}
            </h4>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
