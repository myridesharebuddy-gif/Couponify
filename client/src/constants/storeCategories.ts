export type StoreCategory = {
  title: string;
  storeNames: string[];
};

export const STORE_CATEGORIES: StoreCategory[] = [
  {
    title: 'Core Retail',
    storeNames: [
      'Amazon',
      'Walmart',
      'Target',
      'Costco',
      "Macy's",
      'Nordstrom',
      "Kohl's",
      'Best Buy',
      'Sears',
      'JCPenney',
      'Bloomingdale’s',
      'Saks Fifth Avenue',
      'Neiman Marcus'
    ]
  },
  {
    title: 'Fashion & Apparel',
    storeNames: [
      'Zara',
      'H&M',
      'Uniqlo',
      'ASOS',
      'Forever 21',
      'Urban Outfitters',
      'Gap',
      'Old Navy',
      'Banana Republic',
      'Abercrombie & Fitch',
      'American Eagle',
      'PacSun',
      'Anthropologie',
      'Free People',
      'Revolve',
      'Boohoo',
      'PrettyLittleThing',
      'Shein',
      'Fashion Nova',
      'Lululemon',
      'Nike',
      'Adidas',
      'Puma',
      'Under Armour',
      'Levi’s',
      'Calvin Klein',
      'Tommy Hilfiger',
      'Ralph Lauren',
      'Gucci',
      'Louis Vuitton'
    ]
  },
  {
    title: 'Shoes & Accessories',
    storeNames: [
      'Foot Locker',
      'DSW',
      'Clarks',
      'Steve Madden',
      'Converse',
      'Vans',
      'Birkenstock',
      'Dr. Martens',
      'TOMS',
      'UGG'
    ]
  },
  {
    title: 'Beauty & Personal Care',
    storeNames: [
      'Sephora',
      'Ulta Beauty',
      'Glossier',
      'Fenty Beauty',
      'Morphe',
      'The Body Shop',
      'Bath & Body Works',
      'Lush',
      'Estée Lauder',
      'MAC Cosmetics',
      'The Ordinary',
      'CeraVe',
      'La Roche-Posay',
      "Paula's Choice",
      "Kiehl's",
      'Clinique',
      'Tatcha',
      'Drunk Elephant',
      'Murad',
      'Sunday Riley',
      'Glow Recipe',
      'COSRX',
      'Laneige'
    ]
  },
  {
    title: 'Electronics & Tech',
    storeNames: ['Apple', 'Samsung', 'Microsoft', 'Sony', 'Dell', 'HP', 'Lenovo', 'Logitech', 'Anker', 'Nintendo']
  },
  {
    title: 'Home & Furniture',
    storeNames: [
      'IKEA',
      'Wayfair',
      'Home Depot',
      "Lowe's",
      'Bed Bath & Beyond',
      'Pottery Barn',
      'Crate & Barrel',
      'West Elm',
      'Houzz',
      'Brooklinen'
    ]
  },
  {
    title: 'Kids, Toys & Gifts',
    storeNames: ['LEGO', 'Disney Store', 'Fisher-Price', 'Build-A-Bear', 'American Girl']
  },
  {
    title: 'Sports & Outdoor',
    storeNames: ['REI', "Dick's Sporting Goods", 'Patagonia', 'The North Face', 'Columbia Sportswear']
  },
  {
    title: 'Food & Specialty',
    storeNames: [
      'Thrive Market',
      'HelloFresh',
      'Blue Apron',
      'Starbucks Online Store',
      'Coca-Cola Shop',
      'Dunkin Donuts'
    ]
  },
  {
    title: 'Misc & Trendy',
    storeNames: ['Etsy', 'eBay', 'Wish', 'AliExpress']
  },
  {
    title: 'Arts, Crafts & DIY',
    storeNames: ['Michael\'s', 'Hobby Lobby', 'Joann Fabrics', 'Blick Art Materials', 'Cricut']
  }
];

export const CATEGORY_TITLES = STORE_CATEGORIES.map((category) => category.title);
