import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Rocket, MessageCircle, Phone, Clock, Users, Loader2, Wallet } from "lucide-react";
import * as api from "@/lib/api";
import { PRICING } from "@/config/pricing";

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

export default function CampaignNew() {
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("SMS");
  const [phoneNumbers, setPhoneNumbers] = useState(1000);
  const [areaCode, setAreaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  useEffect(() => {
    loadWalletBalance();
  }, []);

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

  const calculateEstimatedCost = () => {
    let costPerContact = 0;
    
    // Calculate cost per contact based on campaign type
    if (campaignType === "SMS") {
      costPerContact = SMS_COST;
    } else {
      // Voice: Per-minute pricing includes AI + carrier costs
      costPerContact = VOICE_COST_PER_MINUTE * ESTIMATED_CALL_DURATION_MINUTES;
    }
    
    // Apply daily campaign limit: max 2000 contacts per brand per day
    const contactsToday = Math.min(phoneNumbers, DAILY_CAMPAIGN_LIMIT);
    const contactsQueuedForLater = Math.max(0, phoneNumbers - DAILY_CAMPAIGN_LIMIT);
    
    // Calculate number of phone numbers needed for rotation (based on today's sends only)
    const numbersNeeded = Math.ceil(contactsToday / CONTACTS_PER_NUMBER);
    
    // Calculate all costs (based on today's sends only)
    const messagingCost = contactsToday * costPerContact;
    const phoneNumbersCost = numbersNeeded * PHONE_NUMBER_COST;
    const validationCost = 0; // Phone validation is now free // Validate all numbers upfront
    const dlcFees = DLC_BRAND_REGISTRATION + DLC_CAMPAIGN_REGISTRATION;
    
    // Calculate projected leads (based on today's sends)
    const projectedReplies = Math.round(contactsToday * ESTIMATED_REPLY_RATE);
    const projectedHotLeads = Math.round(contactsToday * ESTIMATED_HOT_LEAD_RATE);
    
    const totalCost = messagingCost + phoneNumbersCost + validationCost + dlcFees;
    
    return {
      messagingCost: messagingCost.toFixed(2),
      phoneNumbersCost: phoneNumbersCost.toFixed(2),
      validationCost: validationCost.toFixed(2),
      dlcFees: dlcFees.toFixed(2),
      total: totalCost.toFixed(2),
      numbersNeeded,
      projectedReplies,
      projectedHotLeads,
      contactsToday,
      contactsQueuedForLater
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!areaCode || areaCode.length !== 3) {
      setError("Please enter a valid 3-digit area code");
      return;
    }
    
    const costs = calculateEstimatedCost();
    if (walletBalance < parseFloat(costs.total)) {
      setError("Insufficient wallet balance. Please top up your account.");
      return;
    }
    
    setLoading(true);
    
    try {
      await api.createCampaign({
        name: campaignName,
        type: campaignType,
        estimatedContacts: phoneNumbers,
        areaCode: areaCode
      });
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
              {/* Campaign Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-2xl p-6 border border-white/5"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                    1
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
                        setAreaCode(value);
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

              {/* Campaign Type */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-2xl p-6 border border-blue-500/30 border-solid"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
                    2
                  </div>
                  <h3 className="font-semibold">Campaign Type</h3>
                </div>

                <Tabs value={campaignType} onValueChange={setCampaignType} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 border border-white/10 p-1 rounded-lg">
                    <TabsTrigger 
                      value="SMS" 
                      className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-md text-xs sm:text-sm"
                      data-testid="tab-sms"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      SMS + Warm Calling
                    </TabsTrigger>
                    <TabsTrigger 
                      value="Cold Calling" 
                      className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-md text-xs sm:text-sm"
                      data-testid="tab-cold-calls"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Cold Calling
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="SMS" className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      SMS campaign with AI-powered responses and warm calling for engaged leads.
                    </div>
                  </TabsContent>

                  <TabsContent value="Cold Calling" className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Cold calling campaigns with AI voice agents for landline optimization. <span className="font-semibold text-amber-400">Landlines only</span> - mobile numbers will be queued for SMS once 10DLC is approved.
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Campaign Flow Info */}
                <div className="mt-6 p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-green-400">AI Cold Calling Begins Immediately</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Voice campaigns start as soon as you launch. <span className="text-amber-300 font-medium">Landlines only</span> - AI agents qualify leads in real-time via voice calls.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-blue-400">Once 10DLC is Approved: SMS Enabled</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          After 10DLC registration (~2-5 days), SMS campaigns activate. All positive replies are automatically nurtured until qualified.
                        </div>
                      </div>
                    </div>
                  </div>
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
                {/* Wallet Balance */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Wallet Balance
                    </span>
                    <button
                      onClick={loadWalletBalance}
                      disabled={loadingWallet}
                      className="text-xs text-primary hover:underline"
                    >
                      {loadingWallet ? 'Loading...' : 'Reload'}
                    </button>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    ${walletBalance.toFixed(2)}
                  </div>
                </div>

                {/* Recipients */}
                <div className="border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Recipients
                    </span>
                    <span className="font-bold text-lg">{phoneNumbers.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={phoneNumbers}
                    onChange={(e) => setPhoneNumbers(Number(e.target.value))}
                    data-testid="slider-phone-numbers"
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>100</span>
                    <span>10,000</span>
                  </div>
                  {costs.contactsQueuedForLater > 0 && (
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="text-xs text-blue-300 space-y-1">
                        <div className="font-semibold">📅 Daily Limit Applied</div>
                        <div>• Sending today: <span className="text-white font-medium">{costs.contactsToday.toLocaleString()}</span></div>
                        <div>• Queued for tomorrow: <span className="text-white font-medium">{costs.contactsQueuedForLater.toLocaleString()}</span></div>
                        <div className="text-blue-200 mt-2">Campaign sending is limited to {DAILY_CAMPAIGN_LIMIT.toLocaleString()} contacts/day per brand to maintain deliverability. Manual SMS is not affected.</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Estimated Cost */}
                <div className="border-b border-white/5 pb-4">
                  <div className="text-sm text-muted-foreground mb-3">Cost Breakdown</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {campaignType === "SMS" ? "SMS Messages" : "AI Voice Calls"}
                      </span>
                      <span className="font-medium">${costs.messagingCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone Numbers ({costs.numbersNeeded}x)</span>
                      <span className="font-medium">${costs.phoneNumbersCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone Validation & Line Type</span>
                      <span className="font-medium">${costs.validationCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">10DLC Registration</span>
                      <span className="font-medium">${costs.dlcFees}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between">
                      <span className="font-semibold">Total Required</span>
                      <span className="text-2xl font-bold text-green-400">${costs.total}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-3 space-y-1">
                    {campaignType === "SMS" 
                      ? <div>@ ${SMS_COST} per SMS (includes AI Classification + AI Replies + Carrier Fees)</div>
                      : <div>@ ${VOICE_COST_PER_MINUTE} per minute (includes AI Inbound + AI Outbound + Carrier, ~{ESTIMATED_CALL_DURATION_MINUTES} min avg)</div>
                    }
                    <div className="text-amber-400">💡 Rotating {costs.numbersNeeded} numbers (1 per {CONTACTS_PER_NUMBER} contacts)</div>
                    <div className="text-blue-400">🔍 Auto validation: Line type (mobile/landline), carrier, active status</div>
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
                  <div className="text-sm text-muted-foreground mb-3">Projected Results (Today)</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Replies</span>
                      <span className="font-medium text-blue-400">{costs.projectedReplies.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projected Hot Leads</span>
                      <span className="font-medium text-green-400">{costs.projectedHotLeads.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Based on {costs.contactsToday.toLocaleString()} contacts sending today: {(ESTIMATED_REPLY_RATE * 100).toFixed(0)}% reply rate, {(ESTIMATED_HOT_LEAD_RATE * 100).toFixed(0)}% hot leads
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

                {/* Wallet Funding Info */}
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="text-sm font-semibold text-blue-400 mb-2">💳 Wallet Funding Guide</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Campaign requires ${costs.total} total</div>
                    <div>• Current balance: ${walletBalance.toFixed(2)}</div>
                    <div>• Shortfall: ${Math.max(0, parseFloat(costs.total) - walletBalance).toFixed(2)}</div>
                  </div>
                </div>

                {/* Est. Time */}
                <div className="border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Est. Time
                    </span>
                    <span className="font-semibold">~{Math.ceil(phoneNumbers / 60)} mins</span>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-200">
                  ⚠️ Ensure your message content aligns with your declared 10DLC use case to avoid carrier filtering.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
