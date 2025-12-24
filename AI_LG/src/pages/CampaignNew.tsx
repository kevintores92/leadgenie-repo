import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { Rocket, MessageCircle, Phone, Clock, Users, Loader2, Wallet, Upload, FileText, CheckCircle2 } from "lucide-react";
import * as api from "@/lib/api";
import { PRICING } from "@/config/pricing";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Pricing constants (imported from centralized config)
const SMS_COST = PRICING.SMS_COST;
const VOICE_COST_PER_MINUTE = PRICING.VOICE_COST_PER_MINUTE;
const ESTIMATED_CALL_DURATION_MINUTES = PRICING.ESTIMATED_CALL_DURATION_MINUTES;
const DLC_BRAND_REGISTRATION = PRICING.DLC_BRAND_REGISTRATION;
const DLC_CAMPAIGN_REGISTRATION = PRICING.DLC_CAMPAIGN_REGISTRATION;
const PHONE_NUMBER_COST = PRICING.PHONE_NUMBER_COST;
const PHONE_VALIDATION_COST = PRICING.PHONE_VALIDATION_COST;
const CONTACTS_PER_NUMBER = PRICING.CONTACTS_PER_NUMBER;
const ESTIMATED_HOT_LEAD_RATE = PRICING.ESTIMATED_HOT_LEAD_RATE;
const ESTIMATED_REPLY_RATE = PRICING.ESTIMATED_REPLY_RATE;
const DAILY_CAMPAIGN_LIMIT = PRICING.DAILY_CAMPAIGN_LIMIT;
const MONTHLY_SUBSCRIPTION = PRICING.MONTHLY_SUBSCRIPTION;

const csvFields = [
  "propertyAddress",
  "Unit #",
  "City",
  "State",
  "Zip",
  "County",
  "APN",
  "Owner Occupation",
  "Owner 1 First Name",
  "Owner 1 Last Name",
  "Owner 2 First Name",
  "Owner 2 Last Name"
];

const contactFields = [
  "-- Don't Import --",
  "name",
  "email",
  "phone1",
  "phone2",
  "phone3",
  "company",
  "address",
  "city",
  "state",
  "zip",
  "notes"
];

export default function CampaignNew() {
  const [campaignName, setCampaignName] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [scheduledStart, setScheduledStart] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  
  // List/Upload state
  const [listData, setListData] = useState<{
    totalRows: number;
    verifiedMobile: number;
    verifiedLandline: number;
    listName: string;
  } | null>(null);
  const [showUploadArea, setShowUploadArea] = useState(true);
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [showMapping, setShowMapping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validationProgress, setValidationProgress] = useState(0);
  
  // Modals
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showAreaCodeModal, setShowAreaCodeModal] = useState(false);
  const [showAIDisclosureModal, setShowAIDisclosureModal] = useState(false);
  const [pendingAreaCode, setPendingAreaCode] = useState("");

  // States requiring AI disclosure: CA, FL, NY, WA
  const AI_DISCLOSURE_STATES = ['CA', 'FL', 'NY', 'WA'];

  // Area code to state mapping (simplified - in production use a proper API)
  function getStateFromAreaCode(areaCode: string): string | null {
    const areaCodeMap: Record<string, string> = {
      '209': 'CA', '213': 'CA', '310': 'CA', '323': 'CA', '408': 'CA', '415': 'CA', '510': 'CA', '530': 'CA', '559': 'CA', '562': 'CA', '619': 'CA', '626': 'CA', '650': 'CA', '661': 'CA', '707': 'CA', '714': 'CA', '760': 'CA', '805': 'CA', '818': 'CA', '831': 'CA', '858': 'CA', '909': 'CA', '916': 'CA', '925': 'CA', '949': 'CA',
      '305': 'FL', '321': 'FL', '352': 'FL', '386': 'FL', '407': 'FL', '561': 'FL', '727': 'FL', '754': 'FL', '772': 'FL', '786': 'FL', '813': 'FL', '850': 'FL', '863': 'FL', '904': 'FL', '941': 'FL', '954': 'FL',
      '212': 'NY', '315': 'NY', '347': 'NY', '516': 'NY', '518': 'NY', '585': 'NY', '607': 'NY', '631': 'NY', '646': 'NY', '716': 'NY', '718': 'NY', '845': 'NY', '914': 'NY', '917': 'NY', '929': 'NY',
      '206': 'WA', '253': 'WA', '360': 'WA', '425': 'WA', '509': 'WA'
    };
    return areaCodeMap[areaCode] || null;
  }
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    loadWalletBalance();
    loadOrganization();
    
    // Check URL params for listId from upload page
    const params = new URLSearchParams(window.location.search);
    const listId = params.get('listId');
    
    if (listId) {
      loadListData(listId);
    }
  }, []);
  
  async function loadListData(listId: string) {
    try {
      const data = await api.getValidatedList(listId);
      setListData({
        totalRows: data.totalRows,
        verifiedMobile: data.verifiedMobile,
        verifiedLandline: data.verifiedLandline,
        listName: data.fileName
      });
      setShowUploadArea(false);
      // Auto-fill campaign name from list name
      if (!campaignName) {
        setCampaignName(data.fileName.replace('.csv', ''));
      }
    } catch (err) {
      console.error('Failed to load list data:', err);
      setError('Failed to load uploaded list');
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setUploadedFile(file);
      setShowMapping(true);
      // Initialize mappings
      const newMappings: Record<string, string> = {};
      csvFields.forEach(field => {
        newMappings[field] = "-- Don't Import --";
      });
      setMappings(newMappings);
    }
  };

  const handleMappingChange = (csvField: string, contactField: string) => {
    setMappings(prev => ({ ...prev, [csvField]: contactField }));
  };

  const handleContinue = async () => {
    if (!uploadedFile) return;
    
    setError("");
    setUploading(true);
    setShowMapping(false);
    
    try {
      // Step 1: Upload file to backend
      const uploadResult = await api.uploadContacts(uploadedFile);
      
      // Step 2: Extract phone numbers from uploaded data
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const phoneNumbers: string[] = [];
          
          // Extract phone numbers from CSV (assuming phone column exists)
          for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(',');
            // Find phone number columns (adjust based on your CSV structure)
            const phoneMatch = columns.join(',').match(/(\+?1?\s*\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4})/g);
            if (phoneMatch) {
              phoneNumbers.push(...phoneMatch);
            }
          }

          // Step 3: Validate phone numbers
          setValidating(true);
          setValidationProgress(0);
          
          const validationResults = await api.validatePhoneNumbers(phoneNumbers, (progress) => {
            setValidationProgress(progress);
          });
          
          setValidating(false);
          
          // Step 4: Create validated list
          const validatedList = await api.createValidatedList({
            fileName: fileName,
            totalRows: lines.length - 1,
            verifiedMobile: validationResults.filter(r => r.phoneType === 'mobile' && r.isValid).length,
            verifiedLandline: validationResults.filter(r => r.phoneType === 'landline' && r.isValid).length,
            validatedData: JSON.stringify({
              leads: [], // Would populate with mapped data
              validationResults,
              fieldMappings: mappings,
            }),
          });
          
          // Update state
          setListData({
            totalRows: validatedList.totalRows,
            verifiedMobile: validatedList.verifiedMobile,
            verifiedLandline: validatedList.verifiedLandline,
            listName: validatedList.fileName
          });
          setShowUploadArea(false);
          
          // Auto-fill campaign name
          if (!campaignName) {
            setCampaignName(fileName.replace('.csv', ''));
          }
          
        } catch (err: any) {
          setError(err.message || 'Failed to process uploaded file');
        } finally {
          setUploading(false);
          setValidating(false);
        }
      };
      
      reader.readAsText(uploadedFile);
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setUploading(false);
    }
  };

  async function loadWalletBalance() {
    try {
      setLoadingWallet(true);
      const data = await api.getWalletBalance();
      setWalletBalance(data.balance || 0);
    } catch (err) {
      console.error('Failed to load wallet:', err);
    } finally {
      setLoadingWallet(false);
    }
  }

  async function loadOrganization() {
    try {
      const org = await api.getOrganization();
      // Auto-fill area code from org or first brand
      if (org.areaCode) {
        setAreaCode(org.areaCode);
      } else if (org.brands && org.brands.length > 0 && org.brands[0].areaCode) {
        setAreaCode(org.brands[0].areaCode);
      }
      setIsInitialLoad(false);
    } catch (err) {
      console.error('Failed to load organization:', err);
      setIsInitialLoad(false);
    }
  }

  const calculateEstimatedCost = () => {
    if (!listData) {
      return {
        smsCost: "0.00",
        warmCallCost: "0.00",
        smsWarmTotal: "0.00",
        coldCallCost: "0.00",
        coldCallTotal: "0.00",
        smsPhoneNumbers: 0,
        voicePhoneNumbers: 0,
        smsPhoneNumbersCost: "0.00",
        voicePhoneNumbersCost: "0.00",
        total: "0.00",
        projectedReplies: 0,
        projectedPositiveReplies: 0,
        projectedWarmCalls: 0
      };
    }

    const { verifiedMobile, verifiedLandline } = listData;
    
    // SMS + Warm Calling Campaign Costs
    const smsCost = verifiedMobile * SMS_COST; // $0.025 per SMS
    const replyRate = 0.25; // 25% reply rate
    const positiveRate = 0.15; // 15% of replies are positive
    const warmCallCount = Math.round(verifiedMobile * replyRate * positiveRate);
    const warmCallCost = warmCallCount * VOICE_COST_PER_MINUTE; // $0.20/min per warm call
    
    // SMS phone numbers needed (1 per 250 contacts)
    const smsPhoneNumbers = Math.ceil(verifiedMobile / CONTACTS_PER_NUMBER);
    const smsPhoneNumbersCost = smsPhoneNumbers * PHONE_NUMBER_COST;
    const smsWarmTotal = smsCost + warmCallCost + smsPhoneNumbersCost;
    
    // Cold Calling Campaign Costs  
    const connectRate = 0.15; // 10-25%, using 15% as middle
    const avgTalkTime = 4; // 3-5 minutes average
    const connectedCalls = Math.round(verifiedLandline * connectRate);
    const coldCallMinutes = connectedCalls * avgTalkTime;
    const coldCallCost = coldCallMinutes * VOICE_COST_PER_MINUTE;
    
    // Voice phone numbers needed
    const voicePhoneNumbers = Math.ceil(verifiedLandline / CONTACTS_PER_NUMBER);
    const voicePhoneNumbersCost = voicePhoneNumbers * PHONE_NUMBER_COST;
    const coldCallTotal = coldCallCost + voicePhoneNumbersCost;
    
    // Projected Results
    const projectedReplies = Math.round(verifiedMobile * replyRate);
    const projectedPositiveReplies = Math.round(projectedReplies * positiveRate);
    
    const totalCost = smsWarmTotal + coldCallTotal;
    
    return {
      smsCost: smsCost.toFixed(2),
      warmCallCost: warmCallCost.toFixed(2),
      smsWarmTotal: smsWarmTotal.toFixed(2),
      coldCallCost: coldCallCost.toFixed(2),
      coldCallTotal: coldCallTotal.toFixed(2),
      smsPhoneNumbers,
      voicePhoneNumbers,
      smsPhoneNumbersCost: smsPhoneNumbersCost.toFixed(2),
      voicePhoneNumbersCost: voicePhoneNumbersCost.toFixed(2),
      total: totalCost.toFixed(2),
      projectedReplies,
      projectedPositiveReplies,
      projectedWarmCalls: warmCallCount
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!areaCode || areaCode.length !== 3) {
      setError("Please enter a valid 3-digit area code");
      return;
    }
    
    if (!listData) {
      setError("Please upload a contact list first");
      return;
    }
    
    const costs = calculateEstimatedCost();
    
    // Always allow launching - campaign will start when balance is sufficient
    // Show modal to inform about insufficient balance but still allow creation
    const hasSufficientBalance = walletBalance >= parseFloat(costs.total);
    if (!hasSufficientBalance && !scheduledStart) {
      setShowLaunchModal(true);
      // Don't return - allow creation but don't start immediately
    }
    
    setLoading(true);
    
    try {
      const campaignResponse = await api.createCampaign({
        name: campaignName,
        type: 'COLD_CALLING', // Set campaign type for AI cold calling
        estimatedContacts: listData.verifiedMobile + listData.verifiedLandline,
        areaCode: areaCode,
        scheduledStart: scheduledStart || null
      });
      
      // Only start immediately if not scheduled AND has sufficient balance
      if (!scheduledStart && hasSufficientBalance) {
        await api.startCampaign(campaignResponse.campaign.id);
      }
      
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  const costs = calculateEstimatedCost();

  return (
    <AppLayout>
      <div className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-600/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Create New Campaign</h1>
            <p className="text-muted-foreground">Set up and launch your campaign</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Campaign Configuration */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* List Selection/Upload Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-card rounded-2xl p-6 border border-purple-500/30"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
                    1
                  </div>
                  <h3 className="font-semibold">Contact List</h3>
                </div>

                {listData ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-semibold text-green-400">{listData.listName}</p>
                        <p className="text-xs text-muted-foreground">List uploaded and verified</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center text-sm">
                      <div className="bg-white/5 rounded p-2">
                        <div className="text-muted-foreground text-xs">Total</div>
                        <div className="font-bold">{listData.totalRows.toLocaleString()}</div>
                      </div>
                      <div className="bg-blue-500/10 rounded p-2">
                        <div className="text-blue-400 text-xs">Mobile</div>
                        <div className="font-bold text-blue-400">{listData.verifiedMobile.toLocaleString()}</div>
                      </div>
                      <div className="bg-purple-500/10 rounded p-2">
                        <div className="text-purple-400 text-xs">Landline</div>
                        <div className="font-bold text-purple-400">{listData.verifiedLandline.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ) : showMapping ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-semibold text-blue-400">{fileName}</p>
                        <p className="text-xs text-muted-foreground">File uploaded successfully</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Map CSV Columns to Contact Fields</h4>
                      <p className="text-sm text-muted-foreground">
                        Match your CSV columns to contact fields. `Phone 1` field is required.
                      </p>
                      
                      {csvFields.map((csvField) => (
                        <div key={csvField} className="flex items-center gap-3">
                          <div className="w-48 text-sm font-medium truncate">{csvField}</div>
                          <Select
                            value={mappings[csvField]}
                            onValueChange={(value) => handleMappingChange(csvField, value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                const selected = Object.values(mappings || {}).filter(v => v && v !== "-- Don't Import --");
                                return contactFields.map((field) => {
                                  const isSelectedElsewhere = field !== mappings[csvField] && selected.includes(field);
                                  return (
                                    <SelectItem key={field} value={field} disabled={isSelectedElsewhere}>
                                      {field}
                                    </SelectItem>
                                  );
                                });
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                      
                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowMapping(false);
                            setUploadedFile(null);
                            setFileName("");
                          }}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleContinue}
                          disabled={uploading || !Object.values(mappings).includes('phone1')}
                          className="flex-1"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Continue"
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {validating && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Validating phone numbers...</span>
                          <span>{validationProgress}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${validationProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">Upload your contact list (CSV format)</p>
                    <div className="space-y-3">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <Label
                        htmlFor="file-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Choose CSV File
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Supports CSV files with contact information
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Campaign Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-2xl p-6 border border-white/5"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                    2
                  </div>
                  <h3 className="font-semibold">Campaign Info</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaignName" className="text-sm font-medium">
                      Campaign Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="campaignName"
                      data-testid="input-campaign-name"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g., Ground Up - First Batch"
                      required
                      className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="areaCode" className="text-sm font-medium">
                      Area Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="areaCode"
                      data-testid="input-area-code"
                      value={areaCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                        if (!isInitialLoad && value !== areaCode && value.length === 3) {
                          const state = getStateFromAreaCode(value);
                          if (state && AI_DISCLOSURE_STATES.includes(state)) {
                            setPendingAreaCode(value);
                            setShowAIDisclosureModal(true);
                          } else {
                            setPendingAreaCode(value);
                            setShowAreaCodeModal(true);
                          }
                        } else {
                          setAreaCode(value);
                        }
                      }}
                      placeholder="e.g., 415, 212, 310"
                      required
                      maxLength={3}
                      pattern="[0-9]{3}"
                      className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                    />
                    <p className="text-xs text-muted-foreground">
                      📍 Choose an area code for your campaign phone numbers (e.g., 415 for San Francisco)
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Campaign Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-2xl p-6 border border-blue-500/30 border-solid"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
                    2
                  </div>
                  <h3 className="font-semibold">Automated Campaign</h3>
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Every campaign automatically runs both SMS and voice outreach. Mobile numbers receive SMS first, then warm calls for replies. Landlines get voice calls immediately.
                </div>

                {/* Campaign Flow Info */}
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-green-400">AI Voice Calls - Immediate</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Landline numbers receive AI voice calls immediately. Warm calls to mobile numbers that respond to SMS.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-blue-400">SMS Outreach - Delayed Start</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          SMS to mobile numbers begins after 10DLC approval (~2-5 days). All positive replies are automatically nurtured until qualified.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Schedule Campaign */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass-card rounded-2xl p-6 border border-orange-500/30"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400">
                    3
                  </div>
                  <h3 className="font-semibold">Schedule Campaign (Optional)</h3>
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Schedule your campaign to start at a future date and time. You'll still pay now, but outreach won't begin until the scheduled time.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledStart" className="text-sm font-medium">
                    Start Date & Time
                  </Label>
                  <Input
                    id="scheduledStart"
                    type="datetime-local"
                    data-testid="input-scheduled-start"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)} // At least 1 hour from now
                    className="glass-card border-white/10 focus:border-primary focus:bg-white/5"
                  />
                  <p className="text-xs text-muted-foreground">
                    ⏰ Leave empty to start immediately after launch. Minimum 1 hour from now.
                  </p>
                </div>
              </motion.div>

              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="button-back-campaign"
                  onClick={() => window.history.back()}
                  className="flex-1 border-white/10 hover:bg-white/5 h-11"
                >
                  Back
                </Button>
                <Button
                  data-testid="button-launch-campaign"
                  type="submit"
                  disabled={loading || !campaignName || !areaCode || areaCode.length !== 3 || loadingWallet}
                  className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    "Launch Campaign"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Panel - Campaign Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <div className="glass-card rounded-2xl p-6 border border-primary/30 sticky top-32">
              <h3 className="font-semibold mb-6 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">📊</span>
                Campaign Summary
              </h3>

              <div className="space-y-6">
                {/* Wallet Balance - Fully Clickable */}
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="w-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4 hover:border-green-500/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Wallet Balance
                    </span>
                    <span className="text-xs text-primary">Click to Add Funds</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {loadingWallet ? 'Loading...' : `$${walletBalance.toFixed(2)}`}
                  </div>
                </button>

                {/* List Stats */}
                {listData && (
                  <div className="border-b border-white/5 pb-4">
                    <div className="text-sm text-muted-foreground mb-3">Uploaded List</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Rows</span>
                        <span className="font-medium">{listData.totalRows.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> Verified Mobile
                        </span>
                        <span className="font-medium text-green-400">{listData.verifiedMobile.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Verified Landline
                        </span>
                        <span className="font-medium text-blue-400">{listData.verifiedLandline.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Estimated Cost */}
                <div className="border-b border-white/5 pb-4">
                  <div className="text-sm text-muted-foreground mb-3">Estimated Campaign Cost</div>
                  <div className="space-y-4 text-sm">
                    {/* SMS + Warm Calling Campaign */}
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs mb-2">
                        <MessageCircle className="w-3.5 h-3.5" />
                        SMS + Warm Calling Campaign
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">SMS Messages</span>
                        <span>${costs.smsCost}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Warm Calls ({costs.projectedWarmCalls} expected)</span>
                        <span>${costs.warmCallCost}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Phone Numbers ({costs.smsPhoneNumbers}x)</span>
                        <span>${costs.smsPhoneNumbersCost}</span>
                      </div>
                      <div className="border-t border-blue-500/20 pt-2 flex justify-between font-semibold">
                        <span>Subtotal</span>
                        <span className="text-blue-400">${costs.smsWarmTotal}</span>
                      </div>
                    </div>
                    
                    {/* Cold Calling Campaign */}
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-2">
                        <Phone className="w-3.5 h-3.5" />
                        Cold Calling Campaign
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Voice Calls (15% connect rate)</span>
                        <span>${costs.coldCallCost}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Phone Numbers ({costs.voicePhoneNumbers}x)</span>
                        <span>${costs.voicePhoneNumbersCost}</span>
                      </div>
                      <div className="border-t border-purple-500/20 pt-2 flex justify-between font-semibold">
                        <span>Subtotal</span>
                        <span className="text-purple-400">${costs.coldCallTotal}</span>
                      </div>
                    </div>
                    
                    {/* Total */}
                    <div className="border-t border-white/10 pt-2 flex justify-between">
                      <span className="font-semibold">Total Estimated Campaign Cost</span>
                      <span className="text-2xl font-bold text-green-400">${costs.total}</span>
                    </div>
                  </div>
                </div>

                {/* Number Recommendations */}
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <div className="text-sm font-semibold text-blue-400 mb-2">📞 Recommended Phone Numbers</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="font-medium mb-1">Cold Calling Number Ratios:</div>
                    <div>• 1–100 calls/hr → 1–2 voice numbers</div>
                    <div>• 100–500 calls/hr → 5–10 voice numbers</div>
                    <div>• 500–1,000 calls/hr → 15–30 voice numbers</div>
                    <div>• 5,000+/day → 50–100 voice numbers</div>
                    <div className="text-blue-300 mt-2 font-medium">⚠️ Do NOT use 1:1 ratio at scale - carriers flag unnatural patterns</div>
                  </div>
                </div>

                {/* Auto Campaign Split Info */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                  <div className="text-sm font-semibold text-purple-400 mb-2">🤖 Automatic Campaign Split</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• <span className="text-green-400">Mobile numbers</span> → SMS + Warm Calling Campaign</div>
                    <div>• <span className="text-blue-400">Landline numbers</span> → Cold Calling Campaign</div>
                    <div className="text-purple-300 mt-2">Auto-detected on upload, optimized for best results</div>
                  </div>
                </div>

                {/* Projected Results */}
                <div className="border-b border-white/5 pb-4">
                  <div className="text-sm text-muted-foreground mb-3">Projected Results</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Replies</span>
                      <span className="font-medium text-blue-400">{costs.projectedReplies.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Positive Replies</span>
                      <span className="font-medium text-green-400">{costs.projectedPositiveReplies.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Warm Calls</span>
                      <span className="font-medium text-amber-400">{costs.projectedWarmCalls.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Based on 25% reply rate, 15% positive replies from SMS campaign
                  </div>
                </div>

                {/* Auto Wallet Reload Suggestion */}
                {parseFloat(costs.total) > walletBalance && (
                  <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">⚠️</div>
                      <div>
                        <div className="font-semibold text-amber-400 mb-1">Insufficient Balance</div>
                        <div className="text-sm text-muted-foreground mb-3">
                          You need ${(parseFloat(costs.total) - walletBalance).toFixed(2)} more to fund this campaign.
                        </div>
                        <div className="text-xs text-amber-300 font-medium">
                          💡 Strongly Recommend: Enable Auto Wallet Reload to prevent campaign interruptions
                        </div>
                      </div>
                    </div>
                  </div>
                )}






              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Wallet Funding Modal */}
      <WalletFundingModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        currentBalance={walletBalance}
        suggestedAmount={Math.max(0, parseFloat(costs.total) - walletBalance)}
        onSuccess={loadWalletBalance}
      />
      
      {/* Launch Confirmation Modal */}
      <Dialog open={showLaunchModal} onOpenChange={setShowLaunchModal}>
        <DialogContent className="glass-card border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Wallet className="w-5 h-5" />
              Insufficient Balance
            </DialogTitle>
            <DialogDescription>
              Your wallet balance is lower than the estimated campaign cost.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaign Cost:</span>
                  <span className="font-semibold">${costs.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-semibold text-green-400">${walletBalance.toFixed(2)}</span>
                </div>
                <div className="border-t border-amber-500/30 pt-2 flex justify-between">
                  <span className="text-amber-300 font-semibold">Shortfall:</span>
                  <span className="font-bold text-amber-400">${Math.max(0, parseFloat(costs.total) - walletBalance).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              We recommend reloading your wallet now. However, you can still create the campaign - it won't send messages until your balance is sufficient.
            </p>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowLaunchModal(false);
                  handleSubmit(new Event('submit') as any);
                }}
                className="flex-1 border-white/10 hover:bg-white/5"
              >
                Create Campaign Anyway
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowLaunchModal(false);
                  setShowWalletModal(true);
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Reload Wallet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Area Code Change Modal */}
      <Dialog open={showAreaCodeModal} onOpenChange={setShowAreaCodeModal}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>Change Area Code</DialogTitle>
            <DialogDescription>
              Changing your area code will affect your phone numbers and campaigns. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/10">
              <h4 className="font-medium text-red-400 mb-2">⚠️ Switch Marketplace</h4>
              <p className="text-sm text-muted-foreground mb-3">
                This will release your current phone numbers and buy new ones in area code {pendingAreaCode}. 
                All active campaigns will be stopped, and you may lose data.
              </p>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    // Assume first brand for now
                    const org = await api.getOrganization();
                    const brandId = org.brands[0].id;
                    await api.switchAreaCode(brandId, pendingAreaCode, true);
                    setAreaCode(pendingAreaCode);
                    setShowAreaCodeModal(false);
                    alert('Area code switched successfully. Campaigns stopped.');
                  } catch (error) {
                    alert('Failed to switch area code: ' + error.message);
                  }
                }}
                className="w-full"
              >
                Switch Marketplace (Data Loss Warning)
              </Button>
            </div>

            <div className="p-4 border border-green-500/30 rounded-lg bg-green-500/10">
              <h4 className="font-medium text-green-400 mb-2">➕ Add New Marketplace</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Add area code {pendingAreaCode} as a new marketplace for $24/month. 
                This gives you 12 additional numbers without increasing daily limits.
              </p>
              <Button
                variant="default"
                onClick={async () => {
                  try {
                    await api.addMarketplace(pendingAreaCode);
                    setAreaCode(pendingAreaCode);
                    setShowAreaCodeModal(false);
                    alert('New marketplace added successfully.');
                  } catch (error) {
                    alert('Failed to add marketplace: ' + error.message);
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Add Marketplace ($24/month)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Disclosure Warning Modal */}
      <Dialog open={showAIDisclosureModal} onOpenChange={setShowAIDisclosureModal}>
        <DialogContent className="glass-card border-red-500/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              ⚠️ AI Disclosure Law Warning
            </DialogTitle>
            <DialogDescription>
              The area code you selected is in a state that requires AI disclosure for automated calls.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="space-y-3 text-sm">
                <div className="font-semibold text-red-400">Affected States: CA, FL, NY, WA</div>
                <div className="text-red-300">
                  <strong>Legal Requirement:</strong> You MUST disclose that this is an AI-assisted call at the beginning of every call.
                </div>
                <div className="text-red-300">
                  <strong>Required Disclosure:</strong> "This is an AI-assisted call..."
                </div>
                <div className="text-red-200 text-xs">
                  Failure to comply may result in fines, legal action, or service termination.
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              We strongly recommend against cold calling in these states due to strict AI disclosure laws and high compliance risk.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAIDisclosureModal(false);
                  setPendingAreaCode("");
                }}
                className="flex-1 border-white/10 hover:bg-white/5"
              >
                Choose Different Area Code
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setAreaCode(pendingAreaCode);
                  setShowAIDisclosureModal(false);
                  setPendingAreaCode("");
                  // Show area code change modal if needed
                  setShowAreaCodeModal(true);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                I Understand - Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
