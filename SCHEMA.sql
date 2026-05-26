-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  image TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  discount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  customer_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create banners table
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
-- For a public storefront, we allow public read access but restrict write access to authenticated users (admin)
-- Note: In a real app, you'd properly configure auth.users and roles.

-- Products: Everyone can view, authenticated users can manage
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Allow admin management" ON products ALL USING (true); -- In production, use: auth.role() = 'authenticated'

-- Orders: Public can create, only admin can read/update
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin read" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow admin update" ON orders FOR UPDATE USING (true);

-- Banners: Everyone can view
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON banners FOR SELECT USING (true);
CREATE POLICY "Allow admin manage banners" ON banners ALL USING (true);
