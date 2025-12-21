import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MessageCircle, Phone, TrendingUp, Users, Send, Eye, ChevronRight, Plus } from "lucide-react";

const smsData = [
  { name: "Mon", sent: 450, delivered: 410, responded: 92 },
  { name: "Tue", sent: 520, delivered: 490, responded: 140 },
  { name: "Wed", sent: 480, delivered: 460, responded: 110 },
  { name: "Thu", sent: 610, delivered: 590, responded: 180 },
  { name: "Fri", sent: 720, delivered: 690, responded: 210 },
];

const leadsBreakdown = [
  { name: "Hot", value: 310, color: "#f87171" },
  { name: "Warm", value: 240, color: "#fbbf24" },
  { name: "Nurture", value: 320, color: "#60a5fa" },
  { name: "No Status", value: 130, color: "#6b7280" },
];

const campaigns = [
  {
    id: 1,
    name: "Ground Up - First name - 1st Num...",
    date: "11/23/2025",
    status: "active",
    icon: "📱"
  },
  {
    id: 2,
    name: "Ground Up - Entity - 1st Number",
    date: "11/25/2025",
    status: "active",
    icon: "📱"
  },
  {
    id: 3,
    name: "Ground Up (Updated) - Number 2",
    date: "12/1/2025",
    status: "active",
    icon: "📱"
  },
  {
    id: 4,
    name: "Ground Up (Updated) - No List Nam...",
    date: "12/3/2025",
    status: "paused",
    icon: "📱"
  },
  {
    id: 5,
    name: "Ground Up (Updated) - 4th and 5t...",
    date: "12/5/2025",
    status: "active",
    icon: "📱"
  },
];

const prospects = [
  {
    id: 1,
    name: "405 Rider Avenue Realty",
    phone: "(917) 642-2235",
    status: "No Status",
    message: "I'm interested in what you consider a good price"
  },
  {
    id: 2,
    name: "St Pauls Bk Ch",
    phone: "(561) 847-1556",
    status: "Wrong Number",
    message: "Not remember this location"
  },
  {
    id: 3,
    name: "Brown Memorial Church",
    phone: "(202) 415-1725",
    status: "Warm Lead",
    message: "We stay thru Dec. 31st."
  },
  {
    id: 4,
    name: "383 Chris Llc",
    phone: "(718) 415-4418",
    status: "Hot Lead",
    message: "Hi, interested in selling or refinancing?"
  },
  {
    id: 5,
    name: "Lorihord Development Llc",
    phone: "(917) 416-2791",
    status: "Hot Lead",
    message: "It's fully leased in Fordham students."
  },
  {
    id: 6,
    name: "60 Brighton 10th Street Llc",
    phone: "(917) 280-4465",
    status: "Hot Lead",
    message: "Are you looking to develop?"
  },
  {
    id: 7,
    name: "St Joseph's College",
    phone: "(547) 723-0802",
    status: "Drop",
    message: "Not interested Thanks"
  },
];

const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    "Hot Lead": "bg-red-500/20 text-red-400 border-red-500/30",
    "Warm Lead": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "No Status": "bg-gray-500/20 text-gray-400 border-gray-500/30",
    "Wrong Number": "bg-red-500/20 text-red-400 border-red-500/30",
    "Drop": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return statusColors[status] || "bg-gray-500/20 text-gray-400";
};

export default function Dashboard() {
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);

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
          {/* Campaign Selector Slide */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="glass-card rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Select Campaign</h3>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.name}</p>
                </div>
                <button
                  onClick={() => setShowCampaignSelector(!showCampaignSelector)}
                  data-testid="button-toggle-campaign-selector"
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <ChevronRight className={`w-6 h-6 transition-transform ${showCampaignSelector ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {/* Campaign List */}
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
                        selectedCampaign.id === campaign.id
                          ? "bg-primary/20 border border-primary/30"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span>{campaign.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">{campaign.date}</p>
                        </div>
                        {campaign.status === "active" && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Active</span>
                        )}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>

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
                  <p className="text-3xl font-bold mt-2">1,079</p>
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
                  <p className="text-3xl font-bold mt-2">90.9%</p>
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
                  <p className="text-3xl font-bold mt-2">16.5%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Leads</p>
                  <p className="text-3xl font-bold mt-2">42</p>
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
                  {prospects.map((prospect) => (
                    <tr key={prospect.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-4 px-4">{prospect.name}</td>
                      <td className="py-4 px-4 text-muted-foreground">{prospect.phone}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(prospect.status)}`}>
                          {prospect.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground truncate max-w-xs">{prospect.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
