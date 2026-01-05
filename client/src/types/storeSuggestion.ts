export interface StoreSuggestion {
  id: string;
  name: string;
  website: string;
  domain: string;
  keyword?: string | null;
  status: 'pending' | 'approved';
  votes: number;
  createdAt: string;
}
