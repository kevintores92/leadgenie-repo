import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Filter, Download, Upload, Trash2, Settings, 
  MoreHorizontal, ArrowUpDown, Mail, 
  MessageSquare, Edit2, User, Tag, Star, Archive,
  LayoutGrid, Flame, Sun, Sprout, Droplets, Ban, XCircle, Slash, CircleDashed, X
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MainLayout from "@/components/layout/MainLayout";

// Status configuration
const STATUS_CONFIG = {
  hot: { label: "Hot", icon: Flame, color: "text-red-600", bg: "bg-red-600" },
  warm: { label: "Warm", icon: Sun, color: "text-yellow-600", bg: "bg-yellow-600" },
  nurture: { label: "Nurture", icon: Sprout, color: "text-green-600", bg: "bg-green-600" },
  drip: { label: "Drip", icon: Droplets, color: "text-blue-600", bg: "bg-blue-600" },
  not_interested: { label: "Not interested", icon: Ban, color: "text-gray-600", bg: "bg-gray-600" },
  wrong_number: { label: "Wrong number", icon: XCircle, color: "text-rose-600", bg: "bg-rose-600" },
  dnc: { label: "DNC", icon: Slash, color: "text-red-700", bg: "bg-red-700" },
  no_status: { label: "No status", icon: CircleDashed, color: "text-gray-500", bg: "bg-gray-500" },
};

const CONTACT_FIELD_OPTIONS = [
  "firstName", "lastName", "phone", "propertyAddress", "propertyCity", "propertyState", "propertyZip",
  "mailingAddress", "mailingCity", "mailingState", "mailingZip", "status", "groups",
  "propertyType", "bedrooms", "bathrooms", "estValue", "estEquity", "estLTV",
  "totalAssessedValue", "lastSaleAmount", "yearBuilt"
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCount, setSelectedCount] = useState(0);
  const [groups, setGroups] = useState(["Frequent", "Hot Lead", "Warm Lead", "Cold", "Investor"]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [statusPopupId, setStatusPopupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("firstName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showImportMapping, setShowImportMapping] = useState(false);
  const [importFileData, setImportFileData] = useState<any>(null);
  const [importFileName, setImportFileName] = useState("");
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [visibleColumns, setVisibleColumns] = useState({
    firstName: true,
    lastName: true,
    phone: true,
    propertyAddress: true,
    propertyCity: false,
    propertyState: false,
    propertyZip: false,
    mailingAddress: true,
    mailingCity: false,
    mailingState: false,
    mailingZip: false,
    status: true,
    groups: true,
    propertyType: false,
    bedrooms: false,
    bathrooms: false,
    estValue: false,
    estEquity: false,
    estLTV: false,
    totalAssessedValue: false,
    lastSaleAmount: false,
    yearBuilt: false,
  });

  // Fetch contacts from backend API
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/contacts', {
          headers: {
            'x-organization-id': 'default-org'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch contacts');
        const data = await response.json();
        
        // Map CSV contacts to UI format
        const mappedContacts = data.map((contact: any) => {
          // Merge Owner 1 First and Last Name
          const ownerFirstName = contact['Owner 1 First Name'] || contact.firstName || '';
          const ownerLastName = contact['Owner 1 Last Name'] || contact.lastName || '';
          const mergedName = `${ownerFirstName} ${ownerLastName}`.trim() || 'Unknown';
          
          // Merge Property Address: Address, City, State, Zip
          const propertyAddressLine = contact.Address || '';
          const propertyCity = contact.City || '';
          const propertyState = contact.State || '';
          const propertyZip = contact.Zip || '';
          const mergedPropertyAddress = [propertyAddressLine, propertyCity, propertyState, propertyZip]
            .filter(Boolean)
            .join(', ') || '-';
          
          // Merge Mailing Address: Mailing Address, Mailing City, Mailing State, Mailing Zip
          const mailingAddressLine = contact['Mailing Address'] || '';
          const mailingCity = contact['Mailing City'] || '';
          const mailingState = contact['Mailing State'] || '';
          const mailingZip = contact['Mailing Zip'] || '';
          const mergedMailingAddress = [mailingAddressLine, mailingCity, mailingState, mailingZip]
            .filter(Boolean)
            .join(', ') || '-';
          
          // Map Mobile Phone to Phone
          const phone = contact['Mobile Phone'] || contact.phone || contact.email || '-';
          
          return {
            id: contact.id,
            name: mergedName,
            phone: phone,
            propertyAddress: mergedPropertyAddress,
            mailingAddress: mergedMailingAddress,
            status: contact.status || 'no_status',
            groups: contact.groups || [],
            // Additional property details
            propertyType: contact['Property Type'] || '-',
            bedrooms: contact.Bedrooms || '-',
            bathrooms: contact['Total Bathrooms'] || '-',
            estValue: contact['Est. Value'] ? `$${parseInt(contact['Est. Value']).toLocaleString()}` : '-',
            estEquity: contact['Est. Equity'] ? `$${parseInt(contact['Est. Equity']).toLocaleString()}` : '-',
            estLTV: contact['Est. Loan-to-Value'] ? `${contact['Est. Loan-to-Value']}%` : '-',
            totalAssessedValue: contact['Total Assessed Value'] ? `$${parseInt(contact['Total Assessed Value']).toLocaleString()}` : '-',
            lastSaleAmount: contact['Last Sale Amount'] ? `$${parseInt(contact['Last Sale Amount']).toLocaleString()}` : '-',
            yearBuilt: contact['Effective Year Built'] || '-',
            selected: false,
            // Keep original fields for backend
            ...contact
          };
        });
        
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

  // Update contact status
  const updateContactStatus = (contactId: number, newStatus: string) => {
    const updated = contacts.map(c => 
      c.id === contactId ? { ...c, status: newStatus } : c
    );
    setContacts(updated);
    setStatusPopupId(null);
  };

  // Add group to selected contacts
  const addGroupToSelected = (groupName: string) => {
    const updated = contacts.map(c => {
      if (c.selected) {
        const newGroups = Array.isArray(c.groups) ? c.groups : [];
        if (!newGroups.includes(groupName)) {
          return { ...c, groups: [...newGroups, groupName] };
        }
      }
      return c;
    });
    setContacts(updated);
  };

  // Create new group
  const createGroup = () => {
    if (newGroupName.trim() && !groups.includes(newGroupName)) {
      setGroups([...groups, newGroupName]);
      setNewGroupName("");
      setShowGroupDialog(false);
      // Add to selected contacts if any
      if (selectedCount > 0) {
        addGroupToSelected(newGroupName);
      }
    }
  };

  // Delete selected contacts
  const deleteSelected = () => {
    const updated = contacts.filter(c => !c.selected);
    setContacts(updated);
    setSelectedCount(0);
  };

  // Handle column sorting
  const handleColumnSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Change sort column and reset to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get selected contacts
  const selectedContacts = contacts.filter(c => c.selected);

  // Filter contacts based on active filter
  const filteredContacts = contacts.filter(c => {
    if (activeFilter === "all") return true;
    if (activeFilter === "phone") return c.phone !== '-';
    if (activeFilter === "frequent") return Array.isArray(c.groups) && c.groups.includes('Frequent');
    return true;
  });

  // Search contacts
  const searchedContacts = filteredContacts.filter(c => {
    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort contacts
  const sortedContacts = [...searchedContacts].sort((a, b) => {
    let aVal = a[sortBy as keyof typeof a];
    let bVal = b[sortBy as keyof typeof b];

    // Handle numeric values
    if (typeof aVal === 'string' && aVal.includes('$')) {
      aVal = parseInt(aVal.replace(/[$,]/g, '')) || 0;
      bVal = parseInt((bVal as string).replace(/[$,]/g, '')) || 0;
    }

    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    // Handle numeric comparison
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  // Get status counts
  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc, key) => {
    const status = key as keyof typeof STATUS_CONFIG;
    const count = contacts.filter(c => c.status === status).length;
    return { ...acc, [status]: count };
  }, {} as Record<string, number>);

  // Export contacts to CSV
  const exportContacts = () => {
    const dataToExport = (selectedCount > 0 ? selectedContacts : contacts);
    const headers = Object.keys(dataToExport[0] || {});
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(contact =>
        headers.map(header => {
          const value = contact[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Import contacts from CSV - opens mapping dialog
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Extract filename without extension for the group name
    const fileNameWithoutExt = file.name.split('.')[0];
    setImportFileName(fileNameWithoutExt);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Store headers and sample data for mapping
        setImportFileData({
          headers,
          rawLines: lines.slice(1).filter(line => line.trim()),
        });

        // Initialize mapping (try to match headers automatically)
        const initialMapping: { [key: string]: string } = {};
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('first') && lowerHeader.includes('name')) initialMapping[header] = 'firstName';
          else if (lowerHeader.includes('last') && lowerHeader.includes('name')) initialMapping[header] = 'lastName';
          else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile')) initialMapping[header] = 'phone';
          else if (lowerHeader.includes('address') && !lowerHeader.includes('mailing')) {
            if (lowerHeader.includes('city')) initialMapping[header] = 'propertyCity';
            else if (lowerHeader.includes('state')) initialMapping[header] = 'propertyState';
            else if (lowerHeader.includes('zip')) initialMapping[header] = 'propertyZip';
            else initialMapping[header] = 'propertyAddress';
          }
          else if (lowerHeader.includes('mailing')) {
            if (lowerHeader.includes('city')) initialMapping[header] = 'mailingCity';
            else if (lowerHeader.includes('state')) initialMapping[header] = 'mailingState';
            else if (lowerHeader.includes('zip')) initialMapping[header] = 'mailingZip';
            else initialMapping[header] = 'mailingAddress';
          }
          else if (lowerHeader.includes('city')) initialMapping[header] = 'propertyCity';
          else if (lowerHeader.includes('state')) initialMapping[header] = 'propertyState';
          else if (lowerHeader.includes('zip')) initialMapping[header] = 'propertyZip';
          else if (lowerHeader.includes('type')) initialMapping[header] = 'propertyType';
          else if (lowerHeader.includes('bedroom')) initialMapping[header] = 'bedrooms';
          else if (lowerHeader.includes('bathroom')) initialMapping[header] = 'bathrooms';
          else if (lowerHeader.includes('value') || lowerHeader.includes('est')) initialMapping[header] = 'estValue';
          else initialMapping[header] = ''; // Leave unmapped
        });

        setColumnMapping(initialMapping);
        setShowImportMapping(true);
      } catch (error) {
        console.error('Error parsing import file:', error);
        alert('Error parsing file. Please ensure it is a valid CSV.');
      }
    };
    reader.readAsText(file);
  };

  // Complete the import after mapping
  const completeImport = () => {
    if (!importFileData) return;

    try {
      const { headers, rawLines } = importFileData;
      
      // Create the group with filename + timestamp
      const timestamp = new Date();
      const newGroupName = `${importFileName} ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
      
      // Add group if it doesn't exist
      if (!groups.includes(newGroupName)) {
        setGroups([...groups, newGroupName]);
      }
      
      // Parse contacts using the mapping
      const newContacts = rawLines
        .map((line, idx) => {
          const values = line.split(',').map(v => v.trim());
          const contact: any = { 
            id: Date.now() + idx, 
            selected: false,
            groups: [newGroupName], // Add to auto-created group
          };

          // Map CSV columns to contact fields based on mapping
          headers.forEach((header, index) => {
            const fieldName = columnMapping[header];
            if (fieldName) {
              contact[fieldName] = values[index] || '';
            }
          });

          // Ensure required fields exist
          if (!contact.firstName) contact.firstName = '';
          if (!contact.lastName) contact.lastName = '';
          if (!contact.phone) contact.phone = '';
          if (!contact.propertyAddress) contact.propertyAddress = '';
          if (!contact.status) contact.status = 'no_status';

          return contact;
        })
        .filter(c => c.firstName || c.lastName || c.phone); // Filter out empty rows

      // Add contacts with the group assigned
      setContacts([...contacts, ...newContacts]);
      
      console.log(`Imported ${newContacts.length} contacts to group "${newGroupName}"`);
      
      // Reset import state
      setShowImportMapping(false);
      setImportFileData(null);
      setImportFileName("");
      setColumnMapping({});
    } catch (error) {
      console.error('Error completing import:', error);
      alert('Error importing contacts. Please try again.');
    }
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
            <div className="relative">
              <input
                type="file"
                id="import-file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
              <label htmlFor="import-file" className="block">
                <Button 
                  asChild
                  className="w-full justify-start gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 mb-6 font-medium h-12 cursor-pointer"
                >
                  <span className="cursor-pointer">
                    <Upload className="h-5 w-5" />
                    Import Contacts
                  </span>
                </Button>
              </label>
            </div>

            <nav className="space-y-1">
              <SidebarItem icon={<User size={18} />} label="Contacts" count={contacts.length} active />
              <SidebarItem icon={<Star size={18} />} label="Frequent" count={3} />
              <SidebarItem icon={<Archive size={18} />} label="Other contacts" count={12} />
            </nav>

            <Separator className="my-4 bg-border/50" />

            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groups</span>
            </div>
            <nav className="space-y-1">
              {groups.map((group) => (
                <SidebarItem 
                  key={group}
                  icon={<Tag size={18} className="text-blue-400" />} 
                  label={group}
                  onClick={() => {
                    // Filter contacts by group
                    const filtered = contacts.filter(c => 
                      Array.isArray(c.groups) && c.groups.includes(group)
                    );
                    console.log(`Filter by group: ${group}`, filtered);
                  }}
                />
              ))}
            </nav>

            <Separator className="my-4 bg-border/50" />

            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
            </div>
            <nav className="space-y-1">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                const count = statusCounts[key] || 0;
                return (
                  <SidebarItem 
                    key={key}
                    icon={<Icon size={18} className={config.color} />} 
                    label={config.label}
                    count={count}
                    onClick={() => setActiveFilter(key === 'no_status' ? 'all' : key)}
                  />
                );
              })}
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => console.log('Send email to', selectedContacts.map(c => c.phone))}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => console.log('Send SMS to', selectedContacts.map(c => c.phone))}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        Group
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                      <DropdownMenuLabel>Add to Group</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {groups.map((group) => (
                        <DropdownMenuItem 
                          key={group}
                          onClick={() => addGroupToSelected(group)}
                        >
                          {group}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowGroupDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                    onClick={deleteSelected}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Separator orientation="vertical" className="h-6 bg-border" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={exportContacts}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search contacts..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-transparent border-none shadow-none h-8 text-sm focus-visible:ring-0" 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
               <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={activeFilter === "all"} onCheckedChange={() => setActiveFilter("all")}>All Contacts</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={activeFilter === "phone"} onCheckedChange={() => setActiveFilter("phone")}>Has Phone Number</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={activeFilter === "frequent"} onCheckedChange={() => setActiveFilter("frequent")}>Frequent Contacts</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8">
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border-border max-h-96 overflow-y-auto">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={visibleColumns.phone} onCheckedChange={() => toggleColumn('phone')}>Phone</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.propertyAddress} onCheckedChange={() => toggleColumn('propertyAddress')}>Property Address</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.propertyCity} onCheckedChange={() => toggleColumn('propertyCity')}>Property City</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.propertyState} onCheckedChange={() => toggleColumn('propertyState')}>Property State</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.propertyZip} onCheckedChange={() => toggleColumn('propertyZip')}>Property Zip</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.mailingAddress} onCheckedChange={() => toggleColumn('mailingAddress')}>Mailing Address</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.mailingCity} onCheckedChange={() => toggleColumn('mailingCity')}>Mailing City</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.mailingState} onCheckedChange={() => toggleColumn('mailingState')}>Mailing State</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.mailingZip} onCheckedChange={() => toggleColumn('mailingZip')}>Mailing Zip</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.status} onCheckedChange={() => toggleColumn('status')}>Status</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.groups} onCheckedChange={() => toggleColumn('groups')}>Groups</DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={visibleColumns.propertyType} onCheckedChange={() => toggleColumn('propertyType')}>Property Type</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.bedrooms} onCheckedChange={() => toggleColumn('bedrooms')}>Bedrooms</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.bathrooms} onCheckedChange={() => toggleColumn('bathrooms')}>Bathrooms</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.yearBuilt} onCheckedChange={() => toggleColumn('yearBuilt')}>Year Built</DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={visibleColumns.estValue} onCheckedChange={() => toggleColumn('estValue')}>Est. Value</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.estEquity} onCheckedChange={() => toggleColumn('estEquity')}>Est. Equity</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.estLTV} onCheckedChange={() => toggleColumn('estLTV')}>Est. LTV</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.totalAssessedValue} onCheckedChange={() => toggleColumn('totalAssessedValue')}>Total Assessed Value</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.lastSaleAmount} onCheckedChange={() => toggleColumn('lastSaleAmount')}>Last Sale Amount</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-6 mx-1" />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={exportContacts}
              >
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
                          checked={selectedCount === sortedContacts.length && sortedContacts.length > 0} 
                          onCheckedChange={(checked) => toggleSelectAll(checked as boolean)}
                          className="border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableHead>
                      <TableHead className="w-[200px] cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('firstName')}>
                        <div className="flex items-center gap-1">
                          First Name 
                          {sortBy === 'firstName' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                        </div>
                      </TableHead>
                      {visibleColumns.lastName && (
                        <TableHead className="w-[200px] cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('lastName')}>
                          <div className="flex items-center gap-1">
                            Last Name
                            {sortBy === 'lastName' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.phone && (
                        <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('phone')}>
                          <div className="flex items-center gap-1">
                            Phone
                            {sortBy === 'phone' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.propertyAddress && (
                        <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('propertyAddress')}>
                          <div className="flex items-center gap-1">
                            Property Address
                            {sortBy === 'propertyAddress' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.mailingAddress && <TableHead>Mailing Address</TableHead>}
                      {visibleColumns.status && <TableHead>Status</TableHead>}
                      {visibleColumns.groups && <TableHead>Groups</TableHead>}
                      {visibleColumns.propertyType && <TableHead>Type</TableHead>}
                      {visibleColumns.bedrooms && (
                        <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('bedrooms')}>
                          <div className="flex items-center gap-1">
                            Beds
                            {sortBy === 'bedrooms' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.bathrooms && (
                        <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('bathrooms')}>
                          <div className="flex items-center gap-1">
                            Baths
                            {sortBy === 'bathrooms' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.yearBuilt && (
                        <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('yearBuilt')}>
                          <div className="flex items-center gap-1">
                            Year Built
                            {sortBy === 'yearBuilt' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.estValue && (
                        <TableHead className="text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('estValue')}>
                          <div className="flex items-center justify-end gap-1">
                            Est. Value
                            {sortBy === 'estValue' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.estEquity && (
                        <TableHead className="text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('estEquity')}>
                          <div className="flex items-center justify-end gap-1">
                            Est. Equity
                            {sortBy === 'estEquity' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.estLTV && <TableHead className="text-right">Est. LTV</TableHead>}
                      {visibleColumns.totalAssessedValue && (
                        <TableHead className="text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('totalAssessedValue')}>
                          <div className="flex items-center justify-end gap-1">
                            Assessed Value
                            {sortBy === 'totalAssessedValue' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.lastSaleAmount && (
                        <TableHead className="text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleColumnSort('lastSaleAmount')}>
                          <div className="flex items-center justify-end gap-1">
                            Last Sale
                            {sortBy === 'lastSaleAmount' && <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedContacts.map((contact) => (
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
                                {`${contact.firstName || ''} ${contact.lastName || ''}`.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'UN'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold text-foreground">{`${contact.firstName || ''} ${contact.lastName || ''}`.trim()}</span>
                          </div>
                        </TableCell>
                        {visibleColumns.lastName && (
                          <TableCell className="text-muted-foreground text-sm">{contact.lastName}</TableCell>
                        )}
                        {visibleColumns.phone && (
                          <TableCell className="text-muted-foreground text-sm font-mono">{contact.phone}</TableCell>
                        )}
                        {visibleColumns.propertyAddress && (
                          <TableCell className="text-muted-foreground text-sm">{contact.propertyAddress}</TableCell>
                        )}
                        {visibleColumns.propertyCity && (
                          <TableCell className="text-muted-foreground text-sm">{contact.propertyCity}</TableCell>
                        )}
                        {visibleColumns.propertyState && (
                          <TableCell className="text-muted-foreground text-sm">{contact.propertyState}</TableCell>
                        )}
                        {visibleColumns.propertyZip && (
                          <TableCell className="text-muted-foreground text-sm">{contact.propertyZip}</TableCell>
                        )}
                        {visibleColumns.mailingAddress && (
                          <TableCell className="text-muted-foreground text-sm">{contact.mailingAddress}</TableCell>
                        )}
                        {visibleColumns.mailingCity && (
                          <TableCell className="text-muted-foreground text-sm">{contact.mailingCity}</TableCell>
                        )}
                        {visibleColumns.mailingState && (
                          <TableCell className="text-muted-foreground text-sm">{contact.mailingState}</TableCell>
                        )}
                        {visibleColumns.mailingZip && (
                          <TableCell className="text-muted-foreground text-sm">{contact.mailingZip}</TableCell>
                        )}
                        {visibleColumns.status && (
                          <TableCell className="relative">
                            <div 
                              className="inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                              onMouseEnter={() => setStatusPopupId(contact.id)}
                              onMouseLeave={() => setStatusPopupId(null)}
                            >
                              {(() => {
                                const config = STATUS_CONFIG[contact.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.no_status;
                                const Icon = config.icon;
                                return (
                                  <>
                                    <Icon className={`h-4 w-4 ${config.color}`} />
                                    <span className="text-xs text-muted-foreground">{config.label}</span>
                                  </>
                                );
                              })()}
                              {/* Status Popup */}
                              {statusPopupId === contact.id && (
                                <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-2 flex gap-1 z-50 whitespace-nowrap">
                                  {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                                    const Icon = config.icon;
                                    return (
                                      <button
                                        key={statusKey}
                                        onClick={() => updateContactStatus(contact.id, statusKey)}
                                        title={config.label}
                                        className={`p-1.5 rounded hover:bg-secondary transition ${statusKey === contact.status ? 'bg-secondary' : ''}`}
                                      >
                                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.groups && (
                          <TableCell className="text-muted-foreground text-sm">
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(contact.groups) && contact.groups.length > 0 ? (
                                contact.groups.map((group) => (
                                  <Badge key={group} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent text-xs">
                                    {group}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.propertyType && (
                          <TableCell className="text-muted-foreground text-sm">{contact.propertyType}</TableCell>
                        )}
                        {visibleColumns.bedrooms && (
                          <TableCell className="text-center text-muted-foreground text-sm">{contact.bedrooms}</TableCell>
                        )}
                        {visibleColumns.bathrooms && (
                          <TableCell className="text-center text-muted-foreground text-sm">{contact.bathrooms}</TableCell>
                        )}
                        {visibleColumns.yearBuilt && (
                          <TableCell className="text-center text-muted-foreground text-sm">{contact.yearBuilt}</TableCell>
                        )}
                        {visibleColumns.estValue && (
                          <TableCell className="text-right text-muted-foreground text-sm font-semibold">{contact.estValue}</TableCell>
                        )}
                        {visibleColumns.estEquity && (
                          <TableCell className="text-right text-muted-foreground text-sm font-semibold">{contact.estEquity}</TableCell>
                        )}
                        {visibleColumns.estLTV && (
                          <TableCell className="text-right text-muted-foreground text-sm">{contact.estLTV}</TableCell>
                        )}
                        {visibleColumns.totalAssessedValue && (
                          <TableCell className="text-right text-muted-foreground text-sm font-semibold">{contact.totalAssessedValue}</TableCell>
                        )}
                        {visibleColumns.lastSaleAmount && (
                          <TableCell className="text-right text-muted-foreground text-sm font-semibold">{contact.lastSaleAmount}</TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => console.log('Open message for', `${contact.firstName} ${contact.lastName}`)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => console.log('Edit contact', `${contact.firstName} ${contact.lastName}`)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-border">
                                <DropdownMenuItem onClick={() => console.log('View details for', `${contact.firstName} ${contact.lastName}`)}>View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log('Add to campaign for', `${contact.firstName} ${contact.lastName}`)}>Add to Campaign</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-400" onClick={() => {
                                  const updated = contacts.filter(c => c.id !== contact.id);
                                  setContacts(updated);
                                }}>Delete</DropdownMenuItem>
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
                <span>Showing {sortedContacts.length} of {contacts.length} contacts</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled className="h-7 text-xs border-border/50">Previous</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs border-border/50 hover:bg-secondary/50">Next</Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </main>
      </div>


      {/* Import Mapping Dialog */}
      <Dialog open={showImportMapping} onOpenChange={setShowImportMapping}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map CSV Columns to Contact Fields</DialogTitle>
            <DialogDescription>
              Select which contact field each CSV column should map to. A new group "{importFileName}" will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {importFileData?.headers.map((header: string) => (
              <div key={header} className="grid grid-cols-2 gap-4 items-center">
                <div className="text-sm font-medium">{header}</div>
                <select
                  value={columnMapping[header] || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value })}
                  className="w-full p-2 border border-border rounded bg-background text-foreground"
                >
                  <option value="">-- Don't Import --</option>
                  {CONTACT_FIELD_OPTIONS.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowImportMapping(false);
                setImportFileData(null);
              }}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={completeImport}
              className="bg-primary hover:bg-primary/90"
            >
              Import Contacts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a new group to organize your contacts for campaigns and bulk actions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Input
                id="group-name"
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createGroup()}
                className="col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowGroupDialog(false)}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={createGroup}
              disabled={!newGroupName.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function SidebarItem({ icon, label, count, active, onClick }: { icon: React.ReactNode, label: string, count?: number, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-r-full mr-2 cursor-pointer transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
    >
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