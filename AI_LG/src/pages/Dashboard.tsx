import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MessageCircle, Users, Send, Eye, ChevronRight, Plus, Loader2 } from "lucide-react";
import * as api from "@/lib/api";

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignData(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [statsData, campaignsData, contactsData] = await Promise.all([
        api.getDashboardStats(),
        api.getCampaigns(),
        api.getContacts({ limit: 10 })
      ]);

      setDashboardStats(statsData);
      setCampaigns(campaignsData);
      if (campaignsData.length > 0) {
        setSelectedCampaign(campaignsData[0]);
      }
      setContacts(contactsData.contacts || []);

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
              <h1 className="text-2xl font-bold">Campaign Dashboard</h1>
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
        </header>

        <main className="container mx-auto px-4 py-12">
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
                      {selectedCampaign ? selectedCampaign.name : 'All Campaigns'}
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
                    {campaigns.map((campaign) => (
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
                          <span>📱</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(campaign.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {campaign.status === "RUNNING" && (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Active</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Key Metrics */}
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

          {/* Charts */}
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

          {/* Prospects Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6 border border-white/5"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">All Prospects</h3>
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
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Message</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No contacts yet. <button onClick={() => navigate('/upload')} className="text-primary hover:underline">Upload your first list</button>
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="py-4 px-4">{contact.firstName || contact.entityName || 'Unknown'}</td>
                        <td className="py-4 px-4 text-muted-foreground">{contact.phoneNumber1}</td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(contact.classification || '')}`}>
                            {contact.classification || 'No Status'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground truncate max-w-xs">{contact.notes || '-'}</td>
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
