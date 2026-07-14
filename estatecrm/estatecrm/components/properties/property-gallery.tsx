'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadPropertyImage, deletePropertyImage } from '@/lib/mutations/properties';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PropertyImage } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PropertyGallery({
  propertyId,
  images,
  editable = true,
}: {
  propertyId: string;
  images: PropertyImage[];
  editable?: boolean;
}) {
  const [active, setActive] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const startPos = images.length;
      await Promise.all(
        Array.from(files).map((file, i) => uploadPropertyImage(propertyId, file, startPos + i))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['property-events', propertyId] });
      toast.success('Photos uploaded');
    },
    onError: () => toast.error('Upload failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (img: PropertyImage) => deletePropertyImage(img.id, img.storage_path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      setActive(0);
    },
  });

  if (images.length === 0) {
    return (
      <div className="aspect-[16/9] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 bg-muted/40">
        <ImagePlus className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">No photos yet</p>
        {editable && (
          <>
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} loading={uploadMutation.isPending}>
              Upload photos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploadMutation.mutate(e.target.files)}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-muted group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active].url} alt="" className="h-full w-full object-cover" />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActive((a) => (a + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        {editable && (
          <button
            onClick={() => deleteMutation.mutate(images[active])}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
          {active + 1} / {images.length}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setActive(i)}
            className={cn(
              'relative h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 transition-colors',
              i === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        {editable && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-16 w-16 shrink-0 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-surface-hover transition-colors"
          >
            {uploadMutation.isPending ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadMutation.mutate(e.target.files)}
        />
      </div>
    </div>
  );
}
