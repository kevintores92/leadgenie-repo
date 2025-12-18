import React, { useState } from "react";
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

// Mock Data for Threads
const threads = [
  {
    id: 1,
    name: "Michael Scott",
    avatar: "MS",
    lastMessage: "I'm interested in the property at 123 Main St. Is it still available?",
    time: "10:42 AM",
    unread: 2,
    status: "hot", // hot, warm, cold
    online: true,
  },
  {
    id: 2,
    name: "Sarah Connor",
    avatar: "SC",
    lastMessage: "Can we schedule a call for tomorrow regarding the offer?",
    time: "Yesterday",
    unread: 0,
    status: "warm",
    online: false,
  },
  {
    id: 3,
    name: "Jim Halpert",
    avatar: "JH",
    lastMessage: "Thanks for the info. I'll get back to you.",
    time: "Yesterday",
    unread: 0,
    status: "nurture",
    online: true,
  },
  {
    id: 4,
    name: "Dwight Schrute",
    avatar: "DS",
    lastMessage: "The beets capability of this land is distinct.",
    time: "Mon",
    unread: 0,
    status: "cold",
    online: false,
  },
  {
    id: 5,
    name: "Pam Beesly",
    avatar: "PB",
    lastMessage: "Did you get the documents I sent over?",
    time: "Mon",
    unread: 0,
    status: "warm",
    online: true,
  },
];

// Mock Data for Messages
const activeMessages = [
  {
    id: 1,
    sender: "them",
    text: "Hi, I saw your listing for the duplex on Elm Street.",
    time: "10:30 AM",
  },
  {
    id: 2,
    sender: "me",
    text: "Hello Michael! Yes, it's a great property. Are you looking to invest or live there?",
    time: "10:32 AM",
  },
  {
    id: 3,
    sender: "them",
    text: "Looking to invest. I have a few questions about the roof age and the HVAC.",
    time: "10:35 AM",
  },
  {
    id: 4,
    sender: "me",
    text: "The roof was replaced in 2021 and the HVAC is about 5 years old. It's in solid shape.",
    time: "10:38 AM",
  },
  {
    id: 5,
    sender: "them",
    text: "That sounds promising. I'm interested in the property at 123 Main St. Is it still available?",
    time: "10:42 AM",
  },
];

export default function MessengerPage() {
  const [selectedThread, setSelectedThread] = useState(threads[0]);
  const [messageInput, setMessageInput] = useState("");

  return (
    <MainLayout title="Inbox">
      <div className="flex h-full w-full">
        {/* LEFT SIDEBAR - THREADS LIST */}
        <div className="w-80 md:w-96 border-r border-border flex flex-col bg-sidebar/50 backdrop-blur-sm h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-heading font-bold">Threads</h1>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Plus className="h-5 w-5 text-primary" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages..." 
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
              {threads.map((thread) => (
                <div 
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`p-4 border-b border-border/30 cursor-pointer hover:bg-secondary/30 transition-colors flex gap-3 ${selectedThread.id === thread.id ? 'bg-secondary/40 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
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
          <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/20 text-primary">{selectedThread.avatar}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-semibold">{selectedThread.name}</h2>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-red-500/10 text-red-500 border-red-500/20">Hot Lead</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online now
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

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex justify-center">
                <span className="text-xs text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full">Today, 10:23 AM</span>
              </div>
              
              {activeMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex w-full ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[75%] gap-2 ${msg.sender === 'me' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className={msg.sender === 'me' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}>
                        {msg.sender === 'me' ? 'You' : selectedThread.avatar}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`group relative p-3.5 rounded-2xl shadow-sm text-sm ${
                      msg.sender === 'me' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-card border border-border/50 text-card-foreground rounded-tl-sm'
                    }`}>
                      {msg.text}
                      <div className={`absolute bottom-0 ${msg.sender === 'me' ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground py-2`}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                    <p className="font-medium">+1 (555) 123-4567</p>
                    <p className="text-xs text-muted-foreground">Mobile</p>
                  </div>
                </div>
                
                <div className="group flex items-start gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                  <div className="flex-1">
                    <p className="font-medium">michael.scott@dunder.com</p>
                    <p className="text-xs text-muted-foreground">Email</p>
                  </div>
                </div>
                
                <div className="group flex items-start gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                  <div className="flex-1">
                    <p className="font-medium">10:42 AM (Local)</p>
                    <p className="text-xs text-muted-foreground">Scranton, PA</p>
                  </div>
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