export interface Seller {
  id: string;
  name: string;
  whatsapp?: string;
  logo?: string;
  facebook?: string;
  tiktok?: string;
  instagram?: string;
  is_top?: boolean;
  is_verified?: boolean;
  created_at: string;
}

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
  flashSaleEnd?: string;
  seller?: string;
  seller_whatsapp?: string;
  seller_logo?: string;
  is_new?: boolean;
  is_super_sale?: boolean;
  super_sale_at?: string;
  order_count?: number;
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

export interface UserProfile {
  username: string;
  email: string;
  uid?: string;
  profileImage?: string;
  whatsapp?: string;
  location?: string;
}
