export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  images: string[];
  discount?: number;
  rating?: number;
  reviewCount?: number;
  created_at: string;
  stock?: number;
  total_stock?: number;
  category?: string;
  
  // Gadgets Specs
  ram?: string;
  storage?: string;
  screen_hz?: string;
  battery?: string;
  watt_amp?: string;
  
  // Discount Timer Option
  discountTimelineHours?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  customer_name: string;
  whatsapp: string;
  location: string;
  status: 'pending' | 'confirmed';
  created_at: string;
}

export interface Banner {
  id: string;
  image: string;
  title?: string;
  created_at: string;
}
