'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Building2, MapPin, Phone, Hash } from 'lucide-react';
import { useAllProperties } from '@/lib/hooks/use-property-search';
import Fuse from 'fuse.js';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { PROPERTY_STATUS_META } from '@/types/database';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { data: properties } = useAllProperties();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const fuse = useMemo(() => {
    if (!properties) return null;
    return new Fuse(properties, {
      keys: ['title', 'address', 'city', 'district', 'owner.name', 'owner.phone', 'code'],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [properties]);

  const results = useMemo(() => {
    if (!query.trim() || !fuse) return [];
    return fuse.search(query).slice(0, 8).map((r) => r.item);
  }, [query, fuse]);

  function go(id: string) {
    setOpen(false);
    setQuery('');
    router.push(`/properties/${id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted-foreground shadow-subtle transition-colors hover:bg-surface-hover w-full max-w-sm"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search properties, owners, phone...</span>
        <kbd className="hidden md:inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-[2px] pt-[12vh] px-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <Command
            shouldFilter={false}
            className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-popover overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search by title, address, phone, price, ID..."
                className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden md:inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                ESC
              </kbd>
            </div>
            <Command.List className="max-h-96 overflow-y-auto scrollbar-thin p-2">
              {query.trim() && results.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No properties match &ldquo;{query}&rdquo;
                </div>
              )}
              {!query.trim() && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Start typing to search across every listing
                </div>
              )}
              {results.map((p) => {
                const meta = PROPERTY_STATUS_META[p.status];
                return (
                  <Command.Item
                    key={p.id}
                    onSelect={() => go(p.id)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer data-[selected=true]:bg-surface-hover"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{p.title}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ color: meta.color, backgroundColor: meta.bg }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {p.code}
                        </span>
                        {p.district && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            {p.district}, {p.city}
                          </span>
                        )}
                        {p.owner?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {p.owner.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold shrink-0">
                      {formatCurrency(p.price, p.currency)}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.List>
          </Command>
        </div>
      )}
    </>
  );
}
