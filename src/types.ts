export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  images: string[];
  discount?: number;
  created_at: string;
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
