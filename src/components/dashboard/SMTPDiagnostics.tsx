import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Settings, 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Send, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  Eye, 
  Trash2,
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { getApiUrl, safeFetch, safeStringify } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';

interface SMTPConfig {
  useCustom: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpSenderName: string;
}

interface SandboxEmail {
  id: string;
  recipient: string;
  recipientName?: string;
  sender: string;
  subject: string;
  text: string;
  html: string;
  status: "DELIVERED" | "SIMULATED" | "FAILED";
  errorDetails?: string;
  timestamp: string;
  type: string;
}

const PRESETS = [
  {
    id: 'hostinger',
    name: 'Hostinger Business',
    host: 'smtp.hostinger.com',
    port: '465',
    fromHint: 'Must match your authenticated email address',
    guide: 'Requires Hostinger secure TLS. Make sure to use the correct email account password.'
  },
  {
    id: 'gmail',
    name: 'Gmail App Password',
    host: 'smtp.gmail.com',
    port: '465',
    fromHint: 'Your Gmail address (e.g., example@gmail.com)',
    guide: 'Requires "2-Step Verification" enabled on your Google Account, and a 16-character "App Password" generated in security settings.'
  },
  {
    id: 'resend',
    name: 'Resend Gateway',
    host: 'smtp.resend.com',
    port: '465',
    fromHint: 'Registered/verified Resend domain address',
    guide: 'Use "resend" as SMTP username and your API key (re_...) as SMTP password.'
  },
  {
    id: 'sendgrid',
    name: 'SendGrid Pro',
    host: 'smtp.sendgrid.net',
    port: '465',
    fromHint: 'Verified Sender identity email address',
    guide: 'Use "apikey" as SMTP username and your SendGrid API key (SG....) as SMTP password.'
  }
];

export function SMTPDiagnostics() {
  const { user } = useAuth();
  const [config, setConfig] = useState<SMTPConfig>({
    useCustom: false,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    smtpSenderName: 'BluFig Operations Desk'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Test Dispatch state
  const [testRecipient, setTestRecipient] = useState(user?.email || 'vignesh@blufig.digital');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    attempts?: any[];
    error?: string;
    details?: any;
  } | null>(null);

  // Sync testRecipient with current user email when available
  useEffect(() => {
    if (user?.email) {
      setTestRecipient(user.email);
    }
  }, [user]);

  // Sandbox outbox state
  const [emails, setEmails] = useState<SandboxEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<SandboxEmail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'SIMULATED' | 'FAILED'>('ALL');

  // Load config from Firestore
  useEffect(() => {
    async function loadConfig() {
      try {
        const docRef = doc(db, 'settings', 'smtp_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as SMTPConfig);
        }
      } catch (err: any) {
        console.error("Error loading SMTP configuration from Firestore:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Listen to sandbox notifications history
  useEffect(() => {
    const colRef = collection(db, 'notifications_history');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emailList: SandboxEmail[] = [];
      snapshot.forEach((doc) => {
        emailList.push({ id: doc.id, ...doc.data() } as SandboxEmail);
      });
      setEmails(emailList);
    }, (error) => {
      console.error("Error subscribing to sandbox outbox:", error);
    });

    return () => unsubscribe();
  }, []);

  // Save config to Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const docRef = doc(db, 'settings', 'smtp_config');
      await setDoc(docRef, config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save configuration: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Test SMTP endpoint on backend
  const handleTestEmail = async () => {
    if (isTesting) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const data = await safeFetch(getApiUrl('/api/test-smtp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({
          to: testRecipient,
          customSmtp: config,
          forceCustomTest: true // Forces test route to use current draft fields
        })
      });

      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: "SMTP diagnostic check failed or returned an error.",
        error: err.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Trigger test delivery using a test Hostinger Preset
  const handleTestPresetDelivery = async () => {
    if (isTesting) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const data = await safeFetch(getApiUrl('/api/test-smtp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({
          to: testRecipient,
          useTestPreset: true
        })
      });

      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: "Preset SMTP delivery check failed.",
        error: err.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Delete individual logged email
  const handleDeleteEmail = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications_history', id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
    } catch (err: any) {
      console.error("Error deleting sandbox email:", err);
    }
  };

  // Apply Preset settings
  const applyPreset = (preset: typeof PRESETS[0]) => {
    setConfig(prev => ({
      ...prev,
      smtpHost: preset.host,
      smtpPort: preset.port,
      useCustom: true
    }));
  };

  const filteredEmails = emails.filter(email => {
    const queryLower = searchQuery.toLowerCase();
    const matchesSearch = 
      email.recipient.toLowerCase().includes(queryLower) ||
      (email.recipientName && email.recipientName.toLowerCase().includes(queryLower)) ||
      email.subject.toLowerCase().includes(queryLower) ||
      email.text.toLowerCase().includes(queryLower);

    if (statusFilter === 'ALL') return matchesSearch;
    return email.status === statusFilter && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <span className="text-zinc-500 text-sm font-medium">Loading SMTP Engine Configuration...</span>
      </div>
    );
  }

  return (
    <div id="smtp-diagnostics-view" className="space-y-8">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Server className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            SMTP & Mail Gateway Configuration
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 max-w-2xl">
            Manage your outgoing email settings. Configure real SMTP dispatchers or utilize the built-in, low-friction, high-fidelity Simulation Sandbox to monitor template outputs safely.
          </p>
        </div>
        
        {/* Toggle between custom SMTP and Sandbox Outbox */}
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {config.useCustom ? 'Custom SMTP Active' : 'Sandbox Simulation Active'}
            </span>
            <span className="text-[10px] text-zinc-400">
              {config.useCustom ? 'Routing via SMTP Gateway' : 'Zero-risk local logging'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, useCustom: !prev.useCustom }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              config.useCustom ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                config.useCustom ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Hand: SMTP Settings & Preset Actions */}
        <div className="lg:col-span-7 space-y-8">
          
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-400" />
                SMTP Configuration Form
              </h3>
              {config.useCustom && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-full border border-amber-100 dark:border-amber-900/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Custom Server Override
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              {/* Presets Grid */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                  Quick Load Server Preset
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`px-3 py-2.5 border text-left rounded-xl transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 flex flex-col justify-between h-20 cursor-pointer ${
                        config.smtpHost === preset.host
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/40'
                          : 'border-zinc-200 dark:border-zinc-800 bg-transparent'
                      }`}
                    >
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 line-clamp-1">
                        {preset.host}:{preset.port}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Server Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-8">
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    SMTP Host Address
                  </label>
                  <input
                    type="text"
                    value={config.smtpHost}
                    onChange={e => setConfig(prev => ({ ...prev, smtpHost: e.target.value, useCustom: true }))}
                    placeholder="e.g., smtp.gmail.com"
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none text-zinc-800 dark:text-zinc-100 transition-all placeholder:text-zinc-400"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    SMTP Port
                  </label>
                  <input
                    type="text"
                    value={config.smtpPort}
                    onChange={e => setConfig(prev => ({ ...prev, smtpPort: e.target.value, useCustom: true }))}
                    placeholder="465 (SSL) / 587 (TLS)"
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none text-zinc-800 dark:text-zinc-100 transition-all"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-zinc-400" />
                    Authentication Username
                  </label>
                  <input
                    type="text"
                    value={config.smtpUser}
                    onChange={e => setConfig(prev => ({ ...prev, smtpUser: e.target.value, useCustom: true }))}
                    placeholder="e.g., account@domain.com"
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none text-zinc-800 dark:text-zinc-100 transition-all placeholder:text-zinc-400"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-zinc-400" />
                    Authentication Password
                  </label>
                  <input
                    type="password"
                    value={config.smtpPass}
                    onChange={e => setConfig(prev => ({ ...prev, smtpPass: e.target.value, useCustom: true }))}
                    placeholder="••••••••••••••••••••"
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none text-zinc-800 dark:text-zinc-100 transition-all"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Sender Mask Email (From)
                  </label>
                  <input
                    type="email"
                    value={config.smtpFrom}
                    onChange={e => setConfig(prev => ({ ...prev, smtpFrom: e.target.value, useCustom: true }))}
                    placeholder="e.g., updates@blufig.digital"
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none text-zinc-800 dark:text-zinc-100 transition-all placeholder:text-zinc-400"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Leave empty to default to Authenticated Username.
                  </p>
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={config.smtpSenderName}
                    onChange={e => setConfig(prev => ({ ...prev, smtpSenderName: e.target.value, useCustom: true }))}
                    placeholder="e.g., BluFig Operations"
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none text-zinc-800 dark:text-zinc-100 transition-all"
                  />
                </div>
              </div>

              {/* Guide/Hint Banner based on current Host */}
              {PRESETS.find(p => config.smtpHost.includes(p.host)) && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-xl flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                      Configuration Note:
                    </span>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
                      {PRESETS.find(p => config.smtpHost.includes(p.host))?.guide}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  {saveSuccess && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Settings Saved successfully!
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Save Gateway Settings
                </button>
              </div>
            </form>
          </div>

          {/* Interactive Test Block */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-zinc-500" />
                Validate Gateway Connection
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Dispatch an immediate, real test transaction over the server settings drafted above, or check via the built-in system preset.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-3">
                <div className="w-full">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={e => setTestRecipient(e.target.value)}
                    placeholder="test-recipient@domain.com"
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-zinc-900 outline-none text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={isTesting || !config.smtpHost || !config.smtpUser || !config.smtpPass}
                    className="w-full px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title={(!config.smtpHost || !config.smtpUser || !config.smtpPass) ? "Provide Host, Username, and Password above to unlock test button." : ""}
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Test Draft Config
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPresetDelivery}
                    disabled={isTesting}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all flex items-center justify-center gap-1 bg-transparent cursor-pointer disabled:opacity-50"
                    title="Deliver a real email using BluFig's verification preset (Hostinger)"
                  >
                    Use test email preset
                  </button>
                </div>
              </div>
              
              {user?.email && testRecipient !== user.email && (
                <button
                  type="button"
                  onClick={() => setTestRecipient(user.email)}
                  className="text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1 mt-1 bg-transparent border-none cursor-pointer p-0"
                >
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  Set recipient to my email ({user.email})
                </button>
              )}
            </div>

            {/* Test Outcomes Display */}
            {testResult && (
              <div className={`p-4 rounded-xl border ${
                testResult.success 
                  ? 'bg-emerald-50/60 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-rose-50/60 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-300'
              } space-y-3`}>
                <div className="flex items-start gap-2.5">
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <span className="text-xs font-bold">
                      {testResult.success ? "Verification Test Succeeded! 🎉" : "Connection Validation Failed ❌"}
                    </span>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {testResult.message}
                    </p>
                  </div>
                </div>

                {/* Sub-Attempts Diagnostic Info */}
                {testResult.attempts && testResult.attempts.length > 0 && (
                  <div className="border-t border-zinc-200/40 dark:border-zinc-700/30 pt-2 space-y-1.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-70">
                      SMTP Routing Diagnostics log:
                    </span>
                    <div className="space-y-1">
                      {testResult.attempts.map((attempt, index) => (
                        <div key={index} className="text-[10px] font-mono flex items-center gap-1.5">
                          <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                          <span>Attempt {attempt.attempt}:</span>
                          <span className={attempt.success ? "text-emerald-600 font-bold" : "text-rose-600"}>
                            {attempt.success ? "Success" : "Failed"}
                          </span>
                          <span className="opacity-70 font-sans">
                            (Sender: {attempt.from} - {attempt.messageId || attempt.error})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw Error Details */}
                {testResult.error && (
                  <div className="bg-white/40 dark:bg-black/20 p-2.5 rounded-lg border border-red-100/30 text-[10px] font-mono whitespace-pre-wrap break-all text-rose-900 dark:text-rose-400">
                    {testResult.error}
                    {testResult.details && (
                      <div className="mt-1.5 pt-1.5 border-t border-rose-900/10 dark:border-rose-400/10">
                        {JSON.stringify(testResult.details, null, 2)}
                      </div>
                    )}
                  </div>
                )}

                {/* Helpful Troubleshooting tip for 535 / Authentication failures */}
                {testResult.error && (testResult.error.includes("535") || testResult.error.toLowerCase().includes("auth") || testResult.error.toLowerCase().includes("login")) && (
                  <div className="mt-3 p-3 bg-zinc-900 text-zinc-100 rounded-xl space-y-2 border border-zinc-800 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>SMTP 535 Troubleshooting Guide</span>
                    </div>
                    <p className="opacity-90 leading-relaxed">
                      A <strong>535 Authentication Failed</strong> error means Hostinger's mail server rejected your login credentials.
                    </p>
                    <ul className="list-disc list-inside space-y-1 opacity-80 pl-1 font-medium">
                      <li><strong>If you cannot see the email in hPanel:</strong> The email account has not been created under this domain, or it is in a different Hostinger profile. You must first create the email account in Hostinger.</li>
                      <li><strong>Bypass/Block this error:</strong> If you want to use the app without any SMTP setup, turn off the <strong>'Use Custom SMTP Configuration'</strong> toggle at the top. The app will instantly bypass SMTP and safely route all password resets and notifications to the <strong>In-App Sandbox Outbox</strong> on the right!</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Hand: In-App Email Outbox Sandbox */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[660px]">
            
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3 bg-zinc-50 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  In-App Sandbox Outbox
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">
                  {filteredEmails.length} logged
                </span>
              </div>
              
              {/* Filter Row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search outbox..."
                  className="flex-1 text-[11px] font-medium px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
                />
                
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="text-[11px] font-bold px-2 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="SIMULATED">Simulated</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>

            {/* Email List container */}
            <div className="overflow-y-auto flex-1 divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Mail className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2.5" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Outbox is currently empty</span>
                  <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                    Trigger a task assignment or password reset email to view records here.
                  </p>
                </div>
              ) : (
                filteredEmails.map(email => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3.5 text-left transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 cursor-pointer flex gap-3 ${
                      selectedEmail?.id === email.id ? 'bg-zinc-50 dark:bg-zinc-900' : 'bg-transparent'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {email.status === 'DELIVERED' && (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center" title="Real email successfully delivered via SMTP.">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        </div>
                      )}
                      {email.status === 'SIMULATED' && (
                        <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center" title="SMTP not configured. Email logged in-app only.">
                          <Info className="w-3 h-3 text-zinc-500" />
                        </div>
                      )}
                      {email.status === 'FAILED' && (
                        <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center" title="SMTP gateway active, but dispatch failed. Captured in outbox.">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                          {email.recipientName || email.recipient}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                          {new Date(email.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 truncate">
                        {email.subject}
                      </p>
                      
                      <p className="text-[10px] text-zinc-400 line-clamp-1">
                        {email.text}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span>{email.type}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteEmail(email.id, e)}
                          className="text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Email full render Modal */}
      <AnimatePresence>
        {selectedEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full mb-1">
                    {selectedEmail.type}
                  </span>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedEmail.subject}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="w-8 h-8 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Envelope meta details */}
              <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-4 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold block text-[10px] text-zinc-400">TO RECIPIENT</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {selectedEmail.recipientName ? `${selectedEmail.recipientName} <${selectedEmail.recipient}>` : selectedEmail.recipient}
                  </span>
                </div>
                <div>
                  <span className="font-semibold block text-[10px] text-zinc-400">FROM SENDER</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {selectedEmail.sender}
                  </span>
                </div>
                <div>
                  <span className="font-semibold block text-[10px] text-zinc-400">DISPATCH TIMESTAMP</span>
                  <span>{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-semibold block text-[10px] text-zinc-400">STATUS GATEWAY</span>
                  <span className={`font-bold inline-flex items-center gap-1 ${
                    selectedEmail.status === 'DELIVERED' 
                      ? 'text-emerald-600' 
                      : selectedEmail.status === 'FAILED'
                        ? 'text-rose-600'
                        : 'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {selectedEmail.status}
                  </span>
                </div>
              </div>

              {/* Email Content Frame */}
              <div className="flex-1 overflow-y-auto bg-zinc-100/50 dark:bg-zinc-900/20 p-5 min-h-[300px]">
                {selectedEmail.errorDetails && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-800 font-medium">
                    <span className="font-bold block text-xs mb-0.5">Delivery Blocked Error Details:</span>
                    {selectedEmail.errorDetails}
                  </div>
                )}
                
                {/* Embedded HTML preview inside safe iFrame or raw div */}
                <div 
                  className="bg-white border border-zinc-200 rounded-xl shadow-inner p-4 max-w-full overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                />
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close Outbox Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
