import { z } from 'zod';

export const propertyFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(5000).optional().or(z.literal('')),
  price: z.coerce.number().positive('Price must be greater than 0'),
  currency: z.string().min(1, 'Required'),
  listing_type: z.enum(['sale', 'rent']),
  property_type: z.enum(['apartment', 'villa', 'house', 'office', 'land', 'shop', 'building', 'other']),
  bedrooms: z.coerce.number().int().min(0).optional().or(z.literal('')),
  bathrooms: z.coerce.number().int().min(0).optional().or(z.literal('')),
  area_sqm: z.coerce.number().positive().optional().or(z.literal('')),
  floor: z.string().max(50).optional().or(z.literal('')),
  building_age: z.coerce.number().int().min(0).max(500).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  lat: z.coerce.number().optional().or(z.literal('')),
  lng: z.coerce.number().optional().or(z.literal('')),
  owner_id: z.string().optional().or(z.literal('')),
  assigned_agent_id: z.string().optional().or(z.literal('')),
  status: z.enum(['available', 'reserved', 'negotiating', 'sold', 'rented', 'archived']),
  tag_ids: z.array(z.string()).default([]),
});

// react-hook-form's `useForm<T>` needs the *input* shape (pre-coercion),
// since that's what field values look like while the user is typing
// (e.g. price starts as a string in the input, not a number). zod's
// coercion happens at validation/submit time. We type the form with the
// input shape and let zodResolver handle the output coercion internally.
export type PropertyFormValues = z.input<typeof propertyFormSchema>;
export type PropertyFormOutput = z.output<typeof propertyFormSchema>;

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY', 'AED'];
