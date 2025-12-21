import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Phone, Send, 
  User, Clock, Archive, Mic, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import MainLayout from "@/components/layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

export default function MessengerPage() {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [contactDraft, setContactDraft] = useState<any>(null);

  // Fetch contacts and convert to threads
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setIsLoading(true);
        if (!token && !user?.orgId) {
          toast({
            title: 'Not signed in',
            description: 'Please log in to view contacts.',
            variant: 'destructive',
          });
          setThreads([]);
          setSelectedThread(null);
          return;
        }

        const response = await fetch('/api/contacts', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(user?.orgId ? { 'x-organization-id': user.orgId } : {}),
            ...(user?.id ? { 'x-user-id': user.id } : {}),
          },
        });
        if (!response.ok) throw new Error('Failed to fetch contacts');
        const data = await response.json();
        
        // Map contacts to threads
        const mappedThreads = data.slice(0, 10).map((contact: any) => ({
          id: contact.id,
          name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown Contact',
          avatar: `${contact.firstName?.charAt(0) || 'C'}${contact.lastName?.charAt(0) || 'C'}`,
          lastMessage: `Inquiry about property in ${contact.propertyCity || 'your area'}`,
          time: 'Recently',
          unread: 0,
          status: 'warm',
          online: Math.random() > 0.5,
          email: '',
          phone: contact.phone || '',
          location: contact.propertyCity || 'Unknown',
          contact,
        }));
        
        setThreads(mappedThreads);
        if (mappedThreads.length > 0) {
          setSelectedThread(mappedThreads[0]);
        }
      } catch (error) {
        console.error('Error fetching threads:', error);
        setThreads([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreads();
  }, [token]);

  useEffect(() => {
    if (!selectedThread?.contact) {
      setContactDraft(null);
      return;
    }
    const c = selectedThread.contact;
    setContactDraft({
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      phone: c.phone || '',
      propertyAddress: c.propertyAddress || '',
      mailingAddress: c.mailingAddress || '',
      status: c.status || '',
      tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
    });
  }, [selectedThread?.id]);

  const saveContact = async () => {
    if (!selectedThread?.id || !contactDraft) return;
    if (!token && !user?.orgId) {
      toast({
        title: 'Not signed in',
        description: 'Please log in to edit contacts.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const payload: any = {
        firstName: contactDraft.firstName,
        lastName: contactDraft.lastName,
        phone: contactDraft.phone,
        propertyAddress: contactDraft.propertyAddress,
        mailingAddress: contactDraft.mailingAddress,
        status: contactDraft.status,
        tags: typeof contactDraft.tags === 'string'
          ? contactDraft.tags.split(/[,;|]/).map((t: string) => t.trim()).filter(Boolean)
          : undefined,
      };

      const response = await fetch(`/api/contacts/${selectedThread.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user?.orgId ? { 'x-organization-id': user.orgId } : {}),
          ...(user?.id ? { 'x-user-id': user.id } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({
          title: 'Save failed',
          description: data?.error || 'Unable to save contact.',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Saved', description: 'Contact updated successfully.' });

      // Update thread display
      setThreads((prev: any[]) =>
        prev.map((t) =>
          t.id === selectedThread.id
            ? {
                ...t,
                phone: data.phone || payload.phone,
                name: `${data.firstName || payload.firstName || ''} ${data.lastName || payload.lastName || ''}`.trim() || t.name,
                avatar: `${(data.firstName || payload.firstName || 'C').charAt(0)}${(data.lastName || payload.lastName || 'C').charAt(0)}`,
                contact: { ...(t.contact || {}), ...data },
              }
            : t
        )
      );
      setSelectedThread((prev: any) => (prev ? { ...prev, contact: { ...(prev.contact || {}), ...data } } : prev));
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message || 'Unexpected error.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <MainLayout title="Inbox"><div className="flex items-center justify-center h-full text-muted-foreground">Loading contacts...</div></MainLayout>;
  }

  if (!selectedThread && threads.length === 0) {
    return <MainLayout title="Inbox"><div className="flex items-center justify-center h-full text-muted-foreground">No contacts available</div></MainLayout>;
  }

  return (
    <MainLayout title="Inbox">
      <div className="flex h-full w-full">
        {/* LEFT SIDEBAR - THREADS LIST */}
        <div className="w-80 md:w-96 border-r border-border flex flex-col bg-sidebar/50 backdrop-blur-sm h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-heading font-bold">Contacts</h1>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Plus className="h-5 w-5 text-primary" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search contacts..." 
                className="pl-9 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary/20 h-9" 
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 cursor-pointer whitespace-nowrap">All</Badge>
              <Badge variant="outline" className="bg-transparent text-muted-foreground hover:bg-secondary/30 cursor-pointer border-border/50 whitespace-nowrap">Unread</Badge>
              <Badge variant="outline" className="bg-transparent text-muted-foreground hover:bg-secondary/30 cursor-pointer border-border/50 whitespace-nowrap">Hot Leads</Badge>
              <Badge variant="outline" className="bg-transparent text-muted-foreground hover:bg-secondary/30 cursor-pointer border-border/50 whitespace-nowrap">Follow Up</Badge>
            </div>
          </div>

          {/* Threads List */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {threads.map((thread: any) => (
                <div 
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`p-4 border-b border-border/30 cursor-pointer hover:bg-secondary/30 transition-colors flex gap-3 ${selectedThread?.id === thread.id ? 'bg-secondary/40 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback className="bg-primary/20 text-primary">{thread.avatar}</AvatarFallback>
                    </Avatar>
                    {thread.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium truncate ${thread.unread > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {thread.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{thread.time}</span>
                    </div>
                    <p className={`text-sm truncate ${thread.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {thread.lastMessage}
                    </p>
                  </div>
                  {thread.unread > 0 && (
                    <div className="flex flex-col items-end justify-center">
                      <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full font-bold">
                        {thread.unread}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* CENTER - CHAT AREA */}
        <div className="flex-1 flex flex-col bg-background/50 relative">
          {/* Chat Header */}
          {selectedThread && (
          <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/20 text-primary">{selectedThread.avatar}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-semibold">{selectedThread.name}</h2>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-orange-500/10 text-orange-500 border-orange-500/20">Prospect</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedThread.online ? 'bg-green-500' : 'bg-gray-500'}`}></span> {selectedThread.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground md:hidden">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
          )}

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6 max-w-3xl mx-auto text-center text-muted-foreground">
              <p className="py-12">No messages yet. Start a conversation by sending an SMS!</p>
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 bg-background border-t border-border">
            <div className="max-w-3xl mx-auto flex gap-3 items-end bg-secondary/20 p-2 rounded-xl border border-border/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary rounded-lg shrink-0">
                <Plus className="h-5 w-5" />
              </Button>
              <Textarea 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..." 
                className="min-h-[20px] max-h-32 border-none focus-visible:ring-0 bg-transparent resize-none py-2 px-0 shadow-none leading-relaxed"
              />
              <div className="flex gap-1 shrink-0 pb-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg">
                  <ImageIcon className="h-4 w-4" />
                </Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button size="icon" className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg ml-1 shadow-[0_0_10px_rgba(0,180,216,0.3)]">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-w-3xl mx-auto flex justify-between items-center mt-2 px-1">
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span className="hover:text-foreground cursor-pointer transition-colors">Use Template</span>
                <span>•</span>
                <span className="hover:text-foreground cursor-pointer transition-colors">Attach File</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Press Enter to send
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - CONTACT DETAILS */}
        <div className="hidden xl:flex w-80 border-l border-border bg-sidebar/50 backdrop-blur-sm flex-col overflow-y-auto">
          {/* Contact Profile Header */}
          <div className="p-6 flex flex-col items-center border-b border-border/50">
            <Avatar className="h-24 w-24 mb-4 ring-4 ring-background shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-cyan-700 text-3xl text-white">
                {selectedThread.avatar}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-heading font-bold mb-1">{selectedThread.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Real Estate Investor</p>
            
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1 border-border/50 hover:bg-secondary/50 hover:text-primary transition-colors">
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" className="flex-1 border-border/50 hover:bg-secondary/50 hover:text-primary transition-colors">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            </div>

            {/* Message Actions */}
            <div className="flex flex-col gap-2 w-full mt-3 pt-3 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message Status</p>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // TODO: Call backend endpoint to mark as verified
                    console.log('Mark as Verified');
                  }}
                  className="text-xs border-border/50 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 transition-colors"
                >
                  ✓ Verified
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // TODO: Call backend endpoint for wrong number
                    console.log('Mark as Wrong Number');
                  }}
                  className="text-xs border-border/50 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 transition-colors"
                >
                  ✗ Wrong #
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // TODO: Call backend endpoint for DNC
                    console.log('Mark as DNC');
                  }}
                  className="text-xs border-border/50 hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/30 transition-colors"
                >
                  🚫 DNC
                </Button>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h3>
              
              <div className="space-y-3">
                <div className="group flex items-start gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                  <div className="flex-1">
                    <Input
                      value={contactDraft?.phone || ''}
                      onChange={(e) => setContactDraft((d: any) => ({ ...d, phone: e.target.value }))}
                      placeholder="Phone"
                      className="h-8 bg-secondary/30 border-border/50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Saved as E.164 (server-normalized)</p>
                  </div>
                </div>
                
                <div className="group flex items-start gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                  <div className="flex-1">
                    <Input
                      value={contactDraft?.firstName || ''}
                      onChange={(e) => setContactDraft((d: any) => ({ ...d, firstName: e.target.value }))}
                      placeholder="First name"
                      className="h-8 bg-secondary/30 border-border/50"
                    />
                    <Input
                      value={contactDraft?.lastName || ''}
                      onChange={(e) => setContactDraft((d: any) => ({ ...d, lastName: e.target.value }))}
                      placeholder="Last name"
                      className="h-8 bg-secondary/30 border-border/50 mt-2"
                    />
                  </div>
                </div>
                
                <div className="group flex items-start gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                  <div className="flex-1">
                    <Input
                      value={contactDraft?.propertyAddress || ''}
                      onChange={(e) => setContactDraft((d: any) => ({ ...d, propertyAddress: e.target.value }))}
                      placeholder="Property address"
                      className="h-8 bg-secondary/30 border-border/50"
                    />
                    <Input
                      value={contactDraft?.mailingAddress || ''}
                      onChange={(e) => setContactDraft((d: any) => ({ ...d, mailingAddress: e.target.value }))}
                      placeholder="Mailing address"
                      className="h-8 bg-secondary/30 border-border/50 mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Input
                    value={contactDraft?.status || ''}
                    onChange={(e) => setContactDraft((d: any) => ({ ...d, status: e.target.value }))}
                    placeholder="Status (Hot/Warm/Nurture/Drip/etc.)"
                    className="h-8 bg-secondary/30 border-border/50"
                  />
                  <Input
                    value={contactDraft?.tags || ''}
                    onChange={(e) => setContactDraft((d: any) => ({ ...d, tags: e.target.value }))}
                    placeholder="Tags (comma-separated)"
                    className="h-8 bg-secondary/30 border-border/50"
                  />
                  <Button onClick={saveContact} className="w-full h-9">Save</Button>
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Tags */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
                <Plus className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-transparent">Hot Lead</Badge>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-transparent">Investor</Badge>
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-transparent">Multi-family</Badge>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Notes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
                <Plus className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
              </div>
              <Card className="bg-secondary/20 border-border/50 shadow-none">
                <CardContent className="p-3 text-sm text-muted-foreground italic">
                  "Interested in 123 Main St. Asked about roof age. Seems ready to move fast."
                </CardContent>
              </Card>
            </div>
            
            <Separator className="bg-border/50" />

             {/* Deals */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Deals</h3>
                <Plus className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
              </div>
               <Card className="bg-secondary/20 border-border/50 shadow-none hover:bg-secondary/30 transition-colors cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                     <p className="font-medium text-sm">123 Main St</p>
                     <Badge variant="outline" className="text-[10px] h-5 px-1 border-primary/30 text-primary">Offer Sent</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">$245,000 • Cash Offer</p>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}