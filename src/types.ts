/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  barcode: string;
  name: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  image?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  barcode: string; // The product barcode this discount applies to
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface StoreSettings {
  storeName: string;
  phone: string;
  address: string;
  receiptHeader: string;
  receiptFooter: string;
  logoBg: string;
  logoText: string;
  printPaperSize: '58mm' | '80mm';
  printerConnectedName?: string;
  adminPin?: string;
}

export interface TransactionItem {
  productBarcode: string;
  productName: string;
  quantity: number;
  price: number; // original price
  discountApplied: number; // discount code / promotion applied per unit
  finalPrice: number; // price after discount
  subtotal: number; // price * quantity
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string
  items: TransactionItem[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  cashPaid: number;
  change: number;
  cashierName: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  appliedDiscount?: Discount;
}
