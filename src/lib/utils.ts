import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return `${price.toLocaleString()} ৳`;
}

export function formatWhatsappNumber(num: string): string {
  let cleaned = num.trim().replace(/\s+/g, '').replace(/[-()]/g, '');
  if (!cleaned) return '';
  
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Handled Bangladesh number patterns
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return '+88' + cleaned;
  }
  if (cleaned.startsWith('1') && cleaned.length === 10) {
    return '+880' + cleaned;
  }
  if (cleaned.startsWith('880')) {
    return '+' + cleaned;
  }
  
  if (/^\d{11}$/.test(cleaned) && cleaned.startsWith('0')) {
    return '+88' + cleaned;
  }
  if (/^\d{10}$/.test(cleaned)) {
    return '+880' + cleaned;
  }
  if (/^\d+$/.test(cleaned)) {
    if (cleaned.startsWith('88')) {
      return '+' + cleaned;
    }
    return '+880' + cleaned;
  }
  
  return num.trim();
}
