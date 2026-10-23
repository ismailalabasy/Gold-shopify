-- Atelier jewelry MVP — Supabase setup
-- Run in the Supabase SQL Editor in a FRESH project. Review before executing.
-- Create merchant accounts manually in Authentication > Users.
-- Enable RLS and use a browser-safe publishable key ONLY.

create extension if not exists pgcrypto;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  name text not null check (length(name) between 2 and 80),
  tagline text not null default '',
  hero_title text not null default 'Something beautiful awaits.',
  hero_subtitle text not null default '',
  theme text not null default 'ivory' check (theme in ('ivory','obsidian','sage')),
  whatsapp text not null default '',
  address text not null default '',
  instagram text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null check(length(title) between 1 and 120),
  code text not null default '',
  category text not null default 'Other' check(category in ('Rings','Necklaces','Earrings','Bracelets','Other')),
  karat integer not null default 18 check(karat in (14,18,21,24)),
  weight numeric(12,2) check(weight is null or weight > 0),
  price numeric(14,2) check(price is null or price >= 0),
  show_price boolean not null default false,
  status text not null default 'available' check(status in ('available','reserved','sold')),
  description text not null default '',
  image_url text not null default '',
  art text not null default 'ring',
  created_at timestamptz not null default now(),
  constraint visible_price_requires_value check (not show_price or price is not null)
);

create index if not exists products_by_shop on public.products(shop_id, created_at desc);
create index if not exists shops_by_owner on public.shops(owner_id);

alter table public.shops enable row level security;
alter table public.products enable row level security;

-- Restrict grants AND policies. Default grants differ between Supabase projects.
revoke all on table public.shops from anon,authenticated;
revoke all on table public.products from anon,authenticated;
grant select on table public.shops to anon,authenticated;
grant insert, update on table public.shops to authenticated;
grant select on table public.products to anon,authenticated;
grant insert, update, delete on table public.products to authenticated;

-- Public store metadata: shops use a public profile by design.
create policy "Public can view storefront profiles" on public.shops for select to anon,authenticated using (true);
create policy "Owner creates own shop" on public.shops for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owner updates own shop" on public.shops for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- Visitors can only see items that are not sold. Owners can see all their own products.
create policy "Visitors can view public product catalog" on public.products for select to anon,authenticated using (status in ('available','reserved'));
create policy "Owner can view hidden products" on public.products for select to authenticated using (
  exists(select 1 from public.shops s where s.id=shop_id and s.owner_id=(select auth.uid()))
);
create policy "Owner inserts products" on public.products for insert to authenticated with check (
  exists(select 1 from public.shops s where s.id=shop_id and s.owner_id=(select auth.uid()))
);
create policy "Owner edits own products" on public.products for update to authenticated using (
  exists(select 1 from public.shops s where s.id=shop_id and s.owner_id=(select auth.uid()))
) with check (
  exists(select 1 from public.shops s where s.id=shop_id and s.owner_id=(select auth.uid()))
);
create policy "Owner deletes own products" on public.products for delete to authenticated using (
  exists(select 1 from public.shops s where s.id=shop_id and s.owner_id=(select auth.uid()))
);

-- Publicly viewable jewelry images; authenticated merchants upload to their user-ID prefix.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('jewelry-products','jewelry-products',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy "Owners can upload under their own path" on storage.objects
for insert to authenticated
with check (bucket_id='jewelry-products' and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.shops s where s.owner_id=(select auth.uid())));

-- NOTE: The storage bucket is public by design. Upload only public product photography.
-- NOTE: Existing uploaded images are not deleted when a product row is removed.
-- NOTE: Public storefront exposes shop name, contact details, address and display products.
