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

// Pricing constants
const SMS_COST = 0.02; // $0.02 per SMS (includes AI Classification + AI Replies + Carrier Fees)
const TWILIO_VOICE_COST_PER_MIN = 0.01; // Hidden Twilio cost per minute
const AI_VOICE_INBOUND_COST_PER_MIN = 0.06; // Vapi AI inbound cost per minute
const AI_VOICE_OUTBOUND_COST_PER_MIN = 0.06; // Vapi AI outbound cost per minute
const AVG_CALL_DURATION_MIN = 2; // Average 2 minute call
const DLC_BRAND_REGISTRATION = 4.00; // One-time $4
const DLC_CAMPAIGN_REGISTRATION = 15.00; // One-time $15
const PHONE_NUMBER_COST = 1.15; // $1.15 per phone number per month
const PHONE_VALIDATION_COST = 0.001; // $0.001 per number ($10 per 10k, no markup) - API checks type, carrier, active status
const CONTACTS_PER_NUMBER = 250; // Rotation: 1 number per 250 contacts
const ESTIMATED_HOT_LEAD_RATE = 0.15; // 15% conversion to hot leads
const ESTIMATED_REPLY_RATE = 0.35; // 35% reply rate

export default function CampaignNew() {
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("SMS");
  const [phoneNumbers, setPhoneNumbers] = useState(1000);
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
      // Voice: AI inbound/outbound + hidden Twilio costs
      const avgAiCost = (AI_VOICE_INBOUND_COST_PER_MIN + AI_VOICE_OUTBOUND_COST_PER_MIN) / 2;
      costPerContact = (avgAiCost + TWILIO_VOICE_COST_PER_MIN) * AVG_CALL_DURATION_MIN;
    }
    
    // Calculate number of phone numbers needed for rotation
    const numbersNeeded = Math.ceil(phoneNumbers / CONTACTS_PER_NUMBER);
    
    // Calculate all costs
    const messagingCost = phoneNumbers * costPerContact;
    const phoneNumbersCost = numbersNeeded * PHONE_NUMBER_COST;
    const validationCost = phoneNumbers * PHONE_VALIDATION_COST;
    const dlcFees = DLC_BRAND_REGISTRATION + DLC_CAMPAIGN_REGISTRATION;
    
    // Calculate projected leads
    const projectedReplies = Math.round(phoneNumbers * ESTIMATED_REPLY_RATE);
    const projectedHotLeads = Math.round(phoneNumbers * ESTIMATED_HOT_LEAD_RATE);
    
    const totalCost = messagingCost + phoneNumbersCost + validationCost + dlcFees;
    
    return {
      messagingCost: messagingCost.toFixed(2),
      phoneNumbersCost: phoneNumbersCost.toFixed(2),
      validationCost: validationCost.toFixed(2),
      dlcFees: dlcFees.toFixed(2),
      total: totalCost.toFixed(2),
      numbersNeeded,
      projectedReplies,
      projectedHotLeads
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
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
        estimatedContacts: phoneNumbers
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
                      Cold calling campaigns with AI voice agents for landline optimization.
                    </div>
                  </TabsContent>
                </Tabs>
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
                  disabled={loading || !campaignName || loadingWallet}
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
                      : <div>@ ${((AI_VOICE_INBOUND_COST_PER_MIN + AI_VOICE_OUTBOUND_COST_PER_MIN) / 2 * AVG_CALL_DURATION_MIN).toFixed(3)} per call (AI Inbound + AI Outbound, {AVG_CALL_DURATION_MIN} min avg)</div>
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
                  <div className="text-sm text-muted-foreground mb-3">Projected Results</div>
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
                    Based on industry averages: {(ESTIMATED_REPLY_RATE * 100).toFixed(0)}% reply rate, {(ESTIMATED_HOT_LEAD_RATE * 100).toFixed(0)}% hot leads
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
