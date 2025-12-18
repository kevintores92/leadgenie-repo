import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Filter, Download, Upload, Trash2, Settings, 
  MoreHorizontal, ArrowUpDown, Mail, 
  MessageSquare, Edit2, User, Tag, Star, Archive,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MainLayout from "@/components/layout/MainLayout";

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCount, setSelectedCount] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    phone: true,
    status: true,
    tags: true,
    lastContact: true,
  });

  // Fetch contacts from backend API
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/contacts');
        if (!response.ok) throw new Error('Failed to fetch contacts');
        const data = await response.json();
        
        // Map database contacts to UI format
        const mappedContacts = data.map((contact: any) => ({
          id: contact.id,
          name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          email: contact.email || '',
          phone: contact.phone || '',
          role: contact.propertyCity ? `Owner in ${contact.propertyCity}` : 'Contact',
          status: 'Prospect',
          tags: contact.propertyState ? [contact.propertyState] : [],
          lastContact: 'Recently added',
          selected: false,
        }));
        
        setContacts(mappedContacts);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setContacts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, []);

  // Handle Select All
  const toggleSelectAll = (checked: boolean) => {
    const updated = contacts.map(c => ({ ...c, selected: checked }));
    setContacts(updated);
    setSelectedCount(checked ? updated.length : 0);
  };

  // Handle Single Select
  const toggleSelect = (id: number) => {
    const updated = contacts.map(c => {
      if (c.id === id) return { ...c, selected: !c.selected };
      return c;
    });
    setContacts(updated);
    setSelectedCount(updated.filter(c => c.selected).length);
  };

  // Toggle Column Visibility
  const toggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  return (
    <MainLayout title="Contacts">
      <div className="flex h-full w-full">
        {/* Sidebar - Google Contacts Style */}
        <aside className="w-64 border-r border-border bg-sidebar/30 hidden md:flex flex-col">
          <div className="p-4 flex items-center gap-2 border-b border-border/50">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
              LG
            </div>
            <span className="font-heading font-bold text-lg">Contacts</span>
          </div>

          <div className="p-3">
            <Button className="w-full justify-start gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 mb-6 font-medium h-12">
              <Plus className="h-5 w-5" />
              Create contact
            </Button>

            <nav className="space-y-1">
              <SidebarItem icon={<User size={18} />} label="Contacts" count={contacts.length} active />
              <SidebarItem icon={<Star size={18} />} label="Frequent" count={3} />
              <SidebarItem icon={<Archive size={18} />} label="Other contacts" count={12} />
            </nav>

            <Separator className="my-4 bg-border/50" />

            <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fix & manage
            </div>
            <nav className="space-y-1">
              <SidebarItem icon={<Settings size={18} />} label="Merge & fix" />
              <SidebarItem icon={<Upload size={18} />} label="Import" />
              <SidebarItem icon={<Trash2 size={18} />} label="Trash" />
            </nav>

            <Separator className="my-4 bg-border/50" />

            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</span>
              <Plus className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
            <nav className="space-y-1">
              <SidebarItem icon={<Tag size={18} className="text-red-400" />} label="Hot Lead" />
              <SidebarItem icon={<Tag size={18} className="text-orange-400" />} label="Warm Lead" />
              <SidebarItem icon={<Tag size={18} className="text-blue-400" />} label="Cold" />
              <SidebarItem icon={<Tag size={18} className="text-green-400" />} label="Investor" />
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-background/50 relative overflow-hidden">
          
          {/* Toolbar / Bulk Actions */}
          <div className="px-6 py-3 border-b border-border/50 flex items-center justify-between bg-secondary/10">
            {selectedCount > 0 ? (
              <div className="flex items-center gap-3 animate-in fade-in duration-200">
                <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                  {selectedCount} selected
                </span>
                <Separator orientation="vertical" className="h-6 bg-border" />
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Tag className="h-4 w-4 mr-2" />
                    Label
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-500 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search contacts..." 
                    className="pl-8 bg-transparent border-none shadow-none h-8 text-sm focus-visible:ring-0" 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked>All Contacts</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Hot Leads Only</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Investors</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Has Phone Number</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8">
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={visibleColumns.email} onCheckedChange={() => toggleColumn('email')}>Email</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.phone} onCheckedChange={() => toggleColumn('phone')}>Phone</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.status} onCheckedChange={() => toggleColumn('status')}>Status</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.tags} onCheckedChange={() => toggleColumn('tags')}>Tags</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.lastContact} onCheckedChange={() => toggleColumn('lastContact')}>Last Contact</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-6 mx-1" />
              
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Upload className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table Area */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={selectedCount === contacts.length && contacts.length > 0} 
                          onCheckedChange={(checked) => toggleSelectAll(checked as boolean)}
                          className="border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableHead>
                      <TableHead className="w-[250px] cursor-pointer hover:text-primary transition-colors">
                        <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></div>
                      </TableHead>
                      {visibleColumns.email && <TableHead>Email</TableHead>}
                      {visibleColumns.phone && <TableHead>Phone Number</TableHead>}
                      {visibleColumns.status && <TableHead>Status</TableHead>}
                      {visibleColumns.tags && <TableHead>Tags</TableHead>}
                      {visibleColumns.lastContact && <TableHead>Last Contact</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow 
                        key={contact.id} 
                        className={`group hover:bg-secondary/20 border-border/30 transition-colors ${contact.selected ? 'bg-secondary/30' : ''}`}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={contact.selected}
                            onCheckedChange={() => toggleSelect(contact.id)}
                            className="border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-secondary text-xs text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                {contact.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-foreground">{contact.name}</span>
                              <span className="text-xs text-muted-foreground">{contact.role}</span>
                            </div>
                          </div>
                        </TableCell>
                        {visibleColumns.email && (
                          <TableCell className="text-muted-foreground text-sm">{contact.email}</TableCell>
                        )}
                        {visibleColumns.phone && (
                          <TableCell className="text-muted-foreground text-sm font-mono">{contact.phone}</TableCell>
                        )}
                        {visibleColumns.status && (
                          <TableCell>
                            <Badge 
                              variant="secondary" 
                              className={`border-transparent ${
                                contact.status.includes('Hot') ? 'bg-red-500/10 text-red-400' :
                                contact.status.includes('Warm') ? 'bg-orange-500/10 text-orange-400' :
                                contact.status.includes('Cold') ? 'bg-blue-500/10 text-blue-400' :
                                'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {contact.status}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.tags && (
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {contact.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground border border-border/50">
                                  {tag}
                                </span>
                              ))}
                              {contact.tags.length > 2 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground border border-border/50">+{contact.tags.length - 2}</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.lastContact && (
                          <TableCell className="text-muted-foreground text-xs">{contact.lastContact}</TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-border">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Add to Campaign</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Showing {contacts.length} contacts</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled className="h-7 text-xs border-border/50">Previous</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs border-border/50 hover:bg-secondary/50">Next</Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </main>
      </div>
    </MainLayout>
  );
}

function SidebarItem({ icon, label, count, active }: { icon: React.ReactNode, label: string, count?: number, active?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-r-full mr-2 cursor-pointer transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {count !== undefined && (
        <span className="text-xs opacity-70">{count}</span>
      )}
    </div>
  );
}