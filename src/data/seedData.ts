/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Batch,
  Customer,
  DispatchOrder,
  MonthlySalesHistory,
  Product,
  PurchaseRequest,
  SupplierQuotation,
  WriteOff,
} from '../types';
import { addDays } from '../utils/rulesEngine';

export const INITIAL_TODAY = '2026-11-11';

// Seeded pseudorandom number generator (LCG)
let s = 123456789;
function seededRandom(): number {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 4294967296;
}

export function resetRng(seed = 123456789) {
  s = seed;
}

// 40 Realistic Pakistani SKUs
export const SEED_PRODUCTS: Product[] = [
  // Biscuits
  {
    sku: 'SKU-BIS-01',
    name: 'Super Egg & Milk Biscuits (Carton 24x)',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 270,
    unitCost: 1950,
    unitPrice: 2400,
    avgDailySales: 28,
    leadTimeDays: 7,
    safetyStock: 120,
    supplier: 'In-house Multan Plant',
    description: 'Crisp, sweet egg & milk snack biscuits. Flagship line.',
  },
  {
    sku: 'SKU-BIS-02',
    name: 'Marie Classic Tea Biscuits (Carton 24x)',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 300,
    unitCost: 1650,
    unitPrice: 2100,
    avgDailySales: 24,
    leadTimeDays: 7,
    safetyStock: 100,
    supplier: 'In-house Multan Plant',
    description: 'Light, traditional round tea biscuits, pairs with chai.',
  },
  {
    sku: 'SKU-BIS-03',
    name: 'Gluco Energy Wheat Bites (Carton 36x)',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 240,
    unitCost: 1400,
    unitPrice: 1850,
    avgDailySales: 35,
    leadTimeDays: 5,
    safetyStock: 150,
    supplier: 'In-house Multan Plant',
    description: 'High-glucose fortified children energy biscuit.',
  },
  {
    sku: 'SKU-BIS-04',
    name: 'Zeera Cumin Salt Biscuits (Carton 24x)',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 240,
    unitCost: 1800,
    unitPrice: 2250,
    avgDailySales: 20,
    leadTimeDays: 6,
    safetyStock: 90,
    supplier: 'In-house Multan Plant',
    description: 'Savory cumin seed roasted tea biscuit.',
  },
  {
    sku: 'SKU-BIS-05',
    name: 'Peanut Crunch Pik Biscuits (Carton 24x)',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 210,
    unitCost: 2200,
    unitPrice: 2800,
    avgDailySales: 16,
    leadTimeDays: 8,
    safetyStock: 80,
    supplier: 'In-house Multan Plant',
    description: 'Roasted peanut studded premium golden biscuit.',
  },
  {
    sku: 'SKU-BIS-06',
    name: 'Bourbon Choco Cream Sandwich (Carton 20x)',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2500,
    unitPrice: 3200,
    avgDailySales: 18,
    leadTimeDays: 9,
    safetyStock: 85,
    supplier: 'In-house Multan Plant',
    description: 'Dark cocoa sugar-dusted chocolate sandwich biscuit.',
  },
  {
    sku: 'SKU-BIS-07',
    name: 'Candi Brown Sugar Biscuits (Carton 24x)',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 270,
    unitCost: 1900,
    unitPrice: 2450,
    avgDailySales: 22,
    leadTimeDays: 7,
    safetyStock: 110,
    supplier: 'In-house Multan Plant',
    description: 'Caramelized desi brown sugar crunchy baking biscuit.',
  },
  {
    sku: 'SKU-BIS-08',
    name: 'Strawberry Jam Delight Biscuits (Carton 20x)',
    category: 'Biscuits',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2350,
    unitPrice: 3050,
    avgDailySales: 14,
    leadTimeDays: 8,
    safetyStock: 70,
    supplier: 'In-house Multan Plant',
    description: 'Fruit pectin center-filled sweet biscuits.',
  },

  // Wafers
  {
    sku: 'SKU-WAF-01',
    name: 'Vanilla Crisp Layered Wafer (Carton 36x)',
    category: 'Wafers',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 1600,
    unitPrice: 2150,
    avgDailySales: 20,
    leadTimeDays: 6,
    safetyStock: 95,
    supplier: 'In-house Multan Plant',
    description: 'Multi-layered airy wafer filled with Madagascar vanilla cream.',
  },
  {
    sku: 'SKU-WAF-02',
    name: 'Dutch Chocolate Cream Wafer (Carton 36x)',
    category: 'Wafers',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 1750,
    unitPrice: 2350,
    avgDailySales: 22,
    leadTimeDays: 6,
    safetyStock: 105,
    supplier: 'In-house Multan Plant',
    description: 'Rich cocoa creme crispy chocolate layered fingers.',
  },
  {
    sku: 'SKU-WAF-03',
    name: 'Strawberry Bliss Wafer Bar (Carton 36x)',
    category: 'Wafers',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 1650,
    unitPrice: 2200,
    avgDailySales: 15,
    leadTimeDays: 7,
    safetyStock: 75,
    supplier: 'In-house Multan Plant',
    description: 'Pink strawberry scented smooth wafer cubes.',
  },
  {
    sku: 'SKU-WAF-04',
    name: 'Hazelnut Praline Feast Wafer (Carton 24x)',
    category: 'Wafers',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2600,
    unitPrice: 3400,
    avgDailySales: 10,
    leadTimeDays: 8,
    safetyStock: 60,
    supplier: 'In-house Multan Plant',
    description: 'Export-grade wafer coated with crushed hazelnut cream.',
  },

  // Confectionery
  {
    sku: 'SKU-CNF-01',
    name: 'Royal Eclairs Toffee Bag (Jar 600g x12)',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 360,
    unitCost: 3100,
    unitPrice: 3950,
    avgDailySales: 15,
    leadTimeDays: 10,
    safetyStock: 80,
    supplier: 'In-house Multan Plant',
    description: 'Caramel shell with velvety chocolate center.',
  },
  {
    sku: 'SKU-CNF-02',
    name: 'Golden Butterscotch Chews (Box 500g x12)',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 360,
    unitCost: 2800,
    unitPrice: 3600,
    avgDailySales: 12,
    leadTimeDays: 10,
    safetyStock: 65,
    supplier: 'In-house Multan Plant',
    description: 'Soft buttery toffee sweets individually wrapped.',
  },
  {
    sku: 'SKU-CNF-03',
    name: 'Chaunsa Mango Candy Drops (Pouch 1kg x10)',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 360,
    unitCost: 2900,
    unitPrice: 3800,
    avgDailySales: 18,
    leadTimeDays: 8,
    safetyStock: 90,
    supplier: 'In-house Multan Plant',
    description: 'Multan special ripe mango flavored boiled candies.',
  },
  {
    sku: 'SKU-CNF-04',
    name: 'Silk Milk Chocolate Bar 40g (Box 24x)',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 240,
    unitCost: 3400,
    unitPrice: 4400,
    avgDailySales: 14,
    leadTimeDays: 12,
    safetyStock: 75,
    supplier: 'In-house Multan Plant',
    description: 'Smooth dairy milk confectionery bar, temperature sensitive.',
  },
  {
    sku: 'SKU-CNF-05',
    name: 'Dark Roast Almond Slab 70g (Box 18x)',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 270,
    unitCost: 3800,
    unitPrice: 4950,
    avgDailySales: 8,
    leadTimeDays: 14,
    safetyStock: 50,
    supplier: 'In-house Multan Plant',
    description: '55% cocoa dark chocolate with whole California almonds.',
  },
  {
    sku: 'SKU-CNF-06',
    name: 'Pan Flavoured Breath Mints (Tub 200pcs x12)',
    category: 'Confectionery',
    unit: 'carton',
    shelfLifeDays: 360,
    unitCost: 2100,
    unitPrice: 2750,
    avgDailySales: 22,
    leadTimeDays: 6,
    safetyStock: 100,
    supplier: 'In-house Multan Plant',
    description: 'Traditional cooling menthol and betel leaf essence pellets.',
  },

  // Pasta & Noodles
  {
    sku: 'SKU-PAS-01',
    name: 'Chatpata Masala Instant Noodles 70g (Carton 48x)',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 300,
    unitCost: 3100,
    unitPrice: 3850,
    avgDailySales: 40,
    leadTimeDays: 5,
    safetyStock: 200,
    supplier: 'In-house Multan Plant',
    description: '2-minute spiced wheat noodles with seasoning sachet.',
  },
  {
    sku: 'SKU-PAS-02',
    name: 'Chicken Tikka Flavoured Noodles 70g (Carton 48x)',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 300,
    unitCost: 3200,
    unitPrice: 3990,
    avgDailySales: 32,
    leadTimeDays: 5,
    safetyStock: 160,
    supplier: 'In-house Multan Plant',
    description: 'Smoky tandoori chicken spice seasoning ramen noodles.',
  },
  {
    sku: 'SKU-PAS-03',
    name: 'Elbow Macaroni Durum Wheat 400g (Carton 24x)',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 540,
    unitCost: 3600,
    unitPrice: 4600,
    avgDailySales: 16,
    leadTimeDays: 8,
    safetyStock: 80,
    supplier: 'In-house Multan Plant',
    description: '100% durum semolina curved elbow pasta for baking.',
  },
  {
    sku: 'SKU-PAS-04',
    name: 'Penne Rigate Grooved Pasta 400g (Carton 24x)',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 540,
    unitCost: 3750,
    unitPrice: 4800,
    avgDailySales: 14,
    leadTimeDays: 8,
    safetyStock: 70,
    supplier: 'In-house Multan Plant',
    description: 'Tubular cut ribbed pasta, ideal for thick cheese sauces.',
  },
  {
    sku: 'SKU-PAS-05',
    name: 'Fine Roasted Vermicelli Seviyan 150g (Carton 36x)',
    category: 'Pasta',
    unit: 'carton',
    shelfLifeDays: 365,
    unitCost: 2200,
    unitPrice: 2950,
    avgDailySales: 25,
    leadTimeDays: 6,
    safetyStock: 140,
    supplier: 'In-house Multan Plant',
    description: 'Pre-roasted thin wheat threads for Sheer Khurma and Eid desserts.',
  },

  // Sauces & Condiments
  {
    sku: 'SKU-SAU-01',
    name: 'Classic Tomato Ketchup 800g Pouch (Carton 12x)',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 270,
    unitCost: 3300,
    unitPrice: 4200,
    avgDailySales: 26,
    leadTimeDays: 7,
    safetyStock: 130,
    supplier: 'In-house Multan Plant',
    description: 'Thick farm-fresh ripe tomato sauce with spiced vinegar.',
  },
  {
    sku: 'SKU-SAU-02',
    name: 'Spicy Chilli Garlic Sauce 800g Pouch (Carton 12x)',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 270,
    unitCost: 3500,
    unitPrice: 4500,
    avgDailySales: 30,
    leadTimeDays: 7,
    safetyStock: 150,
    supplier: 'In-house Multan Plant',
    description: 'Red Kashmiri chilli and fresh crushed garlic sauce.',
  },
  {
    sku: 'SKU-SAU-03',
    name: 'Green Chilli Coriander Dip 300g (Carton 18x)',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 210,
    unitCost: 2600,
    unitPrice: 3300,
    avgDailySales: 12,
    leadTimeDays: 8,
    safetyStock: 60,
    supplier: 'In-house Multan Plant',
    description: 'Zesty herbal dipping condiment for fried snacks.',
  },
  {
    sku: 'SKU-SAU-04',
    name: 'Pudina Mint Raita Dressing 300g (Carton 18x)',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2450,
    unitPrice: 3150,
    avgDailySales: 10,
    leadTimeDays: 8,
    safetyStock: 50,
    supplier: 'In-house Multan Plant',
    description: 'Yogurt-style herb blend sauce for kebabs and biryani.',
  },
  {
    sku: 'SKU-SAU-05',
    name: 'Brewed Dark Soya Sauce 300ml (Carton 24x)',
    category: 'Sauces',
    unit: 'carton',
    shelfLifeDays: 540,
    unitCost: 2850,
    unitPrice: 3700,
    avgDailySales: 11,
    leadTimeDays: 10,
    safetyStock: 55,
    supplier: 'In-house Multan Plant',
    description: 'Naturally fermented seasoning sauce for cooking.',
  },

  // Snacks & Namkeen
  {
    sku: 'SKU-SNK-01',
    name: 'Classic Salted Potato Chips 50g (Carton 40x)',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 150,
    unitCost: 2400,
    unitPrice: 3200,
    avgDailySales: 38,
    leadTimeDays: 4,
    safetyStock: 180,
    supplier: 'In-house Multan Plant',
    description: 'Thinly cut fried potato crisps with sea salt.',
  },
  {
    sku: 'SKU-SNK-02',
    name: 'Masala Spicy Potato Crisps 50g (Carton 40x)',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 150,
    unitCost: 2450,
    unitPrice: 3300,
    avgDailySales: 42,
    leadTimeDays: 4,
    safetyStock: 200,
    supplier: 'In-house Multan Plant',
    description: 'Tangy red pepper and amchur coated potato crisps.',
  },
  {
    sku: 'SKU-SNK-03',
    name: 'Multani Special Spicy Nimko Mix 200g (Carton 24x)',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2800,
    unitPrice: 3600,
    avgDailySales: 25,
    leadTimeDays: 6,
    safetyStock: 120,
    supplier: 'In-house Multan Plant',
    description: 'Traditional chickpea sev, fried lentils, peanuts & sultanas.',
  },
  {
    sku: 'SKU-SNK-04',
    name: 'Crispy Dal Moth Namkeen 150g (Carton 24x)',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 2500,
    unitPrice: 3250,
    avgDailySales: 18,
    leadTimeDays: 6,
    safetyStock: 90,
    supplier: 'In-house Multan Plant',
    description: 'Fried seasoned green gram beans with black salt.',
  },
  {
    sku: 'SKU-SNK-05',
    name: 'Baked Cheesy Corn Rings 35g (Carton 36x)',
    category: 'Snacks',
    unit: 'carton',
    shelfLifeDays: 180,
    unitCost: 1950,
    unitPrice: 2600,
    avgDailySales: 24,
    leadTimeDays: 5,
    safetyStock: 110,
    supplier: 'In-house Multan Plant',
    description: 'Extruded crunchy corn hoops dusted with cheddar cheese.',
  },

  // Raw Ingredients (Purchased)
  {
    sku: 'SKU-ING-01',
    name: 'Refined White Cane Sugar 50kg Sack',
    category: 'Ingredients',
    unit: 'sack',
    shelfLifeDays: 730,
    unitCost: 7200,
    unitPrice: 0, // internal ingredient
    avgDailySales: 12, // consumption rate per day
    leadTimeDays: 10,
    safetyStock: 60,
    supplier: 'Chashma Sugar Mills Multan',
    description: 'ICUMSA 45 food-grade granulated white crystal sugar.',
  },
  {
    sku: 'SKU-ING-02',
    name: 'Premium Maida Wheat Flour 50kg Bag',
    category: 'Ingredients',
    unit: 'bag',
    shelfLifeDays: 120,
    unitCost: 5400,
    unitPrice: 0,
    avgDailySales: 18,
    leadTimeDays: 7,
    safetyStock: 90,
    supplier: 'Chenab Flour Mills Khanewal',
    description: 'High-gluten bleached flour for biscuit and noodle dough.',
  },
  {
    sku: 'SKU-ING-03',
    name: 'RBD Palm Olein Oil 16kg Tin',
    category: 'Ingredients',
    unit: 'tin',
    shelfLifeDays: 365,
    unitCost: 6800,
    unitPrice: 0,
    avgDailySales: 15,
    leadTimeDays: 14,
    safetyStock: 80,
    supplier: 'Habib Oil Mills Karachi Depot',
    description: 'Deodorized high-stability vegetable fat for frying.',
  },
  {
    sku: 'SKU-ING-04',
    name: 'Alkalized Cocoa Powder 25kg Bag',
    category: 'Ingredients',
    unit: 'bag',
    shelfLifeDays: 540,
    unitCost: 26500,
    unitPrice: 0,
    avgDailySales: 3,
    leadTimeDays: 21,
    safetyStock: 25,
    supplier: 'Barry Callebaut Imp. Lahore',
    description: '10-12% fat Dutch-processed rich cocoa powder for creams.',
  },
  {
    sku: 'SKU-ING-05',
    name: 'Full Cream Milk Powder 25kg Sack',
    category: 'Ingredients',
    unit: 'sack',
    shelfLifeDays: 365,
    unitCost: 28000,
    unitPrice: 0,
    avgDailySales: 4,
    leadTimeDays: 18,
    safetyStock: 30,
    supplier: 'Engro Foods Dairy Hub Sahiwal',
    description: '26% butterfat spray-dried whole milk powder.',
  },
  {
    sku: 'SKU-ING-06',
    name: 'Liquid Glucose 84 Brix 25kg Drum',
    category: 'Ingredients',
    unit: 'drum',
    shelfLifeDays: 365,
    unitCost: 8900,
    unitPrice: 0,
    avgDailySales: 5,
    leadTimeDays: 12,
    safetyStock: 35,
    supplier: 'Rafhan Maize Products Faisalabad',
    description: 'High DE sweetening syrup for toffee texture control.',
  },

  // Packaging Materials
  {
    sku: 'SKU-PKG-01',
    name: 'BOPP Printed Biscuit Wrapper Film 20kg Roll',
    category: 'Packaging',
    unit: 'roll',
    shelfLifeDays: 730,
    unitCost: 14500,
    unitPrice: 0,
    avgDailySales: 6,
    leadTimeDays: 20,
    safetyStock: 40,
    supplier: 'Tri-Pack Films Karachi',
    description: 'Rotogravure printed barrier packaging film rolls.',
  },
  {
    sku: 'SKU-PKG-02',
    name: '5-Ply Corrugated Master Shipper Carton (Pack 100x)',
    category: 'Packaging',
    unit: 'pack',
    shelfLifeDays: 1095,
    unitCost: 8500,
    unitPrice: 0,
    avgDailySales: 8,
    leadTimeDays: 12,
    safetyStock: 50,
    supplier: 'Packages Ltd Lahore',
    description: 'Heavy duty brown shipping boxes for transit protection.',
  },
  {
    sku: 'SKU-PKG-03',
    name: 'Food-Grade LDPE Liner Pouches (Pack 500x)',
    category: 'Packaging',
    unit: 'pack',
    shelfLifeDays: 1095,
    unitCost: 4200,
    unitPrice: 0,
    avgDailySales: 7,
    leadTimeDays: 10,
    safetyStock: 45,
    supplier: 'Polymer Packages Multan',
    description: 'Moisture resistant clear barrier bags for bulk storage.',
  },
];

// 15 Realistic Customers
export const SEED_CUSTOMERS: Customer[] = [
  // Retail chain (min 60 days)
  {
    id: 'CUST-01',
    name: 'Metro Cash & Carry (Multan Branch)',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Multan',
    contact: '+92 61 111-786-000',
  },
  {
    id: 'CUST-02',
    name: 'Imtiaz Super Market (Bosan Road)',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Multan',
    contact: '+92 61 651-4400',
  },
  {
    id: 'CUST-03',
    name: 'Chase Up Hypermarket (Mall of Multan)',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Multan',
    contact: '+92 61 621-1200',
  },
  {
    id: 'CUST-04',
    name: 'Al-Fatah Department Store',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Lahore',
    contact: '+92 42 111-253-282',
  },
  {
    id: 'CUST-05',
    name: 'Jalal Sons Supermarket',
    type: 'Retail chain',
    minRemainingShelfLifeDays: 60,
    city: 'Faisalabad',
    contact: '+92 41 854-9901',
  },

  // Wholesalers (min 30 days)
  {
    id: 'CUST-06',
    name: 'Multan Ghalla Mandi Wholesale Traders',
    type: 'Wholesaler',
    minRemainingShelfLifeDays: 30,
    city: 'Multan',
    contact: '+92 300 632-1100',
  },
  {
    id: 'CUST-07',
    name: 'Khanewal Commercial Grocery Hub',
    type: 'Wholesaler',
    minRemainingShelfLifeDays: 30,
    city: 'Khanewal',
    contact: '+92 301 789-2234',
  },
  {
    id: 'CUST-08',
    name: 'Vehari Food Distribution Union',
    type: 'Wholesaler',
    minRemainingShelfLifeDays: 30,
    city: 'Vehari',
    contact: '+92 302 445-9012',
  },
  {
    id: 'CUST-09',
    name: 'Shujabad Sugar & Confectionery Depot',
    type: 'Wholesaler',
    minRemainingShelfLifeDays: 30,
    city: 'Shujabad',
    contact: '+92 303 551-7890',
  },

  // Distributors (min 45 days)
  {
    id: 'CUST-10',
    name: 'Chenab FMCG Logistics & Distribution',
    type: 'Distributor',
    minRemainingShelfLifeDays: 45,
    city: 'Multan',
    contact: '+92 61 478-9000',
  },
  {
    id: 'CUST-11',
    name: 'South Punjab Swift Distributors',
    type: 'Distributor',
    minRemainingShelfLifeDays: 45,
    city: 'Bahawalpur',
    contact: '+92 62 288-4500',
  },
  {
    id: 'CUST-12',
    name: 'D.G. Khan Central Supply Network',
    type: 'Distributor',
    minRemainingShelfLifeDays: 45,
    city: 'Dera Ghazi Khan',
    contact: '+92 64 246-3300',
  },
  {
    id: 'CUST-13',
    name: 'Muzaffargarh Wholesale Network',
    type: 'Distributor',
    minRemainingShelfLifeDays: 45,
    city: 'Muzaffargarh',
    contact: '+92 300 981-2244',
  },

  // Export (min 120 days)
  {
    id: 'CUST-14',
    name: 'Kabul Transit Trading Co.',
    type: 'Export',
    minRemainingShelfLifeDays: 120,
    city: 'Kabul, Afghanistan (via Torkham)',
    contact: '+93 70 123-4567',
  },
  {
    id: 'CUST-15',
    name: 'Gulf Al-Amir Foodstuff Trading LLC',
    type: 'Export',
    minRemainingShelfLifeDays: 120,
    city: 'Dubai, UAE (via Karachi Port)',
    contact: '+971 4 221-8890',
  },
];

// Generate 120 repeatable Batches with deliberate distribution:
// - ~8 already expired (<0 days)
// - ~12 expiring within 7 days (0 to 7 days)
// - ~15 within 8–30 days
// - ~15 within 31–60 days
// - ~10 on quality Hold
// - ~3 Rejected
// - ~10 slow movers (daysOfCover > remaining shelf life)
// - Healthy remainder (>60 days, Released)
// - Ensure at least 5 products have 2 or more eligible batches with different expiry dates (for FEFO demo)
export function generateSeedBatches(today: string = INITIAL_TODAY): Batch[] {
  resetRng(42);
  const batches: Batch[] = [];

  const locations = [
    'WH1-A-01',
    'WH1-A-02',
    'WH1-A-03',
    'WH1-B-01',
    'WH1-B-02',
    'WH1-C-01',
    'WH1-C-02',
    'WH2-A-01',
    'WH2-A-02',
    'WH2-B-01',
    'WH2-C-03',
    'WH2-D-01',
    'WH3-Cold-01',
    'WH3-Cold-02',
    'WH3-Cold-03',
    'WH-Silo-01',
    'WH-Silo-02',
    'WH-Pack-01',
    'WH-Pack-02',
  ];

  let batchCounter = 101;
  const getBatchNo = () => `B-${batchCounter++}`;

  // 1. Guaranteed 5 Products with multiple eligible batches for FEFO demonstration
  // SKU-BIS-01: Super Egg & Milk (has batch with 75 days, batch with 110 days, batch with 180 days)
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-BIS-01',
    qty: 60,
    location: 'WH1-A-01',
    mfgDate: addDays(today, -195),
    expiryDate: addDays(today, 75), // 75 days left (eligible for Retail, Wholesaler, Distributor)
    receivedDate: addDays(today, -190),
    qualityStatus: 'Released',
    note: 'Eligible batch 1 for FEFO demo. Earliest expiry.',
  });
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-BIS-01',
    qty: 120,
    location: 'WH1-A-02',
    mfgDate: addDays(today, -160),
    expiryDate: addDays(today, 110), // 110 days left
    receivedDate: addDays(today, -155),
    qualityStatus: 'Released',
    note: 'Eligible batch 2 for FEFO demo. Secondary priority.',
  });
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-BIS-01',
    qty: 150,
    location: 'WH1-A-03',
    mfgDate: addDays(today, -90),
    expiryDate: addDays(today, 180), // 180 days left
    receivedDate: addDays(today, -85),
    qualityStatus: 'Released',
    note: 'Fresh stock, highest remaining shelf life.',
  });
  // Also add one batch for SKU-BIS-01 with 45 days left (ineligible for Retail Chain 60d minimum, but eligible for Wholesaler!)
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-BIS-01',
    qty: 40,
    location: 'WH1-A-04',
    mfgDate: addDays(today, -225),
    expiryDate: addDays(today, 45), // 45 days left (below 60d minimum for retail!)
    receivedDate: addDays(today, -220),
    qualityStatus: 'Released',
    note: 'Demonstrates exclusion for Retail Chains requiring 60+ days.',
  });

  // SKU-BIS-02: Marie Classic Tea Biscuits
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-BIS-02',
    qty: 55,
    location: 'WH1-B-01',
    mfgDate: addDays(today, -210),
    expiryDate: addDays(today, 90),
    receivedDate: addDays(today, -205),
    qualityStatus: 'Released',
    note: 'Earlier expiry batch for Marie biscuits.',
  });
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-BIS-02',
    qty: 90,
    location: 'WH1-B-02',
    mfgDate: addDays(today, -150),
    expiryDate: addDays(today, 150),
    receivedDate: addDays(today, -145),
    qualityStatus: 'Released',
    note: 'Later expiry batch for Marie biscuits.',
  });

  // SKU-WAF-02: Dutch Chocolate Cream Wafer
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-WAF-02',
    qty: 45,
    location: 'WH2-A-01',
    mfgDate: addDays(today, -100),
    expiryDate: addDays(today, 80),
    receivedDate: addDays(today, -95),
    qualityStatus: 'Released',
    note: 'FEFO wafer batch A.',
  });
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-WAF-02',
    qty: 80,
    location: 'WH2-A-02',
    mfgDate: addDays(today, -50),
    expiryDate: addDays(today, 130),
    receivedDate: addDays(today, -45),
    qualityStatus: 'Released',
    note: 'FEFO wafer batch B.',
  });

  // SKU-PAS-01: Chatpata Instant Noodles
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-PAS-01',
    qty: 70,
    location: 'WH1-C-01',
    mfgDate: addDays(today, -220),
    expiryDate: addDays(today, 80),
    receivedDate: addDays(today, -215),
    qualityStatus: 'Released',
    note: 'Noodles batch 1.',
  });
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-PAS-01',
    qty: 140,
    location: 'WH1-C-02',
    mfgDate: addDays(today, -140),
    expiryDate: addDays(today, 160),
    receivedDate: addDays(today, -135),
    qualityStatus: 'Released',
    note: 'Noodles batch 2.',
  });

  // SKU-SAU-01: Classic Tomato Ketchup
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-SAU-01',
    qty: 65,
    location: 'WH2-B-01',
    mfgDate: addDays(today, -190),
    expiryDate: addDays(today, 80),
    receivedDate: addDays(today, -185),
    qualityStatus: 'Released',
    note: 'Ketchup batch 1.',
  });
  batches.push({
    batchNo: getBatchNo(),
    sku: 'SKU-SAU-01',
    qty: 110,
    location: 'WH2-B-02',
    mfgDate: addDays(today, -130),
    expiryDate: addDays(today, 140),
    receivedDate: addDays(today, -125),
    qualityStatus: 'Released',
    note: 'Ketchup batch 2.',
  });

  // 2. Exactly ~8 ALREADY EXPIRED batches (<0 days left)
  const expiredSkus = [
    { sku: 'SKU-BIS-03', daysAgo: 14, qty: 30, loc: 'WH1-D-01' },
    { sku: 'SKU-WAF-03', daysAgo: 5, qty: 25, loc: 'WH2-C-01' },
    { sku: 'SKU-CNF-03', daysAgo: 22, qty: 18, loc: 'WH2-D-02' },
    { sku: 'SKU-SNK-01', daysAgo: 8, qty: 45, loc: 'WH1-B-03' },
    { sku: 'SKU-SAU-04', daysAgo: 19, qty: 15, loc: 'WH2-A-03' },
    { sku: 'SKU-PAS-05', daysAgo: 3, qty: 35, loc: 'WH1-C-03' },
    { sku: 'SKU-ING-02', daysAgo: 12, qty: 20, loc: 'WH-Silo-01' }, // Maida flour expired
    { sku: 'SKU-CNF-06', daysAgo: 30, qty: 12, loc: 'WH2-D-03' },
  ];
  for (const exp of expiredSkus) {
    batches.push({
      batchNo: getBatchNo(),
      sku: exp.sku,
      qty: exp.qty,
      location: exp.loc,
      mfgDate: addDays(today, -(240 + exp.daysAgo)),
      expiryDate: addDays(today, -exp.daysAgo),
      receivedDate: addDays(today, -(235 + exp.daysAgo)),
      qualityStatus: 'Released',
      note: `Expired ${exp.daysAgo} days ago. Pending write-off approval.`,
    });
  }

  // 3. Exactly ~12 batches expiring within 7 days (0 to 7 days)
  const criticalSkus = [
    { sku: 'SKU-SNK-02', days: 2, qty: 50, loc: 'WH1-B-02' },
    { sku: 'SKU-SNK-04', days: 3, qty: 35, loc: 'WH1-B-04' },
    { sku: 'SKU-BIS-04', days: 4, qty: 40, loc: 'WH1-A-05' },
    { sku: 'SKU-WAF-01', days: 5, qty: 45, loc: 'WH2-A-03' },
    { sku: 'SKU-SAU-02', days: 1, qty: 60, loc: 'WH2-B-03' },
    { sku: 'SKU-PAS-02', days: 6, qty: 75, loc: 'WH1-C-04' },
    { sku: 'SKU-CNF-04', days: 7, qty: 28, loc: 'WH3-Cold-01' },
    { sku: 'SKU-BIS-05', days: 3, qty: 30, loc: 'WH1-A-06' },
    { sku: 'SKU-SNK-05', days: 5, qty: 55, loc: 'WH1-B-05' },
    { sku: 'SKU-WAF-04', days: 2, qty: 20, loc: 'WH2-A-04' },
    { sku: 'SKU-SAU-03', days: 6, qty: 25, loc: 'WH2-B-04' },
    { sku: 'SKU-CNF-01', days: 7, qty: 32, loc: 'WH2-D-01' },
  ];
  for (const crit of criticalSkus) {
    batches.push({
      batchNo: getBatchNo(),
      sku: crit.sku,
      qty: crit.qty,
      location: crit.loc,
      mfgDate: addDays(today, -(180 - crit.days)),
      expiryDate: addDays(today, crit.days),
      receivedDate: addDays(today, -(175 - crit.days)),
      qualityStatus: 'Released',
      note: `Critical expiry alert: ${crit.days} day(s) remaining. Urgent dispatch recommended.`,
    });
  }

  // 4. Exactly ~15 batches within 8–30 days
  const warningSkus = [
    { sku: 'SKU-BIS-06', days: 11, qty: 40, loc: 'WH1-A-07' },
    { sku: 'SKU-BIS-07', days: 16, qty: 65, loc: 'WH1-A-08' },
    { sku: 'SKU-BIS-08', days: 22, qty: 35, loc: 'WH1-A-09' },
    { sku: 'SKU-WAF-01', days: 14, qty: 50, loc: 'WH2-A-05' },
    { sku: 'SKU-WAF-03', days: 28, qty: 45, loc: 'WH2-A-06' },
    { sku: 'SKU-CNF-02', days: 19, qty: 30, loc: 'WH2-D-02' },
    { sku: 'SKU-CNF-05', days: 25, qty: 20, loc: 'WH3-Cold-02' },
    { sku: 'SKU-PAS-03', days: 18, qty: 45, loc: 'WH1-C-05' },
    { sku: 'SKU-PAS-04', days: 29, qty: 40, loc: 'WH1-C-06' },
    { sku: 'SKU-SAU-02', days: 12, qty: 55, loc: 'WH2-B-05' },
    { sku: 'SKU-SAU-05', days: 21, qty: 30, loc: 'WH2-B-06' },
    { sku: 'SKU-SNK-01', days: 15, qty: 70, loc: 'WH1-B-06' },
    { sku: 'SKU-SNK-03', days: 26, qty: 50, loc: 'WH1-B-07' },
    { sku: 'SKU-ING-03', days: 24, qty: 35, loc: 'WH-Silo-02' },
    { sku: 'SKU-PKG-01', days: 20, qty: 15, loc: 'WH-Pack-01' },
  ];
  for (const w of warningSkus) {
    batches.push({
      batchNo: getBatchNo(),
      sku: w.sku,
      qty: w.qty,
      location: w.loc,
      mfgDate: addDays(today, -(200 - w.days)),
      expiryDate: addDays(today, w.days),
      receivedDate: addDays(today, -(195 - w.days)),
      qualityStatus: 'Released',
      note: `Expiring in ${w.days} days. High priority.`,
    });
  }

  // 5. Exactly ~15 batches within 31–60 days
  const amberSkus = [
    { sku: 'SKU-BIS-02', days: 34, qty: 80, loc: 'WH1-B-08' },
    { sku: 'SKU-BIS-03', days: 42, qty: 110, loc: 'WH1-A-10' },
    { sku: 'SKU-BIS-04', days: 55, qty: 75, loc: 'WH1-A-11' },
    { sku: 'SKU-BIS-05', days: 38, qty: 45, loc: 'WH1-A-12' },
    { sku: 'SKU-WAF-02', days: 48, qty: 65, loc: 'WH2-A-07' },
    { sku: 'SKU-WAF-04', days: 52, qty: 35, loc: 'WH2-A-08' },
    { sku: 'SKU-CNF-01', days: 37, qty: 50, loc: 'WH2-D-04' },
    { sku: 'SKU-CNF-03', days: 44, qty: 45, loc: 'WH2-D-05' },
    { sku: 'SKU-CNF-04', days: 59, qty: 40, loc: 'WH3-Cold-03' },
    { sku: 'SKU-PAS-01', days: 32, qty: 90, loc: 'WH1-C-07' },
    { sku: 'SKU-PAS-02', days: 46, qty: 85, loc: 'WH1-C-08' },
    { sku: 'SKU-PAS-05', days: 53, qty: 60, loc: 'WH1-C-09' },
    { sku: 'SKU-SAU-01', days: 41, qty: 70, loc: 'WH2-B-07' },
    { sku: 'SKU-SNK-02', days: 36, qty: 95, loc: 'WH1-B-09' },
    { sku: 'SKU-SNK-04', days: 50, qty: 60, loc: 'WH1-B-10' },
  ];
  for (const amb of amberSkus) {
    batches.push({
      batchNo: getBatchNo(),
      sku: amb.sku,
      qty: amb.qty,
      location: amb.loc,
      mfgDate: addDays(today, -(210 - amb.days)),
      expiryDate: addDays(today, amb.days),
      receivedDate: addDays(today, -(205 - amb.days)),
      qualityStatus: 'Released',
      note: `Approaching 60-day retail threshold in ${amb.days} days.`,
    });
  }

  // 6. Exactly ~10 on Quality Hold
  const holdSkus = [
    {
      sku: 'SKU-BIS-01',
      qty: 85,
      loc: 'WH1-A-13',
      days: 120,
      reason: 'Baking moisture test borderline (4.8% vs spec 4.5%). Retesting lab sample.',
    },
    {
      sku: 'SKU-WAF-02',
      qty: 60,
      loc: 'WH2-A-09',
      days: 95,
      reason: 'Wafer sheet thickness deviation under micro-gauge check.',
    },
    {
      sku: 'SKU-CNF-04',
      qty: 45,
      loc: 'WH3-Cold-04',
      days: 140,
      reason: 'Cold room thermostat temporary spike to 24°C overnight.',
    },
    {
      sku: 'SKU-PAS-02',
      qty: 100,
      loc: 'WH1-C-10',
      days: 110,
      reason: 'Noodle seasoning blend sachet weight calibration check.',
    },
    {
      sku: 'SKU-SAU-01',
      qty: 80,
      loc: 'WH2-B-08',
      days: 130,
      reason: 'pH level verification (tested 3.9, spec is 3.7-3.8).',
    },
    {
      sku: 'SKU-SNK-01',
      qty: 90,
      loc: 'WH1-B-11',
      days: 75,
      reason: 'Seal integrity micro-puncture check on form-fill machine 2.',
    },
    {
      sku: 'SKU-ING-01',
      qty: 40,
      loc: 'WH-Silo-03',
      days: 300,
      reason: 'Incoming sugar shipment certificate of analysis pending from mill.',
    },
    {
      sku: 'SKU-ING-04',
      qty: 15,
      loc: 'WH2-D-06',
      days: 240,
      reason: 'Cocoa powder aroma & fat analysis pending QA release.',
    },
    {
      sku: 'SKU-PKG-01',
      qty: 25,
      loc: 'WH-Pack-03',
      days: 400,
      reason: 'Cylinder print registration alignment color shade check.',
    },
    {
      sku: 'SKU-BIS-06',
      qty: 50,
      loc: 'WH1-A-14',
      days: 105,
      reason: 'Cream filling melting point testing at 32°C.',
    },
  ];
  for (const h of holdSkus) {
    batches.push({
      batchNo: getBatchNo(),
      sku: h.sku,
      qty: h.qty,
      location: h.loc,
      mfgDate: addDays(today, -30),
      expiryDate: addDays(today, h.days),
      receivedDate: addDays(today, -25),
      qualityStatus: 'Hold',
      holdReason: h.reason,
      note: `Quality Hold: ${h.reason}`,
    });
  }

  // 7. Exactly ~3 REJECTED batches
  const rejectedSkus = [
    {
      sku: 'SKU-SAU-02',
      qty: 40,
      loc: 'WH2-B-09',
      days: 90,
      reason: 'Contamination detected: microbial yeast count exceeded standard.',
    },
    {
      sku: 'SKU-SNK-03',
      qty: 30,
      loc: 'WH1-B-12',
      days: 60,
      reason: 'High peroxide value in frying oil batch resulted in off-taste.',
    },
    {
      sku: 'SKU-ING-05',
      qty: 10,
      loc: 'WH-Silo-04',
      days: 150,
      reason: 'Moisture ingress damaged milk powder sacks; caking observed.',
    },
  ];
  for (const r of rejectedSkus) {
    batches.push({
      batchNo: getBatchNo(),
      sku: r.sku,
      qty: r.qty,
      location: r.loc,
      mfgDate: addDays(today, -45),
      expiryDate: addDays(today, r.days),
      receivedDate: addDays(today, -40),
      qualityStatus: 'Rejected',
      holdReason: r.reason,
      note: `Quality Rejected: ${r.reason}`,
    });
  }

  // 8. Exactly ~10 SLOW MOVERS whose days-of-cover exceeds remaining shelf life
  // (e.g. daily sales low, batch quantity large or shelf life short)
  const slowMovers = [
    { sku: 'SKU-WAF-04', qty: 120, daysLeft: 70, loc: 'WH2-A-10' }, // sales 10/day -> 120 stock is 12 days, but with previous batches stock is 220 -> 22 days? Wait, let's make daily sales 0.5 or qty 500!
    { sku: 'SKU-CNF-05', qty: 250, daysLeft: 65, loc: 'WH3-Cold-05' }, // sales 8/day -> cover 31d + previous = 70d > 65 daysLeft
    { sku: 'SKU-SAU-04', qty: 320, daysLeft: 55, loc: 'WH2-B-10' }, // sales 10/day -> 32d + previous = 60d > 55 daysLeft
    { sku: 'SKU-SAU-05', qty: 280, daysLeft: 60, loc: 'WH2-B-11' }, // sales 11/day -> 28d + previous = 75d > 60 daysLeft
    { sku: 'SKU-BIS-08', qty: 290, daysLeft: 62, loc: 'WH1-A-15' }, // sales 14/day -> 29d + previous = 68d > 62 daysLeft
    { sku: 'SKU-CNF-06', qty: 450, daysLeft: 58, loc: 'WH2-D-07' }, // mints: high stock, 58 days left
    { sku: 'SKU-PAS-04', qty: 310, daysLeft: 52, loc: 'WH1-C-11' }, // penne pasta: 52 days left
    { sku: 'SKU-SNK-04', qty: 380, daysLeft: 64, loc: 'WH1-B-13' }, // dal moth: 64 days left
    { sku: 'SKU-ING-06', qty: 220, daysLeft: 90, loc: 'WH-Silo-05' }, // glucose syrup: 90 days left
    { sku: 'SKU-PKG-03', qty: 350, daysLeft: 85, loc: 'WH-Pack-04' }, // liners: 85 days left
  ];
  for (const sm of slowMovers) {
    batches.push({
      batchNo: getBatchNo(),
      sku: sm.sku,
      qty: sm.qty,
      location: sm.loc,
      mfgDate: addDays(today, -110),
      expiryDate: addDays(today, sm.daysLeft),
      receivedDate: addDays(today, -100),
      qualityStatus: 'Released',
      note: 'Slow-moving inventory: cumulative days of cover exceeds remaining shelf life.',
    });
  }

  // 9. Healthy remainder batches (>60 days left, Released) across the rest of the 40 SKUs
  // to bring total batches up to ~120
  for (let i = 0; i < SEED_PRODUCTS.length; i++) {
    const prod = SEED_PRODUCTS[i];
    // Check how many batches already created for this sku
    const currentCount = batches.filter((b) => b.sku === prod.sku).length;
    if (currentCount < 3) {
      const needed = 3 - currentCount;
      for (let k = 0; k < needed; k++) {
        const randDays = 90 + Math.floor(seededRandom() * 180);
        const randQty = 40 + Math.floor(seededRandom() * 120);
        const loc = locations[Math.floor(seededRandom() * locations.length)];
        batches.push({
          batchNo: getBatchNo(),
          sku: prod.sku,
          qty: randQty,
          location: loc,
          mfgDate: addDays(today, -30 - Math.floor(seededRandom() * 40)),
          expiryDate: addDays(today, randDays),
          receivedDate: addDays(today, -20 - Math.floor(seededRandom() * 30)),
          qualityStatus: 'Released',
          note: 'Regular production batch, prime quality condition.',
        });
      }
    }
  }

  // Fill up until ~122 batches
  while (batches.length < 122) {
    const randomProd =
      SEED_PRODUCTS[Math.floor(seededRandom() * SEED_PRODUCTS.length)];
    const randDays = 85 + Math.floor(seededRandom() * 160);
    const randQty = 50 + Math.floor(seededRandom() * 100);
    const loc = locations[Math.floor(seededRandom() * locations.length)];
    batches.push({
      batchNo: getBatchNo(),
      sku: randomProd.sku,
      qty: randQty,
      location: loc,
      mfgDate: addDays(today, -40),
      expiryDate: addDays(today, randDays),
      receivedDate: addDays(today, -35),
      qualityStatus: 'Released',
      note: 'Healthy standard stock batch.',
    });
  }

  return batches;
}

// 12 Months of Synthetic Monthly Sales per finished product with seasonality
// Seasonality patterns:
// - Ramadan / Eid spike (March-April or Month 04-05)
// - Summer dip for chocolate (May-August due to heat)
// - Winter rise for snacks and tea biscuits (Nov-Feb)
export function generateMonthlySales(): MonthlySalesHistory[] {
  const months = [
    '2025-12',
    '2026-01',
    '2026-02',
    '2026-03',
    '2026-04', // Ramadan / Eid ul Fitr spike
    '2026-05',
    '2026-06', // Summer heat
    '2026-07',
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
  ];

  return SEED_PRODUCTS.map((prod) => {
    const baseMonthly = prod.avgDailySales * 30;
    const history: { [key: string]: number } = {};

    months.forEach((m, idx) => {
      let multiplier = 1.0;

      // Ramadan / Eid season (March & April)
      if (idx === 3 || idx === 4) {
        if (prod.category === 'Sauces' || prod.category === 'Snacks') {
          multiplier = 1.45; // Iftar snacks & ketchup spike
        } else if (
          prod.category === 'Biscuits' ||
          prod.category === 'Confectionery'
        ) {
          multiplier = 1.35; // Eid gifting
        } else if (prod.sku === 'SKU-PAS-05') {
          multiplier = 2.4; // Seviyan vermicelli huge Eid spike!
        }
      }

      // Summer dip for chocolate products (June - August)
      if (idx >= 6 && idx <= 8) {
        if (
          prod.sku === 'SKU-CNF-04' ||
          prod.sku === 'SKU-CNF-05' ||
          prod.sku === 'SKU-BIS-06'
        ) {
          multiplier = 0.65; // melts in Pakistani summer transit
        }
      }

      // Winter rise for tea biscuits & namkeen (Dec - Feb)
      if (idx <= 2 || idx === 11) {
        if (prod.category === 'Biscuits' || prod.category === 'Snacks') {
          multiplier = 1.25; // Evening chai time
        }
      }

      // Random natural fluctuation +/- 8%
      const noise = 0.92 + (idx % 5) * 0.04;
      const sales = Math.round(baseMonthly * multiplier * noise);
      history[m] = sales;
    });

    return {
      sku: prod.sku,
      monthlySales: history,
    };
  });
}

// 20 Historical Orders
export const SEED_ORDERS: DispatchOrder[] = [
  {
    id: 'ORD-2026-001',
    orderNumber: 'DSP-8801',
    date: '2026-11-02',
    customerId: 'CUST-01',
    customerName: 'Metro Cash & Carry (Multan Branch)',
    customerType: 'Retail chain',
    minShelfLifeDays: 60,
    status: 'Dispatched',
    totalValue: 348000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [
      {
        sku: 'SKU-BIS-01',
        productName: 'Super Egg & Milk Biscuits (Carton 24x)',
        qtyRequested: 80,
        allocatedBatches: [
          {
            batchNo: 'B-101',
            qty: 60,
            location: 'WH1-A-01',
            expiryDate: '2027-01-25',
            daysLeft: 75,
            reason: 'B-101 chosen: earliest expiry among eligible Released batches meeting customer 60-day minimum.',
          },
          {
            batchNo: 'B-102',
            qty: 20,
            location: 'WH1-A-02',
            expiryDate: '2027-03-01',
            daysLeft: 110,
            reason: 'B-102 chosen: secondary batch to satisfy remaining quantity after exhausting B-101.',
          },
        ],
        shortfall: 0,
        excludedBatches: [],
      },
      {
        sku: 'SKU-SAU-01',
        productName: 'Classic Tomato Ketchup 800g Pouch (Carton 12x)',
        qtyRequested: 40,
        allocatedBatches: [
          {
            batchNo: 'B-111',
            qty: 40,
            location: 'WH2-B-01',
            expiryDate: '2027-01-30',
            daysLeft: 80,
            reason: 'B-111 chosen: earliest expiry among eligible Released batches.',
          },
        ],
        shortfall: 0,
        excludedBatches: [],
      },
    ],
  },
  {
    id: 'ORD-2026-002',
    orderNumber: 'DSP-8802',
    date: '2026-11-04',
    customerId: 'CUST-06',
    customerName: 'Multan Ghalla Mandi Wholesale Traders',
    customerType: 'Wholesaler',
    minShelfLifeDays: 30,
    status: 'Dispatched',
    totalValue: 265000,
    dispatchedBy: 'Zahid Malik (Picker)',
    lines: [
      {
        sku: 'SKU-BIS-01',
        productName: 'Super Egg & Milk Biscuits (Carton 24x)',
        qtyRequested: 40,
        allocatedBatches: [
          {
            batchNo: 'B-104',
            qty: 40,
            location: 'WH1-A-04',
            expiryDate: '2026-12-26',
            daysLeft: 45,
            reason: 'B-104 chosen: earliest expiry eligible for Wholesaler 30-day minimum.',
          },
        ],
        shortfall: 0,
        excludedBatches: [],
      },
    ],
  },
  {
    id: 'ORD-2026-003',
    orderNumber: 'DSP-8803',
    date: '2026-11-05',
    customerId: 'CUST-02',
    customerName: 'Imtiaz Super Market (Bosan Road)',
    customerType: 'Retail chain',
    minShelfLifeDays: 60,
    status: 'Dispatched',
    totalValue: 412000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [
      {
        sku: 'SKU-PAS-01',
        productName: 'Chatpata Masala Instant Noodles 70g (Carton 48x)',
        qtyRequested: 60,
        allocatedBatches: [
          {
            batchNo: 'B-109',
            qty: 60,
            location: 'WH1-C-01',
            expiryDate: '2027-01-30',
            daysLeft: 80,
            reason: 'B-109 chosen: earliest expiry among eligible Released batches.',
          },
        ],
        shortfall: 0,
        excludedBatches: [],
      },
    ],
  },
  {
    id: 'ORD-2026-004',
    orderNumber: 'DSP-8804',
    date: '2026-11-06',
    customerId: 'CUST-10',
    customerName: 'Chenab FMCG Logistics & Distribution',
    customerType: 'Distributor',
    minShelfLifeDays: 45,
    status: 'Dispatched',
    totalValue: 530000,
    dispatchedBy: 'Zahid Malik (Picker)',
    lines: [],
  },
  {
    id: 'ORD-2026-005',
    orderNumber: 'DSP-8805',
    date: '2026-11-07',
    customerId: 'CUST-03',
    customerName: 'Chase Up Hypermarket (Mall of Multan)',
    customerType: 'Retail chain',
    minShelfLifeDays: 60,
    status: 'Dispatched',
    totalValue: 198000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [],
  },
  {
    id: 'ORD-2026-006',
    orderNumber: 'DSP-8806',
    date: '2026-11-08',
    customerId: 'CUST-07',
    customerName: 'Khanewal Commercial Grocery Hub',
    customerType: 'Wholesaler',
    minShelfLifeDays: 30,
    status: 'Dispatched',
    totalValue: 310000,
    dispatchedBy: 'Zahid Malik (Picker)',
    lines: [],
  },
  {
    id: 'ORD-2026-007',
    orderNumber: 'DSP-8807',
    date: '2026-11-08',
    customerId: 'CUST-04',
    customerName: 'Al-Fatah Department Store',
    customerType: 'Retail chain',
    minShelfLifeDays: 60,
    status: 'Dispatched',
    totalValue: 480000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [],
  },
  {
    id: 'ORD-2026-008',
    orderNumber: 'DSP-8808',
    date: '2026-11-09',
    customerId: 'CUST-11',
    customerName: 'South Punjab Swift Distributors',
    customerType: 'Distributor',
    minShelfLifeDays: 45,
    status: 'Dispatched',
    totalValue: 375000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [],
  },
  {
    id: 'ORD-2026-009',
    orderNumber: 'DSP-8809',
    date: '2026-11-09',
    customerId: 'CUST-08',
    customerName: 'Vehari Food Distribution Union',
    customerType: 'Wholesaler',
    minShelfLifeDays: 30,
    status: 'Dispatched',
    totalValue: 245000,
    dispatchedBy: 'Zahid Malik (Picker)',
    lines: [],
  },
  {
    id: 'ORD-2026-010',
    orderNumber: 'DSP-8810',
    date: '2026-11-10',
    customerId: 'CUST-05',
    customerName: 'Jalal Sons Supermarket',
    customerType: 'Retail chain',
    minShelfLifeDays: 60,
    status: 'Dispatched',
    totalValue: 560000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [],
  },
  {
    id: 'ORD-2026-011',
    orderNumber: 'DSP-8811',
    date: '2026-11-10',
    customerId: 'CUST-12',
    customerName: 'D.G. Khan Central Supply Network',
    customerType: 'Distributor',
    minShelfLifeDays: 45,
    status: 'Dispatched',
    totalValue: 330000,
    dispatchedBy: 'Zahid Malik (Picker)',
    lines: [],
  },
  {
    id: 'ORD-2026-012',
    orderNumber: 'DSP-8812',
    date: '2026-11-10',
    customerId: 'CUST-14',
    customerName: 'Kabul Transit Trading Co.',
    customerType: 'Export',
    minShelfLifeDays: 120,
    status: 'Dispatched',
    totalValue: 1250000,
    dispatchedBy: 'Tariq Mehmood (Export Manager)',
    lines: [],
  },
  {
    id: 'ORD-2026-013',
    orderNumber: 'DSP-8813',
    date: '2026-11-10',
    customerId: 'CUST-01',
    customerName: 'Metro Cash & Carry (Multan Branch)',
    customerType: 'Retail chain',
    minShelfLifeDays: 60,
    status: 'Dispatched',
    totalValue: 420000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [],
  },
  {
    id: 'ORD-2026-014',
    orderNumber: 'DSP-8814',
    date: '2026-11-11',
    customerId: 'CUST-09',
    customerName: 'Shujabad Sugar & Confectionery Depot',
    customerType: 'Wholesaler',
    minShelfLifeDays: 30,
    status: 'Dispatched',
    totalValue: 190000,
    dispatchedBy: 'Zahid Malik (Picker)',
    lines: [],
  },
  {
    id: 'ORD-2026-015',
    orderNumber: 'DSP-8815',
    date: '2026-11-11',
    customerId: 'CUST-13',
    customerName: 'Muzaffargarh Wholesale Network',
    customerType: 'Distributor',
    minShelfLifeDays: 45,
    status: 'Dispatched',
    totalValue: 285000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [],
  },
  {
    id: 'ORD-2026-016',
    orderNumber: 'DSP-8816',
    date: '2026-11-11',
    customerId: 'CUST-02',
    customerName: 'Imtiaz Super Market (Bosan Road)',
    customerType: 'Retail chain',
    minShelfLifeDays: 60,
    status: 'Dispatched',
    totalValue: 395000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [],
  },
  {
    id: 'ORD-2026-017',
    orderNumber: 'DSP-8817',
    date: '2026-11-11',
    customerId: 'CUST-15',
    customerName: 'Gulf Al-Amir Foodstuff Trading LLC',
    customerType: 'Export',
    minShelfLifeDays: 120,
    status: 'Dispatched',
    totalValue: 1890000,
    dispatchedBy: 'Tariq Mehmood (Export Manager)',
    lines: [],
  },
  {
    id: 'ORD-2026-018',
    orderNumber: 'DSP-8818',
    date: '2026-11-11',
    customerId: 'CUST-06',
    customerName: 'Multan Ghalla Mandi Wholesale Traders',
    customerType: 'Wholesaler',
    minShelfLifeDays: 30,
    status: 'Dispatched',
    totalValue: 220000,
    dispatchedBy: 'Zahid Malik (Picker)',
    lines: [],
  },
  {
    id: 'ORD-2026-019',
    orderNumber: 'DSP-8819',
    date: '2026-11-11',
    customerId: 'CUST-03',
    customerName: 'Chase Up Hypermarket (Mall of Multan)',
    customerType: 'Retail chain',
    minShelfLifeDays: 60,
    status: 'Dispatched',
    totalValue: 310000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [],
  },
  {
    id: 'ORD-2026-020',
    orderNumber: 'DSP-8820',
    date: '2026-11-11',
    customerId: 'CUST-10',
    customerName: 'Chenab FMCG Logistics & Distribution',
    customerType: 'Distributor',
    minShelfLifeDays: 45,
    status: 'Dispatched',
    totalValue: 440000,
    dispatchedBy: 'Akram Khan (Warehouse Lead)',
    lines: [],
  },
];

// 10 Write-Off Records
export const SEED_WRITE_OFFS: WriteOff[] = [
  {
    id: 'WO-001',
    date: '2026-10-12',
    batchNo: 'B-088',
    sku: 'SKU-BIS-03',
    productName: 'Gluco Energy Wheat Bites (Carton 36x)',
    category: 'Biscuits',
    qty: 35,
    unit: 'carton',
    value: 49000,
    reason: 'Expired',
    approvedBy: 'Hassan Raza (Finance Controller)',
    notes: 'Exceeded 240 days shelf life during seasonal slowdown.',
  },
  {
    id: 'WO-002',
    date: '2026-10-18',
    batchNo: 'B-091',
    sku: 'SKU-SNK-01',
    productName: 'Classic Salted Potato Chips 50g (Carton 40x)',
    category: 'Snacks',
    qty: 28,
    unit: 'carton',
    value: 67200,
    reason: 'Damaged',
    approvedBy: 'Bilal Ahmed (Plant Manager)',
    notes: 'Forklift pallet collision in aisle B-03.',
  },
  {
    id: 'WO-003',
    date: '2026-10-24',
    batchNo: 'B-093',
    sku: 'SKU-SAU-02',
    productName: 'Spicy Chilli Garlic Sauce 800g Pouch (Carton 12x)',
    category: 'Sauces',
    qty: 40,
    unit: 'carton',
    value: 140000,
    reason: 'Quality rejection',
    approvedBy: 'Dr. Fatima Noor (QA Head)',
    notes: 'Viscosity and microbial count exceeded PSQCA standards.',
  },
  {
    id: 'WO-004',
    date: '2026-10-29',
    batchNo: 'B-095',
    sku: 'SKU-CNF-04',
    productName: 'Silk Milk Chocolate Bar 40g (Box 24x)',
    category: 'Confectionery',
    qty: 22,
    unit: 'carton',
    value: 74800,
    reason: 'Damaged',
    approvedBy: 'Bilal Ahmed (Plant Manager)',
    notes: 'Heat bloom during transit vehicle breakdown in Kot Chutta.',
  },
  {
    id: 'WO-005',
    date: '2026-11-01',
    batchNo: 'B-097',
    sku: 'SKU-ING-02',
    productName: 'Premium Maida Wheat Flour 50kg Bag',
    category: 'Ingredients',
    qty: 15,
    unit: 'bag',
    value: 81000,
    reason: 'Expired',
    approvedBy: 'Hassan Raza (Finance Controller)',
    notes: 'Flour weevil larvae detected in moisture affected bags.',
  },
  {
    id: 'WO-006',
    date: '2026-11-03',
    batchNo: 'B-098',
    sku: 'SKU-WAF-03',
    productName: 'Strawberry Bliss Wafer Bar (Carton 36x)',
    category: 'Wafers',
    qty: 18,
    unit: 'carton',
    value: 29700,
    reason: 'Returned unsaleable',
    approvedBy: 'Bilal Ahmed (Plant Manager)',
    notes: 'Customer return with crushed outer packaging cartons.',
  },
  {
    id: 'WO-007',
    date: '2026-11-05',
    batchNo: 'B-099',
    sku: 'SKU-PAS-05',
    productName: 'Fine Roasted Vermicelli Seviyan 150g (Carton 36x)',
    category: 'Pasta',
    qty: 30,
    unit: 'carton',
    value: 66000,
    reason: 'Expired',
    approvedBy: 'Hassan Raza (Finance Controller)',
    notes: 'Post-Eid leftover inventory past recommended shelf period.',
  },
  {
    id: 'WO-008',
    date: '2026-11-07',
    batchNo: 'B-100',
    sku: 'SKU-ING-05',
    productName: 'Full Cream Milk Powder 25kg Sack',
    category: 'Ingredients',
    qty: 5,
    unit: 'sack',
    value: 140000,
    reason: 'Quality rejection',
    approvedBy: 'Dr. Fatima Noor (QA Head)',
    notes: 'Water leak during torrential rain seeped into warehouse corner.',
  },
  {
    id: 'WO-009',
    date: '2026-11-09',
    batchNo: 'B-094',
    sku: 'SKU-SNK-05',
    productName: 'Baked Cheesy Corn Rings 35g (Carton 36x)',
    category: 'Snacks',
    qty: 25,
    unit: 'carton',
    value: 48750,
    reason: 'Returned unsaleable',
    approvedBy: 'Bilal Ahmed (Plant Manager)',
    notes: 'Distributor return: sun-bleached display boxes.',
  },
  {
    id: 'WO-010',
    date: '2026-11-10',
    batchNo: 'B-096',
    sku: 'SKU-SAU-04',
    productName: 'Pudina Mint Raita Dressing 300g (Carton 18x)',
    category: 'Sauces',
    qty: 16,
    unit: 'carton',
    value: 39200,
    reason: 'Expired',
    approvedBy: 'Hassan Raza (Finance Controller)',
    notes: 'Short shelf life slow mover past expiry in WH2.',
  },
];

// 6 Purchase Requests in various states
export const SEED_PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: 'PR-2026-001',
    prNumber: 'PR-901',
    sku: 'SKU-ING-01',
    productName: 'Refined White Cane Sugar 50kg Sack',
    category: 'Ingredients',
    requestedQty: 120,
    unit: 'sack',
    estimatedCost: 864000,
    date: '2026-11-06',
    status: 'Approved',
    requestedBy: 'Nasir Iqbal (Procurement Officer)',
    approverComment: 'Approved. Chashma Sugar Mills quoted best rate at 30 days credit.',
    approvedBy: 'Bilal Ahmed (Plant Manager)',
    suggestedSupplier: 'Chashma Sugar Mills Multan',
    poCreated: true,
    auditTrail: [
      {
        date: '2026-11-06',
        action: 'Created Draft',
        user: 'Nasir Iqbal (Procurement)',
        notes: 'Stock calculation indicated projected stockout within 12 days.',
      },
      {
        date: '2026-11-07',
        action: 'Submitted for Approval',
        user: 'Nasir Iqbal (Procurement)',
      },
      {
        date: '2026-11-08',
        action: 'Approved & PO Issued',
        user: 'Bilal Ahmed (Manager)',
        notes: 'PO-8812 dispatched to Chashma Sugar Mills.',
      },
    ],
  },
  {
    id: 'PR-2026-002',
    prNumber: 'PR-902',
    sku: 'SKU-ING-02',
    productName: 'Premium Maida Wheat Flour 50kg Bag',
    category: 'Ingredients',
    requestedQty: 180,
    unit: 'bag',
    estimatedCost: 972000,
    date: '2026-11-08',
    status: 'Pending approval',
    requestedBy: 'Nasir Iqbal (Procurement Officer)',
    suggestedSupplier: 'Chenab Flour Mills Khanewal',
    auditTrail: [
      {
        date: '2026-11-08',
        action: 'Submitted for Approval',
        user: 'Nasir Iqbal (Procurement)',
        notes: 'Lead time 7 days. Current usable stock below safety stock threshold.',
      },
    ],
  },
  {
    id: 'PR-2026-003',
    prNumber: 'PR-903',
    sku: 'SKU-ING-03',
    productName: 'RBD Palm Olein Oil 16kg Tin',
    category: 'Ingredients',
    requestedQty: 140,
    unit: 'tin',
    estimatedCost: 952000,
    date: '2026-11-09',
    status: 'Draft',
    requestedBy: 'Nasir Iqbal (Procurement Officer)',
    suggestedSupplier: 'Habib Oil Mills Karachi Depot',
    auditTrail: [
      {
        date: '2026-11-09',
        action: 'Created Draft',
        user: 'Nasir Iqbal (Procurement)',
        notes: 'Draft based on system suggested reorder qty calculation.',
      },
    ],
  },
  {
    id: 'PR-2026-004',
    prNumber: 'PR-904',
    sku: 'SKU-PKG-01',
    productName: 'BOPP Printed Biscuit Wrapper Film 20kg Roll',
    category: 'Packaging',
    requestedQty: 50,
    unit: 'roll',
    estimatedCost: 725000,
    date: '2026-11-03',
    status: 'Approved',
    requestedBy: 'Nasir Iqbal (Procurement Officer)',
    approverComment: 'Urgent. Print cylinder cylinder setup approved.',
    approvedBy: 'Bilal Ahmed (Plant Manager)',
    suggestedSupplier: 'Tri-Pack Films Karachi',
    poCreated: true,
    auditTrail: [
      {
        date: '2026-11-03',
        action: 'Created & Submitted',
        user: 'Nasir Iqbal (Procurement)',
      },
      {
        date: '2026-11-04',
        action: 'Approved',
        user: 'Bilal Ahmed (Manager)',
      },
    ],
  },
  {
    id: 'PR-2026-005',
    prNumber: 'PR-905',
    sku: 'SKU-ING-04',
    productName: 'Alkalized Cocoa Powder 25kg Bag',
    category: 'Ingredients',
    requestedQty: 40,
    unit: 'bag',
    estimatedCost: 1060000,
    date: '2026-10-28',
    status: 'Rejected',
    requestedBy: 'Nasir Iqbal (Procurement Officer)',
    approverComment: 'Rejected: winter demand for dark chocolate is stable; existing stock sufficient for 45 days.',
    approvedBy: 'Bilal Ahmed (Plant Manager)',
    suggestedSupplier: 'Barry Callebaut Imp. Lahore',
    auditTrail: [
      {
        date: '2026-10-28',
        action: 'Submitted',
        user: 'Nasir Iqbal (Procurement)',
      },
      {
        date: '2026-10-29',
        action: 'Rejected',
        user: 'Bilal Ahmed (Manager)',
        notes: 'Advised to review slow-moving stock before committing capex.',
      },
    ],
  },
  {
    id: 'PR-2026-006',
    prNumber: 'PR-906',
    sku: 'SKU-PKG-02',
    productName: '5-Ply Corrugated Master Shipper Carton (Pack 100x)',
    category: 'Packaging',
    requestedQty: 60,
    unit: 'pack',
    estimatedCost: 510000,
    date: '2026-11-10',
    status: 'Pending approval',
    requestedBy: 'Nasir Iqbal (Procurement Officer)',
    suggestedSupplier: 'Packages Ltd Lahore',
    auditTrail: [
      {
        date: '2026-11-10',
        action: 'Submitted for Approval',
        user: 'Nasir Iqbal (Procurement)',
      },
    ],
  },
];

// Supplier Quotations comparison dataset
export const SEED_SUPPLIER_QUOTATIONS: SupplierQuotation[] = [
  // Cane Sugar
  {
    id: 'QUOT-01',
    sku: 'SKU-ING-01',
    supplier: 'Chashma Sugar Mills Multan',
    city: 'Multan',
    pricePerUnit: 7200,
    leadTimeDays: 7,
    moq: 50,
    paymentTerms: '30 Days Net Credit',
    qualityRating: 4.8,
    notes: 'Local Multan mill, lowest transit risk, free delivery on orders >= 100 sacks.',
  },
  {
    id: 'QUOT-02',
    sku: 'SKU-ING-01',
    supplier: 'Al-Moiz Industries D.I. Khan',
    city: 'D.I. Khan',
    pricePerUnit: 7050,
    leadTimeDays: 12,
    moq: 150,
    paymentTerms: '15 Days Net Credit',
    qualityRating: 4.5,
    notes: 'Lower unit price but higher MOQ and freight cost of PKR 150/sack.',
  },
  {
    id: 'QUOT-03',
    sku: 'SKU-ING-01',
    supplier: 'JDW Sugar Mills Rahim Yar Khan',
    city: 'Rahim Yar Khan',
    pricePerUnit: 7350,
    leadTimeDays: 9,
    moq: 80,
    paymentTerms: 'Cash on Delivery (2% discount)',
    qualityRating: 4.9,
    notes: 'Premium crystal grade, requires upfront liquidity.',
  },

  // Maida Wheat Flour
  {
    id: 'QUOT-04',
    sku: 'SKU-ING-02',
    supplier: 'Chenab Flour Mills Khanewal',
    city: 'Khanewal',
    pricePerUnit: 5400,
    leadTimeDays: 5,
    moq: 60,
    paymentTerms: '21 Days Net Credit',
    qualityRating: 4.7,
    notes: 'Close proximity to Multan factory. Consistent wet gluten 30%.',
  },
  {
    id: 'QUOT-05',
    sku: 'SKU-ING-02',
    supplier: 'Multan Roller Flour Mills Ltd',
    city: 'Multan',
    pricePerUnit: 5550,
    leadTimeDays: 3,
    moq: 40,
    paymentTerms: '30 Days Net Credit',
    qualityRating: 4.6,
    notes: 'Same-day emergency dispatch available for minor premium.',
  },

  // Palm Olein Oil
  {
    id: 'QUOT-06',
    sku: 'SKU-ING-03',
    supplier: 'Habib Oil Mills Karachi Depot',
    city: 'Karachi',
    pricePerUnit: 6800,
    leadTimeDays: 14,
    moq: 80,
    paymentTerms: '30 Days Net Credit',
    qualityRating: 4.9,
    notes: 'Direct refinery supplier. High smoke point 235°C certified.',
  },
  {
    id: 'QUOT-07',
    sku: 'SKU-ING-03',
    supplier: 'Dalda Foods Multan Regional Depot',
    city: 'Multan',
    pricePerUnit: 7100,
    leadTimeDays: 5,
    moq: 30,
    paymentTerms: '15 Days Net Credit',
    qualityRating: 4.9,
    notes: 'Local depot stock, faster fulfillment with higher unit tariff.',
  },

  // Cocoa Powder
  {
    id: 'QUOT-08',
    sku: 'SKU-ING-04',
    supplier: 'Barry Callebaut Imp. Lahore',
    city: 'Lahore',
    pricePerUnit: 26500,
    leadTimeDays: 18,
    moq: 20,
    paymentTerms: 'LC at Sight / Advance 50%',
    qualityRating: 4.95,
    notes: 'Official importer for Swiss alkalized Dutch-grade cocoa.',
  },
  {
    id: 'QUOT-09',
    sku: 'SKU-ING-04',
    supplier: 'Asian Food Flavours Karachi',
    city: 'Karachi',
    pricePerUnit: 24200,
    leadTimeDays: 24,
    moq: 35,
    paymentTerms: '30 Days Net Credit',
    qualityRating: 4.3,
    notes: 'Indonesian origin cocoa. Higher ash content (11.5%).',
  },

  // Corrugated Shipper Cartons
  {
    id: 'QUOT-10',
    sku: 'SKU-PKG-02',
    supplier: 'Packages Ltd Lahore',
    city: 'Lahore',
    pricePerUnit: 8500,
    leadTimeDays: 10,
    moq: 40,
    paymentTerms: '45 Days Net Credit',
    qualityRating: 4.9,
    notes: 'High edge crush test (ECT 44) kraft board. ISO 9001 certified.',
  },
  {
    id: 'QUOT-11',
    sku: 'SKU-PKG-02',
    supplier: 'Al-Qadir Corrugated Boxes Multan',
    city: 'Multan',
    pricePerUnit: 8100,
    leadTimeDays: 6,
    moq: 50,
    paymentTerms: '15 Days Net Credit',
    qualityRating: 4.4,
    notes: 'Local box maker, competitive rate, slightly lower burst test factor.',
  },
];
