import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CreditCard, Wallet, User, Bell, Shield, Users, 
  Zap, Check, ChevronRight, Download, Plus, AlertCircle, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import MainLayout from "@/components/layout/MainLayout";
import { authStore } from "@/stores/authStore";

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = authStore.user;
  const [autoReload, setAutoReload] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    firstName: user?.name?.split(" ")[0] || "User",
    lastName: user?.name?.split(" ").slice(1).join(" ") || "",
    email: user?.email || "",
  });

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      // Fetch wallet balance
      const walletRes = await fetch("/api/wallet/balance", {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      if (walletRes.ok) {
        const data = await walletRes.json();
        setWalletBalance(data.balance || 0);
      }

      // Fetch subscription info
      const subRes = await fetch("/api/billing/subscription", {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      if (subRes.ok) {
        setSubscription(await subRes.json());
      }

      // Fetch billing history
      const histRes = await fetch("/api/billing/history", {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      if (histRes.ok) {
        setBillingHistory(await histRes.json());
      }
    } catch (err) {
      console.error("Failed to load billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (amount: number) => {
    try {
      const res = await fetch("/api/billing/create-topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.token}`
        },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        await loadBillingData();
      }
    } catch (err) {
      console.error("Failed to create top-up:", err);
    }
  };

  const handleUpgradePlan = () => {
    navigate("/billing?tab=subscription");
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.token}`
        },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        alert("Profile updated");
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  return (
    <MainLayout title="Settings">
      <ScrollArea className="h-full p-6">
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
          
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-heading font-bold">Account Settings</h2>
            <p className="text-muted-foreground">Manage your subscription, wallet, and team preferences.</p>
          </div>

          <Tabs defaultValue="subscription" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-secondary/30">
              <TabsTrigger value="subscription">Plan & Billing</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>

            {/* SUBSCRIPTION TAB */}
            <TabsContent value="subscription" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Current Plan */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-[0_0_20px_rgba(0,180,216,0.1)]">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">Current Plan</CardTitle>
                        <CardDescription>{subscription?.name || "Pro Plan"}</CardDescription>
                      </div>
                      <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                        {subscription?.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold font-heading">${subscription?.price || "799"}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {subscription?.features?.map((feature: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </div>
                      )) || (
                        <>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>20,000 Outbound Texts</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>Unlimited AI Classification</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3">
                    <Button variant="outline" className="flex-1 border-border/50" disabled>Downgrade</Button>
                    <Button onClick={handleUpgradePlan} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">Upgrade Plan</Button>
                  </CardFooter>
                </Card>

                {/* Payment Method */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="text-xl">Payment Method</CardTitle>
                    <CardDescription>Manage your payment details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border border-border/50 rounded-lg bg-secondary/20">
                      <div className="h-10 w-16 bg-white rounded flex items-center justify-center">
                        {/* Visa Logo placeholder */}
                        <div className="text-blue-600 font-bold italic text-lg">VISA</div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Visa ending in 4242</p>
                        <p className="text-sm text-muted-foreground">Expires 12/28</p>
                      </div>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                    <Button variant="outline" className="w-full border-dashed border-border/50 hover:bg-secondary/30">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Invoices */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {billingHistory && billingHistory.length > 0 ? (
                      billingHistory.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 hover:bg-secondary/20 rounded-lg transition-colors">
                          <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground">
                               <CreditCard className="h-5 w-5" />
                             </div>
                             <div>
                               <p className="font-medium">{new Date(item.date).toLocaleDateString()}</p>
                               <p className="text-xs text-muted-foreground">{item.invoiceId}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="font-mono">${item.amount}</span>
                            <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-transparent">{item.status}</Badge>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No billing history available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* WALLET TAB */}
            <TabsContent value="wallet" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-gradient-to-br from-card/80 to-secondary/30 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      Credit Balance
                    </CardTitle>
                    <CardDescription>Used for outbound calls and extra texts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-bold font-heading mb-6 text-foreground">${walletBalance.toFixed(2)}</div>
                    <div className="grid grid-cols-3 gap-3">
                      <Button onClick={() => handleTopUp(20)} variant="outline" className="border-border/50 hover:border-primary hover:text-primary transition-all">$20</Button>
                      <Button onClick={() => handleTopUp(50)} variant="outline" className="border-border/50 hover:border-primary hover:text-primary transition-all">$50</Button>
                      <Button onClick={() => handleTopUp(100)} variant="outline" className="border-border/50 hover:border-primary hover:text-primary transition-all">$100</Button>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,180,216,0.3)]">
                      Add Funds Custom Amount
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                   <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      Auto-Reload
                    </CardTitle>
                    <CardDescription>Automatically add funds when balance is low</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Enable Auto-Reload</Label>
                        <p className="text-sm text-muted-foreground">Never run out of credits during a campaign.</p>
                      </div>
                      <Switch checked={autoReload} onCheckedChange={setAutoReload} />
                    </div>
                    
                    {autoReload && (
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid gap-2">
                          <Label>When balance falls below</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input defaultValue="10.00" className="pl-6 bg-background/50 border-border/50" />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Add this amount</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input defaultValue="50.00" className="pl-6 bg-background/50 border-border/50" />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

               <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="text-sm text-muted-foreground text-center py-8">
                     No recent wallet transactions.
                   </div>
                </CardContent>
               </Card>
            </TabsContent>

            {/* PROFILE TAB */}
             <TabsContent value="profile" className="space-y-6 mt-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your photo and personal details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 ring-4 ring-secondary">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {profileData.firstName[0]}{profileData.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="border-border/50">Change Avatar</Button>
                      <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max size of 800K</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input 
                        id="firstName" 
                        value={profileData.firstName} 
                        onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                        className="bg-secondary/30 border-border/50" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input 
                        id="lastName" 
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                        className="bg-secondary/30 border-border/50" 
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="bg-secondary/30 border-border/50" 
                      type="email"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/50 pt-6">
                  <Button onClick={handleSaveProfile} className="bg-primary hover:bg-primary/90">Save Changes</Button>
                </CardFooter>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                   <CardTitle>Notifications</CardTitle>
                   <CardDescription>Configure how you receive alerts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive daily summaries and critical alerts.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive alerts on your mobile device.</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

             {/* TEAM TAB */}
             <TabsContent value="team" className="space-y-6 mt-6">
               <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to your workspace.</CardDescription>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </CardHeader>
                <CardContent>
                   <div className="space-y-6">
                     {[
                       { name: "John Doe", email: "office@goblinvestments.com", role: "Owner", status: "Active" },
                       { name: "Sarah Smith", email: "sarah@goblinvestments.com", role: "Admin", status: "Active" },
                       { name: "Mike Jones", email: "mike@goblinvestments.com", role: "Agent", status: "Invited" },
                     ].map((member, i) => (
                       <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <Avatar>
                             <AvatarFallback className="bg-secondary text-secondary-foreground">{member.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                           </Avatar>
                           <div>
                             <p className="font-medium">{member.name}</p>
                             <p className="text-sm text-muted-foreground">{member.email}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-4">
                           <Badge variant="outline" className="border-border/50">{member.role}</Badge>
                           <span className={`text-sm ${member.status === 'Active' ? 'text-green-400' : 'text-yellow-400'}`}>{member.status}</span>
                           <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                             <Settings className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
                     ))}
                   </div>
                </CardContent>
               </Card>
             </TabsContent>

          </Tabs>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}