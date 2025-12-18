import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, User } from "lucide-react";

export default function PersonSearchCombobox({ 
  systemUsers = [],
  appUsers = [],
  value, 
  onValueChange, 
  placeholder = "Επιλέξτε ποιος παραλαμβάνει..." 
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Find selected person
  const selectedSystemUser = systemUsers.find(u => u.id === value);
  const selectedAppUser = appUsers.find(u => u.id === value);
  const selectedPerson = selectedSystemUser || selectedAppUser;

  // Filter users
  const filteredSystemUsers = systemUsers.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  const filteredAppUsers = appUsers.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return user.full_name?.toLowerCase().includes(search);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-yellow-50 border-yellow-300"
        >
          {selectedPerson ? (
            <span className="truncate">
              {selectedPerson.full_name}
              {selectedSystemUser && ` (${selectedSystemUser.email})`}
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
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>No person found.</CommandEmpty>
            
            {filteredSystemUsers.length > 0 && (
              <CommandGroup heading="System Users">
                {filteredSystemUsers.map((user) => (
                  <CommandItem
                    key={`sys_${user.id}`}
                    value={user.id}
                    onSelect={() => {
                      onValueChange(user.id);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        value === user.id ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <User className="w-4 h-4 mr-2 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">{user.full_name}</span>
                      <span className="text-xs text-slate-500">{user.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredAppUsers.length > 0 && (
              <CommandGroup heading="Application Users">
                {filteredAppUsers.map((user) => (
                  <CommandItem
                    key={`app_${user.id}`}
                    value={user.id}
                    onSelect={() => {
                      onValueChange(user.id);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        value === user.id ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <User className="w-4 h-4 mr-2 text-green-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">{user.full_name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}