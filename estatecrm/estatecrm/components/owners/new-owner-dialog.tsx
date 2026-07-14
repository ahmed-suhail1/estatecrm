'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOwner } from '@/lib/hooks/use-owners';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useSimilarOwners } from '@/lib/hooks/use-duplicate-detection';
import { DuplicateWarning } from '@/components/properties/duplicate-warning';
import { useRouter } from 'next/navigation';

export function NewOwnerDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: similar } = useSimilarOwners(phone, name);

  const mutation = useMutation({
    mutationFn: () => createOwner({ name, phone, whatsapp, email, notes }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Owner added');
      setOpen(false);
      router.push(`/owners/${data.id}`);
    },
    onError: () => toast.error('Could not add owner'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" /> New Owner</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Owner</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 555..." />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Same as phone if empty" />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DuplicateWarning owners={similar} />
          <Button className="w-full" disabled={!name.trim()} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Add Owner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
