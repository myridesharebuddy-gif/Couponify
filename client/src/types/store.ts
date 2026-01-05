export interface StoreRecord {
  id: string;
  name: string;
  slug?: string;
  category?: string;
  website: string;
  domain: string;
  domains: string[];
  country: string;
  popularityWeight: number;
  categories: string[];
  aliases: string[];
  createdAt: string;
}
