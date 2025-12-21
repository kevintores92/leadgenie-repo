import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Rocket, MessageCircle, Phone, Clock, Users } from "lucide-react";

const campaignTypes = ["SMS", "Cold Calling", "Warm Calling"];
const messageTemplates = [
  "Hey {{firstName}}, interested in refinancing?",
  "Quick question about your property at {{address}}",
  "Can we help you with {{property}}?"
];

const COST_PER_NUMBER = 0.01; // $0.01 per phone number

export default function CampaignNew() {
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("SMS");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const calculateEstimatedCost = () => {
    return (phoneNumbers * COST_PER_NUMBER).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 1000);
  };

  const estimatedCost = calculateEstimatedCost();

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

              {/* Message Configuration */}
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
                  <h3 className="font-semibold">Message Configuration</h3>
                </div>

                <Tabs value={campaignType} onValueChange={setCampaignType} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 border border-white/10 p-1 rounded-lg">
                    <TabsTrigger 
                      value="SMS" 
                      className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-md text-xs sm:text-sm"
                      data-testid="tab-sms"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      SMS + Warm Calling (Mobile)
                    </TabsTrigger>
                    <TabsTrigger 
                      value="Cold Calling" 
                      className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-md text-xs sm:text-sm"
                      data-testid="tab-cold-calls"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Cold Calling (Landlines)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="SMS" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="template" className="text-sm font-medium">
                        Message Template <span className="text-destructive">*</span>
                      </Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="glass-card border-white/10 focus:border-primary">
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10">
                          {messageTemplates.map((template, i) => (
                            <SelectItem key={i} value={template}>{template}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Variables: firstName, lastName, address, property
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="Cold Calling" className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Cold calling campaigns will be configured with landline optimization and auto-dialing settings.
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>

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
                  disabled={loading || !campaignName}
                  className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold"
                >
                  {loading ? "Launching..." : "Launch Campaign"}
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
                  <div className="text-sm text-muted-foreground mb-2">Estimated Cost</div>
                  <div className="text-3xl font-bold text-green-400 mb-1">
                    ${estimatedCost}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @ ${COST_PER_NUMBER} per number
                  </div>
                </div>

                {/* Est. Time */}
                <div className="border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Est. Time
                    </span>
                    <span className="font-semibold">~12 mins</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-3">PREVIEW</div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-xs leading-relaxed text-muted-foreground">
                    {selectedTemplate ? (
                      <div>
                        <div className="text-white mb-2">Sample message preview:</div>
                        {selectedTemplate}
                      </div>
                    ) : (
                      "Select a message template to preview"
                    )}
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
