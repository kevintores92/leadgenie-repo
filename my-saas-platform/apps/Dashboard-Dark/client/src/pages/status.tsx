import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, Clock, XCircle, HelpCircle } from "lucide-react";

interface MessageStatus {
  id: string;
  contact: string;
  phone: string;
  status: "DELIVERED" | "FAILED" | "HELD" | "DEFERRED" | "BLOCKED";
  timestamp: string;
  message: string;
}

const STATUS_CONFIG = {
  DELIVERED: {
    icon: CheckCircle2,
    color: "text-green-500 bg-green-500/10",
    label: "Delivered",
  },
  FAILED: {
    icon: XCircle,
    color: "text-red-500 bg-red-500/10",
    label: "Failed",
  },
  HELD: {
    icon: Clock,
    color: "text-yellow-500 bg-yellow-500/10",
    label: "Held",
  },
  DEFERRED: {
    icon: AlertCircle,
    color: "text-orange-500 bg-orange-500/10",
    label: "Deferred",
  },
  BLOCKED: {
    icon: HelpCircle,
    color: "text-purple-500 bg-purple-500/10",
    label: "Blocked",
  },
};

export default function StatusPage() {
  const [messages, setMessages] = useState<MessageStatus[]>([
    {
      id: "1",
      contact: "John Smith",
      phone: "+1 (555) 123-4567",
      status: "DELIVERED",
      timestamp: new Date().toISOString(),
      message: "Hey John, interested in your property...",
    },
    {
      id: "2",
      contact: "Jane Doe",
      phone: "+1 (555) 987-6543",
      status: "FAILED",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      message: "Hi Jane, following up...",
    },
    {
      id: "3",
      contact: "Bob Johnson",
      phone: "+1 (555) 456-7890",
      status: "HELD",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      message: "Bob, quick question about...",
    },
    {
      id: "4",
      contact: "Alice Williams",
      phone: "+1 (555) 234-5678",
      status: "DEFERRED",
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      message: "Alice, thought you might be interested...",
    },
  ]);
  const [activeTab, setActiveTab] = useState("all");

  const stats = {
    delivered: messages.filter((m) => m.status === "DELIVERED").length,
    failed: messages.filter((m) => m.status === "FAILED").length,
    held: messages.filter((m) => m.status === "HELD").length,
    deferred: messages.filter((m) => m.status === "DEFERRED").length,
    blocked: messages.filter((m) => m.status === "BLOCKED").length,
  };

  const filteredMessages =
    activeTab === "all"
      ? messages
      : messages.filter(
          (m) => m.status === activeTab.toUpperCase()
        );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Message Status</h1>
        <p className="text-muted-foreground mt-2">
          Track the delivery status of your messages
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Delivery errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Held</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.held}</div>
            <p className="text-xs text-muted-foreground">Pending processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deferred</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.deferred}
            </div>
            <p className="text-xs text-muted-foreground">Retry scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.blocked}
            </div>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
          <CardDescription>All message delivery statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="held">Held</TabsTrigger>
              <TabsTrigger value="deferred">Deferred</TabsTrigger>
              <TabsTrigger value="blocked">Blocked</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-4">
              {filteredMessages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No messages with this status
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredMessages.map((msg) => {
                    const config = STATUS_CONFIG[msg.status];
                    const Icon = config.icon;
                    return (
                      <div
                        key={msg.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className={`p-2 rounded ${config.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="font-medium">{msg.contact}</p>
                              <p className="text-sm text-muted-foreground">
                                {msg.phone}
                              </p>
                              <p className="text-sm mt-1">{msg.message}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`text-sm font-medium ${config.color}`}>
                                {config.label}
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(msg.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
