export type Product = {
  title: string;
  reviews: number;
  price: number;
  handle: string; 
  discountedPrice: number;
  description: string;
  id: number;   
  thumbnail?: string;
  images?: any[];
  variants?: any[];
};
