import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Star } from "lucide-react";

export default function VendorSearchCombobox({ 
  vendors = [],
  vendorProductIds = [], // IDs of vendors that have this product catalogued
  value, 
  onValueChange, 
  placeholder = "Επιλέξτε προμηθευτή...",
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedVendor = vendors.find(v => v.id === value);

  const filteredVendors = vendors.filter(vendor => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      vendor.name?.toLowerCase().includes(search) ||
      vendor.code?.toLowerCase().includes(search)
    );
  });

  // Sort: vendors with product first, then alphabetically
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    const aHasProduct = vendorProductIds.includes(a.id);
    const bHasProduct = vendorProductIds.includes(b.id);
    
    if (aHasProduct && !bHasProduct) return -1;
    if (!aHasProduct && bHasProduct) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedVendor ? (
            <span className="truncate flex items-center gap-2">
              {vendorProductIds.includes(selectedVendor.id) && (
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              )}
              {selectedVendor.name} ({selectedVendor.code})
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Input
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>No vendors found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {sortedVendors.map((vendor) => {
                const hasProduct = vendorProductIds.includes(vendor.id);
                return (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.id}
                    onSelect={() => {
                      onValueChange(vendor.id);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        value === vendor.id ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {hasProduct && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      <div className="flex flex-col">
                        <span className="font-medium">{vendor.name}</span>
                        <span className="text-xs text-slate-500">{vendor.code}</span>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}