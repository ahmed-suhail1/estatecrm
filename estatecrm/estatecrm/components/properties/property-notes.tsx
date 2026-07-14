'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { usePropertyNotes } from '@/lib/hooks/use-property-detail';
import { addPropertyNote } from '@/lib/mutations/properties';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { formatRelativeTime, cn } from '@/lib/utils';
import { Send, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Agent } from '@/types/database';
import { toast } from 'sonner';
import { useAgentStore } from '@/lib/stores/agent-store';

export function PropertyNotes({ propertyId }: { propertyId: string }) {
  const { data: notes, isLoading } = usePropertyNotes(propertyId);
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await supabase.from('agents').select('*').eq('is_active', true).order('name');
      return (data ?? []) as Agent[];
    },
  });

  const filteredAgents = agents?.filter((a) =>
    a.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: async () => {
      // Extract @Name mentions -> agent IDs
      const mentioned: string[] = [];
      agents?.forEach((a) => {
        if (body.includes(`@${a.name}`)) mentioned.push(a.id);
      });
      return addPropertyNote(propertyId, body.trim(), mentioned);
    },
    onSuccess: () => {
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['property-notes', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['property-events', propertyId] });
    },
    onError: () => toast.error('Could not post note'),
  });

  function handleTextChange(value: string) {
    setBody(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/@(\w*)$/);
    if (match) {
      setShowMentions(true);
      setMentionQuery(match[1]);
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(name: string) {
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const upToCursor = body.slice(0, cursor);
    const replaced = upToCursor.replace(/@(\w*)$/, `@${name} `);
    setBody(replaced + body.slice(cursor));
    setShowMentions(false);
    textareaRef.current?.focus();
  }

  if (!currentAgent) return null;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-14 flex-1" />
            </div>
          ))}
        </div>
      ) : !notes || notes.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No notes yet" description="Be the first to leave one." className="py-6" />
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin pr-1">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-3">
              <Avatar
                name={note.agent?.name ?? '?'}
                color={note.agent?.avatar_color}
                url={note.agent?.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{note.agent?.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(note.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {note.body.split(/(@[A-Za-z]+\s?[A-Za-z]*)/g).map((part, i) =>
                      part.startsWith('@') ? (
                        <span key={i} className="text-primary font-medium">{part}</span>
                      ) : (
                        part
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex gap-2 items-start pt-2 border-t border-border">
        <Avatar name={currentAgent.name} color={currentAgent.avatar_color} url={currentAgent.avatar_url} size="sm" />
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Add a note... use @ to mention a teammate"
            className="min-h-[44px] pr-10"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                e.preventDefault();
                if (body.trim()) mutation.mutate();
              }
            }}
          />
          <Button
            size="icon-sm"
            className="absolute right-1.5 bottom-1.5"
            disabled={!body.trim()}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>

          {showMentions && filteredAgents && filteredAgents.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-56 rounded-xl border border-border bg-surface shadow-popover p-1 z-10 animate-scale-in">
              {filteredAgents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => insertMention(a.name)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover'
                  )}
                >
                  <Avatar name={a.name} color={a.avatar_color} size="xs" />
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
