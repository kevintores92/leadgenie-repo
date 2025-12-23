import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MessageCircle, Users, Send, Eye, ChevronRight, Plus, Loader2, Phone, PhoneOff, Pause, Clock } from "lucide-react";
import * as api from "@/lib/api";
import { Device } from '@twilio/voice-sdk';
import { Device } from '@twilio/voice-sdk';

const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    "HOT": "bg-red-500/20 text-red-400 border-red-500/30",
    "WARM": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "COLD": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "NOT_INTERESTED": "bg-gray-500/20 text-gray-400 border-gray-500/30",
    "WRONG_NUMBER": "bg-red-500/20 text-red-400 border-red-500/30",
    "DNC": "bg-gray-700/20 text-gray-400 border-gray-700/30",
  };
  return statusColors[status] || "bg-gray-500/20 text-gray-400";
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [smsData, setSmsData] = useState<any[]>([]);
  const [leadsBreakdown, setLeadsBreakdown] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [twilioDevice, setTwilioDevice] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>('disconnected');
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [twilioDevice, setTwilioDevice] = useState<any>(null);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>('');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'sms' | 'cold-calling'>('sms');

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignData(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  // Initialize Twilio Voice after org is loaded
  useEffect(() => {
    if (organization && !twilioDevice) {
      initializeTwilioDevice();
    }
  }, [organization, twilioDevice]);

  // Update selected campaign when active tab changes
  useEffect(() => {
    if (campaigns.length > 0) {
      const filteredCampaigns = campaigns.filter(campaign => {
        if (activeTab === 'cold-calling') {
          return campaign.callingMode === 'COLD_CALLING';
        } else {
          return campaign.callingMode !== 'COLD_CALLING';
        }
      });

      if (filteredCampaigns.length > 0) {
        // If current selected campaign is not in the filtered list, select the first one
        if (!selectedCampaign || !filteredCampaigns.find(c => c.id === selectedCampaign.id)) {
          setSelectedCampaign(filteredCampaigns[0]);
        }
      } else {
        setSelectedCampaign(null);
      }
    }
  }, [activeTab, campaigns]);

  async function initializeTwilioDevice() {
    try {
      const tokenResponse = await api.getVoiceToken();
      const device = new Device(tokenResponse.token);
      
      device.on('ready', () => {
        console.log('Twilio Device ready');
        setTwilioDevice(device);
      });
      
      device.on('error', (error) => {
        console.error('Twilio Device error:', error);
      });
      
      device.on('connect', (call) => {
        console.log('Call connected');
        setCallStatus('connected');
        setCurrentCall(call);
        setCallDuration(0);
        
        // Start duration timer
        const interval = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
        
        call.on('disconnect', () => {
          setCallStatus('disconnected');
          setCurrentCall(null);
          clearInterval(interval);
        });
      });
      
      device.on('disconnect', () => {
        setCallStatus('disconnected');
        setCurrentCall(null);
      });
      
    } catch (error) {
      console.error('Failed to initialize Twilio device:', error);
    }
  }

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [statsData, campaignsData, contactsData, orgData] = await Promise.all([
        api.getDashboardStats(),
        api.getCampaigns(),
        api.getContacts({ limit: 10 }),
        api.getOrganization()
      ]);

      setDashboardStats(statsData);
      setCampaigns(campaignsData);
      if (campaignsData.length > 0) {
        setSelectedCampaign(campaignsData[0]);
      }
      setContacts(contactsData.contacts || []);
      setOrganization(orgData);

      // Initialize selections
      if (orgData.marketplaces && orgData.marketplaces.length > 0) {
        setSelectedMarketplace(orgData.marketplaces[0]);
      }
      if (orgData.brands && orgData.brands.length > 0) {
        setSelectedBrand(orgData.brands[0]);
      }

      // Initialize Twilio device
      initializeTwilioDevice();

      // Load overall stats
      const [smsStats, leadsStats] = await Promise.all([
        api.getSmsStats(),
        api.getLeadsBreakdown()
      ]);
      setSmsData(smsStats);
      setLeadsBreakdown(leadsStats);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaignData(campaignId: string) {
    try {
      const [smsStats, leadsStats] = await Promise.all([
        api.getSmsStats(campaignId),
        api.getLeadsBreakdown(campaignId)
      ]);
      setSmsData(smsStats);
      setLeadsBreakdown(leadsStats);
    } catch (error) {
      console.error('Failed to load campaign data:', error);
    }
  }

  async function pauseCampaign(campaignId: string) {
    try {
      await api.pauseCampaign(campaignId);
      // Refresh campaigns to update status
      const campaignsData = await api.getCampaigns();
      setCampaigns(campaignsData);
      // Update selected campaign if it's the one being paused
      if (selectedCampaign && selectedCampaign.id === campaignId) {
        const updatedCampaign = campaignsData.find(c => c.id === campaignId);
        if (updatedCampaign) {
          setSelectedCampaign(updatedCampaign);
        }
      }
    } catch (error) {
      console.error('Failed to pause campaign:', error);
    }
  }

  async function initializeTwilioDevice() {
    try {
      const tokenResponse = await api.getVoiceToken();
      const device = new Device(tokenResponse.token);
      
      device.on('ready', () => {
        console.log('Twilio device ready');
        setTwilioDevice(device);
      });

      device.on('error', (error: any) => {
        console.error('Twilio device error:', error);
      });

      device.on('connect', (call: any) => {
        console.log('Call connected');
        setCurrentCall(call);
        setCallStatus('connected');
        startCallTimer();
      });

      device.on('disconnect', () => {
        console.log('Call disconnected');
        setCurrentCall(null);
        setCallStatus('');
        stopCallTimer();
        setCallDuration(0);
      });

      device.on('incoming', (call: any) => {
        // Handle incoming calls if needed
        console.log('Incoming call');
      });

    } catch (error) {
      console.error('Failed to initialize Twilio device:', error);
    }
  }

  function startCallTimer() {
    setCallTimer(setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000));
  }

  function stopCallTimer() {
    if (callTimer) {
      clearInterval(callTimer);
      setCallTimer(null);
    }
  }

  async function makeCall(phoneNumber: string) {
    if (!twilioDevice) {
      alert('Voice device not ready');
      return;
    }

    try {
      setCallStatus('connecting');
      const call = await twilioDevice.connect({
        params: {
          To: phoneNumber
        }
      });
    } catch (error) {
      console.error('Failed to make call:', error);
      setCallStatus('');
    }
  }

  function hangupCall() {
    if (currentCall) {
      currentCall.disconnect();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = dashboardStats || { smsSent: 0, smsDelivered: 0, smsResponded: 0, hotLeads: 0 };
  const deliveryRate = stats.smsSent > 0 ? ((stats.smsDelivered / stats.smsSent) * 100).toFixed(1) : '0.0';
  const responseRate = stats.smsSent > 0 ? ((stats.smsResponded / stats.smsSent) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">Campaign Dashboard</h1>
                {organization?.marketplaces && organization.marketplaces.length > 0 && (
                  <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Marketplace" />
                    </SelectTrigger>
                    <SelectContent>
                      {organization.marketplaces.map((marketplace: string) => (
                        <SelectItem key={marketplace} value={marketplace}>
                          {marketplace}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center gap-4">
                {organization?.brands && organization.brands.length > 1 && (
                  <Select value={selectedBrand?.id || ''} onValueChange={(value) => {
                    const brand = organization.brands.find((b: any) => b.id === value);
                    setSelectedBrand(brand);
                  }}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select Subaccount" />
                    </SelectTrigger>
                    <SelectContent>
                      {organization.brands.map((brand: any) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button 
                  onClick={() => navigate('/campaigns/new')}
                  data-testid="button-new-campaign"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Call Status */}
        {callStatus && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mx-4 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-medium text-green-400">
                  {callStatus === 'connecting' ? 'Connecting...' : 'Call in progress'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duration: {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            <Button
              onClick={hangupCall}
              variant="destructive"
              size="sm"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Hang Up
            </Button>
          </div>
        )}

        <main className="container mx-auto px-4 py-12">
          {/* Active Campaign Status */}
          {selectedCampaign && selectedCampaign.status === 'RUNNING' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="glass-card rounded-2xl p-6 border border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                    <h3 className="font-semibold text-lg text-green-400">Active Campaign</h3>
                  </div>
                  <Button
                    onClick={() => pauseCampaign(selectedCampaign.id)}
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Campaign
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Campaign</span>
                    <span className="font-medium">{selectedCampaign.name}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {activeTab === 'cold-calling' ? 'Calls Made' : 'Messages Sent'}
                      </span>
                      <span className="font-medium">
                        {activeTab === 'cold-calling' 
                          ? `${dashboardStats?.callsMade || 0} of ${selectedCampaign.estimatedContacts || 0}`
                          : `${dashboardStats?.smsSent || 0} of ${selectedCampaign.estimatedContacts || 0}`
                        }
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, ((activeTab === 'cold-calling' 
                            ? (dashboardStats?.callsMade || 0) 
                            : (dashboardStats?.smsSent || 0)) / (selectedCampaign.estimatedContacts || 1)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Campaign will continue to receive incoming calls and AI replies even when paused
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Scheduled Campaigns */}
          {campaigns.some(c => c.status === 'SCHEDULED' || (c.scheduledStart && new Date(c.scheduledStart) > new Date())) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="glass-card rounded-2xl p-6 border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Upcoming Scheduled Campaigns
                </h3>
                <div className="space-y-3">
                  {campaigns
                    .filter(c => c.status === 'SCHEDULED' || (c.scheduledStart && new Date(c.scheduledStart) > new Date()))
                    .map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Scheduled for {campaign.scheduledStart ? new Date(campaign.scheduledStart).toLocaleString() : 'Future date'}
                          </p>
                        </div>
                        <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                          Scheduled
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Campaign Selector */}
          {campaigns.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="glass-card rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Select Campaign</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCampaign
                        ? selectedCampaign.name
                        : activeTab === 'cold-calling'
                          ? 'No cold calling campaigns'
                          : 'No SMS campaigns'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCampaignSelector(!showCampaignSelector)}
                    data-testid="button-toggle-campaign-selector"
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <ChevronRight className={`w-6 h-6 transition-transform ${showCampaignSelector ? 'rotate-90' : ''}`} />
                  </button>
                </div>

                {showCampaignSelector && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-6 pt-6 border-t border-white/5 space-y-2 max-h-96 overflow-y-auto"
                  >
                    {campaigns
                      .filter(campaign => {
                        if (activeTab === 'cold-calling') {
                          return campaign.callingMode === 'COLD_CALLING';
                        } else {
                          return campaign.callingMode !== 'COLD_CALLING';
                        }
                      })
                      .map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowCampaignSelector(false);
                        }}
                        data-testid={`button-campaign-${campaign.id}`}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedCampaign?.id === campaign.id
                            ? "bg-primary/20 border border-primary/30"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span>{campaign.callingMode === 'COLD_CALLING' ? '📞' : '📱'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(campaign.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {(() => {
                            if (campaign.status === "RUNNING") {
                              return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Active</span>;
                            } else if (campaign.status === "SCHEDULED") {
                              return <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400">Scheduled</span>;
                            } else if (campaign.status === "PAUSED") {
                              return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Paused</span>;
                            } else if (campaign.status === "COMPLETED") {
                              return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">Completed</span>;
                            }
                            return null;
                          })()}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Upcoming Scheduled Campaigns */}
          {(() => {
            const scheduledCampaigns = campaigns.filter(campaign =>
              campaign.status === 'SCHEDULED' &&
              campaign.scheduledStart &&
              new Date(campaign.scheduledStart) > new Date()
            );

            if (scheduledCampaigns.length === 0) return null;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="mb-8"
              >
                <div className="glass-card rounded-2xl p-6 border border-orange-500/30">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-xs">⏰</span>
                    Upcoming Scheduled Campaigns
                  </h3>

                  <div className="space-y-3">
                    {scheduledCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span>{campaign.callingMode === 'COLD_CALLING' ? '📞' : '📱'}</span>
                          <div>
                            <p className="font-medium text-sm">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Starts {new Date(campaign.scheduledStart).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400">
                          Scheduled
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Campaign Type Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <div className="flex space-x-1 bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setActiveTab('sms')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'sms'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                📱 SMS Campaigns
              </button>
              <button
                onClick={() => setActiveTab('cold-calling')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'cold-calling'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                📞 Cold Calling
              </button>
            </div>
          </motion.div>

          {/* Key Metrics */}
          {activeTab === 'sms' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid md:grid-cols-4 gap-4 mb-8"
            >
            <div className="glass-card rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Messages Sent</p>
                  <p className="text-3xl font-bold mt-2">{stats.smsSent.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Send className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Delivery Rate</p>
                  <p className="text-3xl font-bold mt-2">{deliveryRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Response Rate</p>
                  <p className="text-3xl font-bold mt-2">{responseRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Hot Leads</p>
                  <p className="text-3xl font-bold mt-2">{stats.hotLeads}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>
          </motion.div>
          )}

          {/* Cold Calling Key Metrics */}
          {activeTab === 'cold-calling' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid md:grid-cols-4 gap-4 mb-8"
            >
              <div className="glass-card rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Calls Made</p>
                    <p className="text-3xl font-bold mt-2">{stats.callsMade?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Connected Rate</p>
                    <p className="text-3xl font-bold mt-2">{stats.connectedRate || '0'}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">AI Conversations</p>
                    <p className="text-3xl font-bold mt-2">{stats.aiConversations?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Qualified Leads</p>
                    <p className="text-3xl font-bold mt-2">{stats.qualifiedLeads || '0'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Charts */}
          {activeTab === 'sms' && (
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-6 border border-white/5"
            >
              <h3 className="font-semibold mb-6">Delivery Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={smsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.8)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
                  <Line type="monotone" dataKey="delivered" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-2xl p-6 border border-white/5"
            >
              <h3 className="font-semibold mb-6">Leads Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={leadsBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    {leadsBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
          )}

          {/* Prospects Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6 border border-white/5"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">
                {activeTab === 'sms' ? 'All Prospects' : 'Cold Calling Prospects'}
              </h3>
              <Button variant="outline" className="border-white/10 hover:bg-white/5 text-sm">
                Filter
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {activeTab === 'sms' ? 'Last Message' : 'Last Call'}
                    </th>
                    {activeTab === 'cold-calling' && (
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Call</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No contacts yet. <button onClick={() => navigate('/upload')} className="text-primary hover:underline">Upload your first list</button>
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact.id} className="border-b border-white/5 hover:bg-white/3 transition-colors relative group">
                        <td className="py-4 px-4">{contact.firstName || contact.entityName || 'Unknown'}</td>
                        <td className="py-4 px-4 text-muted-foreground">{contact.phoneNumber1}</td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(contact.classification || '')}`}>
                            {contact.classification || 'No Status'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground truncate max-w-xs">
                          {activeTab === 'sms' ? (contact.notes || '-') : (contact.lastCallNotes || contact.notes || '-')}
                        </td>
                        {activeTab === 'cold-calling' && (
                          <td className="py-4 px-4">
                            <button
                              onClick={() => makeCall(contact.phoneNumber1)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg"
                              disabled={!twilioDevice || callStatus === 'connecting' || callStatus === 'connected'}
                            >
                              <Phone className="w-4 h-4 text-green-400" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
