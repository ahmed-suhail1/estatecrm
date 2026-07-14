'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePropertyDetail } from '@/lib/hooks/use-property-detail';
import { PropertyGallery } from '@/components/properties/property-gallery';
import { PropertyTimeline } from '@/components/properties/property-timeline';
import { PropertyNotes } from '@/components/properties/property-notes';
import { PropertyVersionHistory } from '@/components/properties/property-version-history';
import { StatusChanger } from '@/components/properties/status-changer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Bed, Bath, Ruler, Building, Calendar, MapPin, Phone, MessageCircle, Star,
  Pencil, ArrowLeft, Hash, ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatArea, formatDate, phoneToCall, phoneToWhatsApp } from '@/lib/utils';
import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/types/database';
import { recordView, toggleFavorite } from '@/lib/mutations/properties';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFavoritesSet } from '@/lib/hooks/use-favorites';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: property, isLoading } = usePropertyDetail(id);
  const favIds = useFavoritesSet();
  const queryClient = useQueryClient();
  const isFavorited = favIds.has(id);

  useEffect(() => {
    if (id) recordView(id);
  }, [id]);

  const favMutation = useMutation({
    mutationFn: () => toggleFavorite(id, isFavorited),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  if (isLoading || !property) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="aspect-[16/9] w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const specs = [
    { icon: Bed, label: 'Bedrooms', value: property.bedrooms ?? '—' },
    { icon: Bath, label: 'Bathrooms', value: property.bathrooms ?? '—' },
    { icon: Ruler, label: 'Area', value: formatArea(property.area_sqm) },
    { icon: Building, label: 'Floor', value: property.floor ?? '—' },
    { icon: Calendar, label: 'Building age', value: property.building_age != null ? `${property.building_age} yrs` : '—' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-16">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => favMutation.mutate()}>
            <Star className={cn('h-4 w-4', isFavorited ? 'fill-amber-400 text-amber-400' : '')} />
          </Button>
          <Button variant="outline" onClick={() => router.push(`/properties/${id}/edit`)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      <PropertyGallery propertyId={id} images={property.images ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-semibold">{property.title}</h1>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />{property.code}
                  </span>
                </div>
                {(property.address || property.district || property.city) && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {[property.address, property.district, property.city].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <StatusChanger propertyId={id} status={property.status} />
            </div>

            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-3xl font-bold">{formatCurrency(property.price, property.currency)}</span>
              {property.listing_type === 'rent' && <span className="text-muted-foreground">/month</span>}
              <Badge variant="outline" className="ml-2">
                {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
              </Badge>
              <Badge variant="outline">{PROPERTY_TYPE_LABELS[property.property_type as PropertyType]}</Badge>
            </div>

            {property.tags && property.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(property.tags as { id: string; label: string; color: string }[]).map((tag) => (
                  <Badge key={tag.id} color={tag.color} bg={`${tag.color}20`}>{tag.label}</Badge>
                ))}
              </div>
            )}
          </div>

          <Card className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {specs.map((spec) => (
                <div key={spec.label} className="flex flex-col gap-1">
                  <spec.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{spec.value}</span>
                  <span className="text-[11px] text-muted-foreground">{spec.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {property.description && (
            <div>
              <h2 className="text-sm font-semibold mb-2">Description</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {property.description}
              </p>
            </div>
          )}

          {property.lat && property.lng && (
            <div>
              <h2 className="text-sm font-semibold mb-2">Location</h2>
              <a
                href={`https://www.google.com/maps?q=${property.lat},${property.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-surface-hover transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Open in Google Maps
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          )}

          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="history">Version History</TabsTrigger>
            </TabsList>
            <TabsContent value="notes">
              <PropertyNotes propertyId={id} />
            </TabsContent>
            <TabsContent value="timeline">
              <PropertyTimeline propertyId={id} />
            </TabsContent>
            <TabsContent value="history">
              <PropertyVersionHistory propertyId={id} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {property.assigned_agent && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Assigned Agent
              </h3>
              <div className="flex items-center gap-3">
                <Avatar
                  name={property.assigned_agent.name}
                  color={property.assigned_agent.avatar_color}
                  url={property.assigned_agent.avatar_url}
                  size="lg"
                />
                <div>
                  <p className="text-sm font-medium">{property.assigned_agent.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{property.assigned_agent.role}</p>
                </div>
              </div>
            </Card>
          )}

          {property.owner && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Owner</h3>
              <p className="text-sm font-medium">{property.owner.name}</p>
              {property.owner.phone && (
                <p className="text-xs text-muted-foreground mt-0.5">{property.owner.phone}</p>
              )}
              <div className="flex gap-2 mt-3">
                {property.owner.phone && (
                  <Button size="sm" variant="secondary" className="flex-1" asChild>
                    <a href={phoneToCall(property.owner.phone)}>
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                  </Button>
                )}
                {(property.owner.whatsapp || property.owner.phone) && (
                  <Button size="sm" variant="secondary" className="flex-1" asChild>
                    <a
                      href={phoneToWhatsApp(property.owner.whatsapp || property.owner.phone || '')}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="w-full mt-2"
                onClick={() => router.push(`/owners/${property.owner!.id}`)}
              >
                View owner profile
              </Button>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDate(property.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last updated</dt>
                <dd>{formatDate(property.updated_at)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
