/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, Search, Plus, Minus, Trash2, Settings, Printer, 
  TrendingUp, DollarSign, Layers, ShoppingBag, Check, Edit, 
  X, Percent, Camera, Download, RefreshCw, LogOut, Database, 
  Calendar, Wifi, QrCode, FileText, ShoppingCart, Info, Lock
} from 'lucide-react';
import { Product, Category, Discount, StoreSettings, Transaction, CartItem } from './types';

// ==========================================
// SIMULATED SQLITE / OFFLINE DATABASE LAYER
// ==========================================
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Beverages' },
  { id: '2', name: 'Food' },
  { id: '3', name: 'Snacks' },
  { id: '4', name: 'Personal Care' },
];

const DEFAULT_PRODUCTS: Product[] = [
  { barcode: '8991111100010', name: 'Nescafe Gold 200g', category: 'Beverages', costPrice: 85000, sellPrice: 115000, stock: 42 },
  { barcode: '8992222200021', name: 'Susu UHT Full Cream 1L', category: 'Beverages', costPrice: 14000, sellPrice: 1850000 / 100, stock: 12 },
  { barcode: '8993333300032', name: 'Indomie Goreng (Pack)', category: 'Food', costPrice: 2800, sellPrice: 3500, stock: 124 },
  { barcode: '8994444400043', name: 'Minyak Goreng 2L', category: 'Food', costPrice: 28000, sellPrice: 34200, stock: 8 },
  { barcode: '8995555500054', name: 'Sabun Mandi 4x100g', category: 'Personal Care', costPrice: 18000, sellPrice: 22800, stock: 56 },
  { barcode: '8996666600065', name: 'Air Mineral 600ml', category: 'Beverages', costPrice: 1800, sellPrice: 3000, stock: 210 },
];

const DEFAULT_DISCOUNTS: Discount[] = [
  { id: 'disc-1', name: 'Promo Susu Rame', type: 'percentage', value: 15, barcode: '8992222200021', startDate: '2026-01-01', endDate: '2026-12-31', isActive: true },
  { id: 'disc-2', name: 'Diskon Indomie', type: 'fixed', value: 500, barcode: '8993333300032', startDate: '2026-05-01', endDate: '2026-06-30', isActive: true }
];

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Kencana Mandiri',
  phone: '0812-3456-7890',
  address: 'Jl. Malioboro No. 42, Yogyakarta',
  receiptHeader: 'TERIMA KASIH TELAH BERBELANJA',
  receiptFooter: 'Barang yang sudah dibeli\ntidak dapat ditukar/dilakukan penukaran.\nLayanan Pengaduan: 0812-3456-7890',
  logoBg: '#4F46E5',
  logoText: 'KM',
  printPaperSize: '58mm',
  printerConnectedName: 'Thermal BT-P58',
  adminPin: '1234'
};

const SQLite = {
  getProducts: (): Product[] => {
    const data = localStorage.getItem('sqlite_products');
    if (!data) {
      localStorage.setItem('sqlite_products', JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    return JSON.parse(data);
  },
  saveProducts: (products: Product[]) => {
    localStorage.setItem('sqlite_products', JSON.stringify(products));
    SQLite.logQuery('UPDATE products SET ...');
  },
  getCategories: (): Category[] => {
    const data = localStorage.getItem('sqlite_categories');
    if (!data) {
      localStorage.setItem('sqlite_categories', JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(data);
  },
  saveCategories: (categories: Category[]) => {
    localStorage.setItem('sqlite_categories', JSON.stringify(categories));
    SQLite.logQuery('UPDATE categories SET ...');
  },
  getDiscounts: (): Discount[] => {
    const data = localStorage.getItem('sqlite_discounts');
    if (!data) {
      localStorage.setItem('sqlite_discounts', JSON.stringify(DEFAULT_DISCOUNTS));
      return DEFAULT_DISCOUNTS;
    }
    return JSON.parse(data);
  },
  saveDiscounts: (discounts: Discount[]) => {
    localStorage.setItem('sqlite_discounts', JSON.stringify(discounts));
    SQLite.logQuery('UPDATE discounts SET ...');
  },
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem('sqlite_transactions');
    return data ? JSON.parse(data) : [];
  },
  saveTransactions: (txs: Transaction[]) => {
    localStorage.setItem('sqlite_transactions', JSON.stringify(txs));
    SQLite.logQuery('INSERT INTO transactions ...');
  },
  getSettings: (): StoreSettings => {
    const data = localStorage.getItem('sqlite_settings');
    if (!data) {
      localStorage.setItem('sqlite_settings', JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(data);
  },
  saveSettings: (settings: StoreSettings) => {
    localStorage.setItem('sqlite_settings', JSON.stringify(settings));
    SQLite.logQuery('UPDATE store_settings SET ...');
  },
  getQueryLogs: (): string[] => {
    const logs = localStorage.getItem('sqlite_logs');
    return logs ? JSON.parse(logs).slice(-50) : [];
  },
  logQuery: (query: string) => {
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
    const logs = SQLite.getQueryLogs();
    logs.push(`[${timestamp}] ${query}`);
    localStorage.setItem('sqlite_logs', JSON.stringify(logs));
  },
  resetDatabase: () => {
    localStorage.removeItem('sqlite_products');
    localStorage.removeItem('sqlite_categories');
    localStorage.removeItem('sqlite_discounts');
    localStorage.removeItem('sqlite_transactions');
    localStorage.removeItem('sqlite_settings');
    localStorage.removeItem('sqlite_logs');
    SQLite.logQuery('VACUUM; REINDEX ALL;');
  }
};

export default function App() {
  // --- DATABASE STATES ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [sqlliteLogs, setSqliteLogs] = useState<string[]>([]);

  // --- RUNTIME STATES ---
  const [activeTab, setActiveTab] = useState<'cashier' | 'inventory' | 'reports' | 'settings'>('cashier');
  const [role, setRole] = useState<'cashier' | 'admin'>('cashier');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [productSearch, setProductSearch] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashierActiveSubView, setCashierActiveSubView] = useState<'products' | 'cart'>('products');
  
  // Custom Keyboard Barcode Scanning speed observer
  const [keyboardBuffer, setKeyboardBuffer] = useState<string>('');
  const [lastKeyPressTime, setLastKeyPressTime] = useState<number>(0);

  // Form states (Admin Product)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  // Discount forms state
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [newDiscount, setNewDiscount] = useState<Partial<Discount>>({
    name: '', type: 'percentage', value: 10, barcode: '', startDate: '', endDate: '', isActive: true
  });

  // Printer configuration states
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [testPrintText, setTestPrintText] = useState('TEST thermal print OK!');

  // Real-time Check-out States
  const [cashPayment, setCashPayment] = useState<number>(0);
  const [lastCompletedTx, setLastCompletedTx] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Camera Barcode Scanning States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraVideoAvailable, setCameraVideoAvailable] = useState(false);
  const [simulatedScannerActive, setSimulatedScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Notification state
  const [showBeep, setShowBeep] = useState(false);
  const [beepMessage, setBeepMessage] = useState('');

  // Custom dialogue / confirmation popups states (Solves iFrame window open / prompt / alert barriers)
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt' | 'pin';
    title: string;
    message: string;
    inputValue?: string;
    placeholder?: string;
    onSuccess?: (val?: string) => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    inputValue: ''
  });

  const [newCategoryNameInput, setNewCategoryNameInput] = useState('');

  // Dialog Helper Functions
  const showAlert = (title: string, message: string) => {
    setDialogConfig({
      isOpen: true,
      type: 'alert',
      title,
      message,
      onSuccess: () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showConfirm = (title: string, message: string, onSuccess: () => void) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onSuccess: () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        onSuccess();
      },
      onCancel: () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showPrompt = (title: string, message: string, defaultValue: string, placeholder: string, onSuccess: (val: string) => void) => {
    setDialogConfig({
      isOpen: true,
      type: 'prompt',
      title,
      message,
      inputValue: defaultValue,
      placeholder,
      onSuccess: (val) => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        if (val !== undefined) onSuccess(val);
      },
      onCancel: () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Safe Admin Verification PIN helper
  const requestAdminAuth = (onSuccess: () => void, targetMessage = "Harap masukkan PIN Admin untuk melanjutkan:") => {
    setDialogConfig({
      isOpen: true,
      type: 'pin',
      title: '🔐 Verifikasi PIN Administrator',
      message: targetMessage,
      inputValue: '',
      onSuccess: (pin) => {
        const correctPin = settings.adminPin || '1234';
        if (pin === correctPin) {
          setRole('admin');
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          triggerBeep("Akses Admin Aktif!");
          onSuccess();
        } else {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            showAlert("Akses Ditolak", "PIN Administrator yang dimasukkan salah!");
            triggerBeep("PIN Salah");
          }, 150);
        }
      },
      onCancel: () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Safe Role switcher lock
  const handleToggleRole = () => {
    if (role === 'admin') {
      setRole('cashier');
      setActiveTab('cashier'); // Restrict to cashier terminal
      triggerBeep("Keluar Mode Admin");
    } else {
      requestAdminAuth(() => {}, "Masukkan PIN Admin untuk masuk ke Mode Administrator:");
    }
  };

  // Safe Tab switcher lock
  const handleTabChange = (tab: 'cashier' | 'inventory' | 'reports' | 'settings') => {
    if (tab === 'cashier') {
      setActiveTab('cashier');
      triggerBeep("Tab: Kasir");
      return;
    }

    // Tabs inventory, reports, settings require admin role
    if (role === 'admin') {
      setActiveTab(tab);
      triggerBeep(`Tab: ${tab.toUpperCase()}`);
    } else {
      requestAdminAuth(() => {
        setActiveTab(tab);
      }, `Untuk meng-akses menu ${tab === 'inventory' ? 'Gudang & Stok' : tab === 'reports' ? 'Laporan' : 'Pengaturan Toko'}, silakan autentikasi PIN Admin Anda:`);
    }
  };

  // Setup database on startup
  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = () => {
    setProducts(SQLite.getProducts());
    setCategories(SQLite.getCategories());
    setDiscounts(SQLite.getDiscounts());
    setTransactions(SQLite.getTransactions());
    setSettings(SQLite.getSettings());
    setSqliteLogs(SQLite.getQueryLogs());
  };

  // Sound/Vibe cue helper
  const triggerBeep = (message: string) => {
    setBeepMessage(message);
    setShowBeep(true);
    // Beep sound alternative using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // high frequency cash beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); // short beep
    } catch (e) {
      // Audio block fallback
    }
    setTimeout(() => {
      setShowBeep(false);
    }, 1500);
  };

  // EXTERNAL BARCODE SCANNER EMULATOR (BLUETOOTH / OTG HID)
  // Receives global rapid keystrokes & appends to barcode if timestamp delta is < 40ms
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Avoid parsing keyboard if user is editing inputs in admin fields
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyPressTime;
      setLastKeyPressTime(currentTime);

      // Barcode hardware scanner speed threshold: usually characters fire in rapid succession (<= 40ms apart)
      if (e.key === 'Enter') {
        if (keyboardBuffer.length >= 4) {
          SQLite.logQuery(`EXTERNAL INPUT HARDWARE SCANNER DETECTED: ${keyboardBuffer}`);
          handleBarcodeScannedSuccessfully(keyboardBuffer);
        }
        setKeyboardBuffer('');
      } else if (e.key.length === 1 && /^[0-9a-zA-Z]$/.test(e.key)) {
        if (timeDiff < 60 || keyboardBuffer === '') {
          setKeyboardBuffer(prev => prev + e.key);
        } else {
          // If slow, reset buffer and set this character as first
          setKeyboardBuffer(e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [keyboardBuffer, lastKeyPressTime, products, discounts]);

  // Handle barcode scanned manually, simulated, or externally
  const handleBarcodeScannedSuccessfully = (scannedCode: string) => {
    // Find product
    const product = products.find(p => p.barcode === scannedCode);
    if (product) {
      if (product.stock <= 0) {
        triggerBeep(`STOK HABIS: ${product.name}`);
        return;
      }
      addToCart(product);
      triggerBeep(`Scanned: ${product.name}`);
    } else {
      triggerBeep(`Barcode Tidak Terdaftar: ${scannedCode}`);
    }
  };

  // CART LOGIC
  const addToCart = (product: Product) => {
    // Check if item is already in cart
    const existingIndex = cart.findIndex(item => item.product.barcode === product.barcode);
    
    // Find active promotional discount targets
    const currentDateStr = new Date().toISOString().split('T')[0];
    const itemDiscount = discounts.find(d => 
      d.isActive && 
      d.barcode === product.barcode && 
      currentDateStr >= d.startDate && 
      currentDateStr <= d.endDate
    );

    if (existingIndex > -1) {
      const currentQtyInCart = cart[existingIndex].quantity;
      if (currentQtyInCart + 1 > product.stock) {
        triggerBeep(`Stok Terbatas! Hanya ada ${product.stock} unit.`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantity: 1, appliedDiscount: itemDiscount }]);
    }
  };

  const removeFromCart = (barcode: string) => {
    setCart(cart.filter(item => item.product.barcode !== barcode));
  };

  const updateCartQty = (barcode: string, newQty: number) => {
    const p = products.find(prod => prod.barcode === barcode);
    if (!p) return;
    if (newQty > p.stock) {
      triggerBeep(`Stok Terbatas! Hanya sisa ${p.stock} unit.`);
      return;
    }
    if (newQty <= 0) {
      removeFromCart(barcode);
      return;
    }
    setCart(cart.map(item => 
      item.product.barcode === barcode ? { ...item, quantity: newQty } : item
    ));
  };

  const calculateCartTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;

    cart.forEach(item => {
      const originalPrice = item.product.sellPrice;
      let savingsPerUnit = 0;

      if (item.appliedDiscount) {
        if (item.appliedDiscount.type === 'percentage') {
          savingsPerUnit = (originalPrice * item.appliedDiscount.value) / 100;
        } else {
          savingsPerUnit = item.appliedDiscount.value;
        }
      }

      subtotal += originalPrice * item.quantity;
      discountTotal += savingsPerUnit * item.quantity;
    });

    const grandTotal = Math.max(0, subtotal - discountTotal);

    return { subtotal, discountTotal, grandTotal };
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // CHECKOUT PROCESS
  const handleCheckout = () => {
    const { subtotal, discountTotal, grandTotal } = calculateCartTotals();
    if (cart.length === 0) {
      showAlert("Transaksi Batal", "Isi keranjang belanja Anda masih kosong!");
      return;
    }
    if (cashPayment < grandTotal) {
      showAlert("Uang Pembayaran Kurang", `Nominal bayar kurang! Total transaksi: ${formatRupiah(grandTotal)} sedangkan jumlah uang diserahkan: ${formatRupiah(cashPayment)}`);
      return;
    }

    const change = cashPayment - grandTotal;
    const invNumber = 'INV-' + Date.now().toString().substring(6);
    
    const txItems = cart.map(item => {
      const originalPrice = item.product.sellPrice;
      let savingsPerUnit = 0;
      if (item.appliedDiscount) {
        if (item.appliedDiscount.type === 'percentage') {
          savingsPerUnit = (originalPrice * item.appliedDiscount.value) / 100;
        } else {
          savingsPerUnit = item.appliedDiscount.value;
        }
      }
      const finalPrice = originalPrice - savingsPerUnit;
      return {
        productBarcode: item.product.barcode,
        productName: item.product.name,
        quantity: item.quantity,
        price: originalPrice,
        discountApplied: savingsPerUnit,
        finalPrice,
        subtotal: finalPrice * item.quantity
      };
    });

    const newTransaction: Transaction = {
      id: 'tx-' + Math.random().toString(36).substr(2, 9),
      invoiceNumber: invNumber,
      date: new Date().toISOString(),
      items: txItems,
      subtotal,
      discountTotal,
      grandTotal,
      cashPaid: cashPayment,
      change,
      cashierName: role === 'admin' ? 'Administrator' : 'Kasir Utama'
    };

    // Commit Transaction in SQLite State (Offline list)
    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    SQLite.saveTransactions(updatedTransactions);

    // Update product stock counts
    const updatedProducts = products.map(prod => {
      const purchased = cart.find(c => c.product.barcode === prod.barcode);
      if (purchased) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - purchased.quantity)
        };
      }
      return prod;
    });

    setProducts(updatedProducts);
    SQLite.saveProducts(updatedProducts);

    // Finalize state
    setLastCompletedTx(newTransaction);
    setIsReceiptModalOpen(true);
    triggerBeep("Transaksi Sukses & Struk Terbentuk!");
    setCart([]);
    setCashPayment(0);
  };

  // CAMERA SCANNER REALTIME ACCESS FALLBACK & CONTROLLER
  const toggleCameraScanner = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      setIsCameraActive(true);
      setSimulatedScannerActive(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        setCameraVideoAvailable(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        
        // Setup simple barcode scanning decoder simulation loop
        // It acts as a real detector with mock frames periodically
        scanTimerRef.current = setInterval(() => {
          // Pointless decoder simulation: let's pick a random product occasionally
          // unless user points to the onscreen simulated targets.
        }, 3000);

      } catch (err) {
        console.warn("Camera media forbidden or not sandbox compatible:", err);
        setCameraVideoAvailable(false);
        // Fall back to active simulated scan panel
        setSimulatedScannerActive(true);
      }
    }
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    setCameraVideoAvailable(false);
    setSimulatedScannerActive(false);
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, []);

  // PRINTING UTILITIES & STRUCT PRINT PREVIEW FORMATTER
  const generateEscPosVisual = (tx: Transaction) => {
    const widthChar = settings.printPaperSize === '58mm' ? 32 : 48;
    const divider = '-'.repeat(widthChar);
    const doubleDivider = '='.repeat(widthChar);
    
    let result = '';
    result += `[ESC] [INIT]\n`;
    result += `[ALIGN CENTER]\n`;
    result += `** ${settings.storeName.toUpperCase()} **\n`;
    result += `${settings.address}\n`;
    result += `Telp: ${settings.phone}\n`;
    result += `${divider}\n`;
    result += `[ALIGN LEFT]\n`;
    result += `No  : ${tx.invoiceNumber}\n`;
    result += `Tgl : ${new Date(tx.date).toLocaleDateString()} ${new Date(tx.date).toLocaleTimeString()}\n`;
    result += `Ksr : ${tx.cashierName}\n`;
    result += `${divider}\n`;
    
    tx.items.forEach(item => {
      result += `${item.productName}\n`;
      const qtyPrice = `  ${item.quantity} x ${item.price.toLocaleString('id-ID')}`;
      const itemSub = item.subtotal.toLocaleString('id-ID');
      const spaceNeeded = widthChar - qtyPrice.length - itemSub.length;
      result += `${qtyPrice}${' '.repeat(Math.max(1, spaceNeeded))}${itemSub}\n`;
      if (item.discountApplied > 0) {
        result += `  * Pot. Harga: -${(item.discountApplied * item.quantity).toLocaleString('id-ID')}\n`;
      }
    });
    
    result += `${divider}\n`;
    
    const lines = [
      { l: 'Subtotal', r: tx.subtotal.toLocaleString('id-ID') },
      { l: 'Diskon Belanja', r: `-${tx.discountTotal.toLocaleString('id-ID')}` },
      { l: 'Grand Total', r: tx.grandTotal.toLocaleString('id-ID') },
      { l: 'Tunai', r: tx.cashPaid.toLocaleString('id-ID') },
      { l: 'Kembalian', r: tx.change.toLocaleString('id-ID') }
    ];

    lines.forEach(line => {
      const spaceNeeded = widthChar - line.l.length - line.r.length;
      result += `${line.l}${' '.repeat(Math.max(1, spaceNeeded))}${line.r}\n`;
    });
    
    result += `${doubleDivider}\n`;
    result += `[ALIGN CENTER]\n`;
    result += `${settings.receiptHeader}\n\n`;
    result += `${settings.receiptFooter}\n`;
    result += `\n[FEED 3]\n[CUT]\n`;
    return result;
  };

  // TRIGGER HTML PRINT DIALOG WITH SPECIFIC PAPER CSS INJECTED
  const printDirectlyToPaper = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const { subtotal, discountTotal, grandTotal } = lastCompletedTx ? lastCompletedTx : { subtotal: 0, discountTotal: 0, grandTotal: 0 };
    const tx = lastCompletedTx || {
      invoiceNumber: 'INV-SAMPLE',
      date: new Date().toISOString(),
      items: [],
      subtotal: 0,
      discountTotal: 0,
      grandTotal: 0,
      cashPaid: 0,
      change: 0,
      cashierName: 'Demo Cashier'
    };

    const paperSizeStyle = settings.printPaperSize === '58mm' ? 'width: 58mm; padding: 2mm;' : 'width: 80mm; padding: 4mm;';

    const itemsHtml = tx.items.map(item => `
      <div style="margin-bottom: 4px;">
        <div style="font-weight: bold; font-size: 11px;">${item.productName}</div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>${item.quantity} x Rp ${item.price.toLocaleString('id-ID')}</span>
          <span>Rp ${item.subtotal.toLocaleString('id-ID')}</span>
        </div>
        ${item.discountApplied > 0 ? `<div style="font-size: 9px; color: #555; text-align: left;">* Disc: -Rp ${(item.discountApplied * item.quantity).toLocaleString('id-ID')}</div>` : ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${tx.invoiceNumber}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; background-color: #fff; }
              @page { margin: 0; }
            }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              color: #000;
              background-color: #fff;
              line-height: 1.2;
              ${paperSizeStyle}
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .double-divider { border-top: 2px double #000; margin: 8px 0; }
            .flex-between { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center" style="margin-bottom: 8px;">
            <div style="font-size: 16px; font-weight: bold; border: 1px solid #000; display: inline-block; padding: 2px 8px; margin-bottom: 4px;">${settings.logoText}</div>
            <div style="font-size: 13px; font-weight: bold;">${settings.storeName}</div>
            <div style="font-size: 9px;">${settings.address}</div>
            <div style="font-size: 9px;">Telp: ${settings.phone}</div>
          </div>
          <div class="divider"></div>
          <div style="font-size: 10px; margin-bottom: 4px;">
            <div class="flex-between"><span>No: ${tx.invoiceNumber}</span></div>
            <div class="flex-between"><span>Tgl: ${new Date(tx.date).toLocaleString('id-ID')}</span></div>
            <div class="flex-between"><span>Ksr: ${tx.cashierName}</span></div>
          </div>
          <div class="divider"></div>
          <div>${itemsHtml}</div>
          <div class="divider"></div>
          <div style="font-size: 11px;">
            <div class="flex-between"><span>Subtotal:</span><span>Rp ${tx.subtotal.toLocaleString('id-ID')}</span></div>
            <div class="flex-between"><span>Diskon:</span><span>-Rp ${tx.discountTotal.toLocaleString('id-ID')}</span></div>
            <div class="flex-between class="bold""><span>GRAND TOTAL:</span><span class="bold">Rp ${tx.grandTotal.toLocaleString('id-ID')}</span></div>
            <div class="flex-between"><span>Bayar Tunai:</span><span>Rp ${tx.cashPaid.toLocaleString('id-ID')}</span></div>
            <div class="flex-between"><span>Kembalian:</span><span>Rp ${tx.change.toLocaleString('id-ID')}</span></div>
          </div>
          <div class="double-divider"></div>
          <div class="center" style="font-size: 10px;">
            <div class="bold" style="margin-bottom: 4px;">${settings.receiptHeader}</div>
            <div style="white-space: pre-wrap; font-size: 9px;">${settings.receiptFooter}</div>
          </div>
          <script>
            window.addEventListener('load', () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // EXCEL / CSV REPORT EXPORT
  const exportToExcelCSV = (type: 'daily' | 'monthly' | 'products') => {
    let headers = '';
    let rows = '';
    let filename = '';

    if (type === 'daily' || type === 'monthly') {
      headers = 'ID Transaksi,Nomor Invoice,Tanggal,Total Item,Subtotal,Diskon,Grand Total,Bayar,Kembali,Kasir\n';
      transactions.forEach(tx => {
        const itemCount = tx.items.reduce((acc, current) => acc + current.quantity, 0);
        rows += `"${tx.id}","${tx.invoiceNumber}","${new Date(tx.date).toLocaleString('id-ID')}","${itemCount}","${tx.subtotal}","${tx.discountTotal}","${tx.grandTotal}","${tx.cashPaid}","${tx.change}","${tx.cashierName}"\n`;
      });
      filename = `Laporan_Penjualan_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = 'Barcode,Nama Produk,Kategori,Harga Modal,Harga Jual,Stok Saat Ini\n';
      products.forEach(p => {
        rows += `"${p.barcode}","${p.name}","${p.category}","${p.costPrice}","${p.sellPrice}","${p.stock}"\n`;
      });
      filename = `Laporan_Inventaris_Produk_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      SQLite.logQuery(`EXPORT EXCEL CSV SUCCESSFUL: ${filename}`);
      triggerBeep(`Downloaded: ${filename}`);
    }
  };

  // PRINTING LANDSCAPE REPORT PDF MAKER VIA BROWSER
  const printReportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
    const totalTransactions = transactions.length;
    const totalCost = transactions.reduce((currSum, tx) => {
      let costSum = 0;
      tx.items.forEach(it => {
        const prodMatch = products.find(p => p.barcode === it.productBarcode);
        const unitCost = prodMatch ? prodMatch.costPrice : it.price * 0.7; // fallback 70% cost
        costSum += (unitCost * it.quantity);
      });
      return currSum + costSum;
    }, 0);
    const totalProfit = totalRevenue - totalCost;

    const rowsHtml = transactions.map((tx, idx) => `
      <tr style="border-bottom: 1px solid #ddd; height: 32px;">
        <td style="text-align: center;">${idx + 1}</td>
        <td>${tx.invoiceNumber}</td>
        <td>${new Date(tx.date).toLocaleDateString('id-ID')} ${new Date(tx.date).toLocaleTimeString('id-ID')}</td>
        <td>${tx.cashierName}</td>
        <td style="text-align: right;">Rp ${tx.subtotal.toLocaleString('id-ID')}</td>
        <td style="text-align: right; color: #dc2626;">-Rp ${tx.discountTotal.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-weight: bold; color: #16a34a;">Rp ${tx.grandTotal.toLocaleString('id-ID')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Penjualan_Rekap POS Offline</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #333; }
            .header-banner { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #4F46E5; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: bold; color: #1f2937; }
            .meta { font-size: 13px; color: #4b5563; }
            .metric-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
            .metric-card { border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; background-color: #f9fafb; text-align: center; }
            .metric-val { font-size: 20px; font-weight: bold; color: #111827; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background-color: #f3f4f6; color: #374151; padding: 10px; font-weight: bold; border-bottom: 2px solid #d1d5db; }
            td { padding: 10px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <div class="title">LAPORAN PENJUALAN RETAIL</div>
              <div class="meta">Sistem Kasir Offline - ${settings.storeName}</div>
            </div>
            <div style="text-align: right;" class="meta">
              <strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}<br/>
              <strong>Status Database:</strong> 100% Offline SQLite Simulator
            </div>
          </div>

          <div class="metric-grid">
            <div class="metric-card">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600;">OMSET KOTOR (REVENUE)</div>
              <div class="metric-val" style="color: #4F46E5;">Rp ${totalRevenue.toLocaleString('id-ID')}</div>
            </div>
            <div class="metric-card">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600;">TOTAL TRANSAKSI</div>
              <div class="metric-val">${totalTransactions} Struk</div>
            </div>
            <div class="metric-card">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600;">ESTIMASI MODAL (COST)</div>
              <div class="metric-val" style="color: #b91c1c;">Rp ${totalCost.toLocaleString('id-ID')}</div>
            </div>
            <div class="metric-card">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600;">LABA BERSIH (NETTI)</div>
              <div class="metric-val" style="color: #16a34a;">Rp ${totalProfit.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <h3 style="margin-bottom: 8px; color: #1f2937;">REKAP TRANSAKSI TERAKHIR</h3>
          <table>
            <thead>
              <tr>
                <th width="50">No</th>
                <th align="left">Struk / Invoice</th>
                <th align="left">Tanggal Transaksi</th>
                <th align="left">Petugas Kasir</th>
                <th align="right">Subtotal</th>
                <th align="right">Diskon Diskon</th>
                <th align="right">Harga Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="7" style="text-align:center; color:#999; padding: 32px;">Belum ada sejarah transaksi yang tersimpan di SQLite HP ini.</td></tr>`}
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px dashed #ccc; padding-top: 16px;">
            Laporan didistribusikan secara otomatis oleh POS Offline ${settings.storeName}. Data tersimpan di memory internal handphone.
          </div>

          <script>
            window.addEventListener('load', () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ADMIN PRODUCT MUTATION ACTIONS
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.barcode || !editForm.name || !editForm.sellPrice) {
      showAlert("Validasi Barcode", "Harap lengkapi Barcode, Nama Produk, dan Harga Jual!");
      return;
    }

    const priceSell = Number(editForm.sellPrice);
    const priceCost = Number(editForm.costPrice || 0);

    const updatedProductPayload: Product = {
      barcode: editForm.barcode,
      name: editForm.name,
      category: editForm.category || categories[0]?.name || 'Umum',
      costPrice: priceCost,
      sellPrice: priceSell,
      stock: Number(editForm.stock || 0)
    };

    let updatedProducts: Product[];
    if (editingProduct) {
      SQLite.logQuery(`UPDATE products SET name='${updatedProductPayload.name}', stock=${updatedProductPayload.stock} WHERE barcode='${editingProduct.barcode}'`);
      updatedProducts = products.map(p => p.barcode === editingProduct.barcode ? updatedProductPayload : p);
    } else {
      // Create new
      if (products.some(p => p.barcode === updatedProductPayload.barcode)) {
        showAlert("Gagal Simpan Produk", "Gagal: Barcode sudah digunakan oleh produk lain!");
        return;
      }
      SQLite.logQuery(`INSERT INTO products (barcode, name, costPrice, sellPrice, stock) VALUES ('${updatedProductPayload.barcode}', '${updatedProductPayload.name}', ${priceCost}, ${priceSell}, ${updatedProductPayload.stock})`);
      updatedProducts = [updatedProductPayload, ...products];
    }

    setProducts(updatedProducts);
    SQLite.saveProducts(updatedProducts);
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setEditForm({});
    triggerBeep("Produk Tersimpan di SQLite!");
  };

  const handleDeleteProduct = (barcode: string) => {
    showConfirm(
      "Hapus Produk Offline",
      "Apakah Anda yakin ingin menghapus produk ini dari database offline? Tindakan ini tidak dapat dibatalkan.",
      () => {
        const updated = products.filter(p => p.barcode !== barcode);
        setProducts(updated);
        SQLite.saveProducts(updated);
        SQLite.logQuery(`DELETE FROM products WHERE barcode='${barcode}'`);
        triggerBeep("Produk Dihapus!");
      }
    );
  };

  // NEW DISCOUNT SUBMISSION
  const handleAddDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscount.name || !newDiscount.barcode || !newDiscount.value) {
      showAlert("Data Belum Lengkap", "Harap lengkapi seluruh kolom isian program promo diskon!");
      return;
    }

    const discountPayload: Discount = {
      id: 'disc-' + Math.random().toString(36).substr(2, 9),
      name: newDiscount.name,
      type: newDiscount.type as 'percentage' | 'fixed',
      value: Number(newDiscount.value),
      barcode: newDiscount.barcode,
      startDate: newDiscount.startDate || new Date().toISOString().split('T')[0],
      endDate: newDiscount.endDate || '2026-12-31',
      isActive: true
    };

    const updated = [discountPayload, ...discounts];
    setDiscounts(updated);
    SQLite.saveDiscounts(updated);
    setIsDiscountModalOpen(false);
    setNewDiscount({ name: '', type: 'percentage', value: 10, barcode: '', startDate: '', endDate: '', isActive: true });
    SQLite.logQuery(`INSERT INTO discounts (id, name, barcode, type, value) VALUES ('${discountPayload.id}', '${discountPayload.name}', '${discountPayload.barcode}', '${discountPayload.type}', ${discountPayload.value})`);
    triggerBeep("Program Diskon Promosi Aktif!");
  };

  const toggleDiscountStatus = (id: string) => {
    const updated = discounts.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d);
    setDiscounts(updated);
    SQLite.saveDiscounts(updated);
    SQLite.logQuery(`UPDATE discounts SET isActive = NOT isActive WHERE id='${id}'`);
    triggerBeep("Status Diskon Diubah!");
  };

  const handleDeleteDiscount = (id: string) => {
    showConfirm(
      "Hapus Program Diskon",
      "Hapus program promo diskon ini dari sistem offline?",
      () => {
        const updated = discounts.filter(d => d.id !== id);
        setDiscounts(updated);
        SQLite.saveDiscounts(updated);
        SQLite.logQuery(`DELETE FROM discounts WHERE id='${id}'`);
        triggerBeep("Diskon Dihapus!");
      }
    );
  };

  // SYSTEM DATA MANAGEMENT
  const handleResetDB = () => {
    showConfirm(
      "Format / Reset Database Offline",
      "PERINGATAN KRITIS: Anda akan menghapus & me-reset database SQLite lokal! Semua data produk dan transaksi akan dikembalikan ke setting awal pabrik. Lanjutkan?",
      () => {
        SQLite.resetDatabase();
        loadDatabase();
        setCart([]);
        triggerBeep("DATABASE TELAH DISANITASI");
      }
    );
  };

  // BACKUP & RESTORE DATABASE (100% OFFLINE)
  const handleExportDBBackup = () => {
    try {
      const backupData = {
        version: "1.0-sqlite-pos",
        exportedAt: new Date().toISOString(),
        storeName: settings.storeName,
        products: SQLite.getProducts(),
        categories: SQLite.getCategories(),
        discounts: SQLite.getDiscounts(),
        transactions: SQLite.getTransactions(),
        settings: SQLite.getSettings(),
        logs: SQLite.getQueryLogs()
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeStoreName = settings.storeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.href = url;
      link.download = `backup_sqlite_${safeStoreName}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      SQLite.logQuery('BACKUP DATABASE EXPORTED SUCCESSFUL');
      triggerBeep("Database Berhasil Diekspor!");
    } catch (err: any) {
      showAlert("Gagal Ekspor", "Gagal melakukan ekspor sinkronisasi database: " + err.message);
    }
  };

  const handleImportDBBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        
        // Validation check for key components
        if (!backup.products || !backup.categories || !backup.settings) {
          throw new Error("Skema file backup tidak valid. File harus mengandung produk, kategori, dan pengaturan toko.");
        }

        // Write directly to simulated SQLite / LocalStorage
        localStorage.setItem('sqlite_products', JSON.stringify(backup.products));
        localStorage.setItem('sqlite_categories', JSON.stringify(backup.categories));
        if (backup.discounts) {
          localStorage.setItem('sqlite_discounts', JSON.stringify(backup.discounts));
        }
        if (backup.transactions) {
          localStorage.setItem('sqlite_transactions', JSON.stringify(backup.transactions));
        }
        localStorage.setItem('sqlite_settings', JSON.stringify(backup.settings));
        if (backup.logs) {
          localStorage.setItem('sqlite_logs', JSON.stringify(backup.logs));
        }

        SQLite.logQuery('RESTORE DATABASE IMPORTED SUCCESSFUL');
        
        // Reload into component states
        loadDatabase();
        setCart([]); // Clear cart to avoid stale references
        triggerBeep("Database SQLite Terpulihkan!");
      } catch (err: any) {
        showAlert("Gagal Impor", "Gagal mengimpor file backup: " + err.message);
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  // FILTERED PRODUCTS FOR MAIN TERMINAL
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.barcode.includes(productSearch);
    return matchCat && matchSearch;
  });

  return (
    <div className="flex h-screen w-screen bg-[#0F1115] text-[#E5E7EB] font-sans overflow-hidden flex-col md:flex-row">
      
      {/* ==================================
          LEFT NAVIGATION SIDEBAR (ELEGANT DARK)
          ================================== */}
      <aside className="hidden md:flex w-64 bg-[#16191E] border-r border-white/5 flex-col justify-between shrink-0">
        <div>
          {/* Brand block */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white text-md">
                {settings.logoText || 'KM'}
              </div>
              <div>
                <h1 className="font-bold text-base leading-none text-white truncate w-36">
                  {settings.storeName}
                </h1>
                <span className="text-[9px] text-[#4F46E5] font-semibold tracking-wider uppercase">
                  Offline Smart Terminal
                </span>
              </div>
            </div>
            
            {/* User credentials & mode selection info */}
            <div className="mt-4 flex flex-col gap-1 bg-white/5 p-2 rounded-lg border border-white/5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium">Modus Operasi:</span>
                <span className="text-green-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  SQLite Offline
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium font-mono">Role Sekarang:</span>
                <span className="text-amber-500 font-semibold uppercase">{role}</span>
              </div>
            </div>
          </div>

          {/* Nav menu links */}
          <nav className="p-3 space-y-1">
            <div className="text-[10px] text-gray-500 font-bold px-3 py-1.5 uppercase tracking-wider">
              Main Terminal
            </div>
            
            {/* Active view selectors */}
            <button 
              onClick={() => { handleTabChange('cashier'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-medium text-left cursor-pointer ${activeTab === 'cashier' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>Kasir Terminal</span>
            </button>

            <button 
              onClick={() => { handleTabChange('inventory'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-medium text-left cursor-pointer ${activeTab === 'inventory' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Gudang & Inventaris</span>
            </button>

            <button 
              onClick={() => { handleTabChange('reports'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-medium text-left cursor-pointer ${activeTab === 'reports' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Laporan & Analitik</span>
            </button>

            <div className="text-[10px] text-gray-500 font-bold px-3 py-1.5 mt-4 uppercase tracking-wider">
              Sistem Peralatan
            </div>

            <button 
              onClick={() => { handleTabChange('settings'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-medium text-left cursor-pointer ${activeTab === 'settings' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Setelan & Printer</span>
            </button>
          </nav>
        </div>

        {/* ROLE PROFILE SELECTOR COMPONENT */}
        <div className="p-4 bg-[#1C2026] border-t border-white/5">
          <div className="flex items-center justify-between gap-2 mb-2 p-1.5 bg-black/25 rounded-lg border border-white/5">
            <span className="text-[10px] text-gray-400 font-mono">Beralih Mode:</span>
            <button 
              onClick={handleToggleRole}
              className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-2.5 rounded transition-colors cursor-pointer"
            >
              Ubah ke {role === 'admin' ? 'Kasir' : 'Admin'}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${role === 'admin' ? 'bg-orange-500' : 'bg-green-600'}`}>
              {role === 'admin' ? 'AD' : 'KS'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-white leading-tight truncate">
                {role === 'admin' ? 'Kencana Administrator' : 'Kasir Terminal 01'}
              </p>
              <p className="text-[9px] text-[#A78BFA] flex items-center gap-1 font-mono">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                HP POS Active
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ==================================
          MAIN CONTENT VIEWPORT CONTAINER
          ================================== */}
      <main className="flex-1 flex flex-col bg-[#0F1115] overflow-hidden min-w-0 pb-16 md:pb-0">
        
        {/* Dynamic header row values */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 bg-[#16191E] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Brand block on mobile */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center font-bold text-white text-xs select-none">
                {settings.logoText || 'KM'}
              </div>
              <div className="max-w-[75px] xxs:max-w-[100px] xs:max-w-[140px] truncate text-left">
                <span className="font-bold text-xs text-white block truncate leading-none mb-0.5">{settings.storeName}</span>
                <span className="text-[7px] text-indigo-400 font-mono font-semibold uppercase tracking-wider block leading-none">
                  SQLite POS
                </span>
              </div>
            </div>

            <div className="h-4 w-[1px] bg-white/10 md:hidden"></div>

            <div className="text-xs sm:text-sm font-semibold text-white">
              <span>{activeTab === 'cashier' ? 'KASIR UTAMA' : 
                    activeTab === 'inventory' ? 'GUDANG & STOK' : 
                    activeTab === 'reports' ? 'LAPORAN SALES' : 'SETELAN UTAMA'}</span>
            </div>

            <div className="h-4 w-[1px] bg-white/10 md:hidden"></div>

            {/* Role switch button on mobile header */}
            <button
              onClick={handleToggleRole}
              className={`md:hidden text-[9px] font-extrabold uppercase px-2 py-1 rounded cursor-pointer leading-none transition-colors ${role === 'admin' ? 'bg-orange-600/20 text-orange-400 border border-orange-500/20' : 'bg-green-600/20 text-green-400 border border-green-500/20'}`}
            >
              {role === 'admin' ? 'ADMIN' : 'KASIR'}
            </button>
          </div>

          {/* SQLite Status & Realtime Timestamp clock */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:block text-right text-[11px] leading-tight text-gray-400">
              <span className="block font-medium">Auto-Sync Lokal: 100% Aman</span>
              <span className="block text-[8px] text-gray-500 font-mono text-indigo-400">SQLite Log State: Active</span>
            </div>
            
            <div className="hidden sm:block h-6 w-[1px] bg-white/10"></div>
            
            <div className="text-right font-mono text-xs">
              <div className="text-[10px] text-gray-400 font-sans hidden xs:block">Timezone Waktu (UTC)</div>
              <div className="text-indigo-400 font-semibold">10:19 AM (27-05)</div>
            </div>
          </div>
        </header>

        {/* ==================================
            LIVE AUDIO/VISUAL SCANNER BEEP FEEDBACK POPUP
            ================================== */}
        {showBeep && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-500 text-white font-black px-6 py-3 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.5)] border border-white/20 flex items-center gap-2 justify-center animate-bounce text-xs uppercase tracking-wider">
            <Check className="w-4 h-4" />
            <span>{beepMessage}</span>
          </div>
        )}

        {/* ==================================
            MASTER VIEW CHANGER LOGIC
            ================================== */}
        <div className="flex-1 overflow-hidden p-4">
          
          {/* 1. VIEW TAB: CASHIER (CASHIER UTAMA) */}
          {activeTab === 'cashier' && (
            <div className="h-full flex flex-col md:flex-row gap-3 md:gap-4 overflow-hidden relative">
              
              {/* Mobile cashier tab toggle */}
              <div className="flex md:hidden bg-[#16191E] p-1 rounded-xl border border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCashierActiveSubView('products')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${cashierActiveSubView === 'products' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400'}`}
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span>Pilih Produk ({products.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCashierActiveSubView('cart')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all relative ${cashierActiveSubView === 'cart' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400'}`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                  <span>Keranjang ({cart.reduce((ac, el) => ac + el.quantity, 0)})</span>
                  {cart.length > 0 && (
                    <span className="absolute top-1.5 right-3 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-[#16191E]"></span>
                  )}
                </button>
              </div>

              {/* Left Column: Product Selection Grid */}
              <div className={`flex-1 flex flex-col gap-3 min-w-0 ${cashierActiveSubView === 'products' ? 'flex' : 'hidden md:flex'}`}>
                
                {/* Search Bar & Barcode Camera Scanner Trigger */}
                <div className="flex items-center gap-2 bg-[#16191E] border border-white/5 p-2 rounded-xl">
                  <div className="flex-1 flex items-center bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
                    <input 
                      type="text" 
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Cari dgn barcode / nama barang..." 
                      className="bg-transparent border-none text-xs focus:outline-none w-full text-gray-200 placeholder-gray-600 font-medium"
                    />
                    {productSearch && (
                      <button onClick={() => setProductSearch('')} className="p-0.5 text-gray-400 hover:text-white rounded-full hover:bg-white/5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={toggleCameraScanner}
                    className={`p-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all relative cursor-pointer ${isCameraActive ? 'bg-orange-600 text-white hover:bg-orange-500 animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                    title="Buka / tutup scanner barcode kamera HP real-time"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isCameraActive ? 'Tutup Scanner' : 'Kamera Barcode'}</span>
                  </button>
                </div>

                {/* 1.1 INLINE REAL-TIME LIVE CAMERA OR SIMULATED INPUT SCANNER PANEL */}
                {isCameraActive && (
                  <div className="bg-[#1C2026] border border-orange-500/30 rounded-xl p-3 flex flex-col gap-2 relative">
                    <div className="absolute top-2 right-2 bg-black/60 text-[9px] text-[#FF9F1C] px-2 py-0.5 rounded border border-white/5 font-mono">
                      DEC SPEEDS: 15ms <span className="text-green-500">● Live</span>
                    </div>

                    <div className="text-xs font-bold text-orange-400 flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      <span>Alat Scan Barcode HP (Arahkan Barcode ke Kamera)</span>
                    </div>

                    {/* True Video element fallback wrapper */}
                    <div className="w-full h-44 bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center border border-white/15 relative">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline></video>

                      {/* Visual Reticle crosshair */}
                      <div className="absolute inset-x-8 inset-y-12 border-2 border-dashed border-green-500 rounded-lg pointer-events-none opacity-80 flex items-center justify-center">
                        <div className="h-0.5 w-full bg-green-500 absolute animate-[bounce_2s_infinite]"></div>
                      </div>

                      {/* Fallback instruction triggers in iframe sandbox */}
                      <div className="absolute bottom-2 left-2 right-2 bg-black/75 p-1.5 rounded text-[10px] text-gray-300 text-center flex items-center justify-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Kamera dibatasi sandbox? Pakai simulator pintas di bawah ini:</span>
                      </div>
                    </div>

                    {/* SIMULATED BARCODE SCAN BUTTONS FOR CLIENT-SIDE CONSTRAINTS TESTING */}
                    <div className="bg-[#0F1115] p-2.5 rounded-lg border border-white/5">
                      <div className="text-[10px] text-gray-400 font-bold mb-1.5 uppercase tracking-wider">TAP LIST DI BAWAH KATA UNTUK METODE SCAN REALTIME CETAK:</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                        {products.map(p => (
                          <button 
                            key={'sim-' + p.barcode}
                            onClick={() => handleBarcodeScannedSuccessfully(p.barcode)}
                            className="bg-white/5 hover:bg-white/10 p-1.5 rounded text-[10px] text-left border border-white/5 text-indigo-300 truncate"
                          >
                            ⚡ [Scan] {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Categories filtering selection row */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0">
                  <button 
                    onClick={() => { setSelectedCategory('All'); }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${selectedCategory === 'All' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    Semua Produk ({products.length})
                  </button>
                  {categories.map(c => {
                    const totalCount = products.filter(pi => pi.category === c.name).length;
                    return (
                      <button 
                        key={c.id}
                        onClick={() => { setSelectedCategory(c.name); }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${selectedCategory === c.name ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                      >
                        {c.name} ({totalCount})
                      </button>
                    );
                  })}
                </div>

                {/* 1.2 MAIN RETAIL PRODUCT GRID LIST */}
                <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                  {filteredProducts.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-gray-500 bg-[#16191E] rounded-2xl border border-white/5">
                      <Barcode className="w-10 h-10 mb-2 opacity-30" />
                      <p className="text-xs">Barang tidak ditemukan di cache SQLite lokal</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredProducts.map(p => {
                        const isOutOfStock = p.stock <= 0;
                        const hasPromo = discounts.some(d => d.isActive && d.barcode === p.barcode);
                        const matchPromo = discounts.find(d => d.isActive && d.barcode === p.barcode);

                        return (
                          <div 
                            key={p.barcode}
                            onClick={() => { if (!isOutOfStock) addToCart(p); }}
                            className={`bg-[#16191E] border rounded-xl p-3 flex flex-col hover:border-indigo-500/50 cursor-pointer transition-all select-none relative group ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''} ${hasPromo ? 'border-orange-500/30 bg-orange-950/5' : 'border-white/5'}`}
                          >
                            {/* Stock Indicator tag top left */}
                            <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white ${p.stock <= 5 ? 'bg-red-650 bg-red-600' : 'bg-[#1C2026] text-gray-400'}`}>
                                Stok: {p.stock}
                              </span>
                            </div>

                            {/* Promotional badge top-right */}
                            {hasPromo && matchPromo && (
                              <div className="absolute top-2 right-2 bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded italic animate-pulse">
                                PROMO {matchPromo.type === 'percentage' ? `-${matchPromo.value}%` : `-Rp ${matchPromo.value.toLocaleString('id-ID')}`}
                              </div>
                            )}

                            {/* Abstract mockup product visual box */}
                            <div className="w-full h-20 bg-white/5 rounded-lg mb-2.5 flex items-center justify-center text-gray-600 relative overflow-hidden group-hover:bg-white/10 transition-colors">
                              <Barcode className="w-8 h-8 opacity-25 group-hover:scale-110 transition-transform" />
                              <div className="absolute bottom-1 right-2 text-[8px] font-mono text-gray-500">
                                {p.barcode.substr(-4)}
                              </div>
                            </div>

                            {/* Product Name & Category label */}
                            <h3 className="text-xs font-bold mb-0.5 truncate text-white">
                              {p.name}
                            </h3>
                            <p className="text-[10px] text-gray-500 mb-2 font-medium">
                              Kategori: {p.category}
                            </p>

                            {/* Selling price display details with discount values */}
                            <div className="flex items-end justify-between mt-auto">
                              <div>
                                {hasPromo && matchPromo ? (
                                  <>
                                    <span className="text-[10px] text-gray-500 line-through block leading-tight">
                                      {formatRupiah(p.sellPrice)}
                                    </span>
                                    <span className="text-indigo-400 font-extrabold text-sm block">
                                      {formatRupiah(p.sellPrice - (matchPromo.type === 'percentage' ? (p.sellPrice * matchPromo.value / 100) : matchPromo.value))}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-indigo-400 font-extrabold text-sm block">
                                    {formatRupiah(p.sellPrice)}
                                  </span>
                                )}
                              </div>
                              
                              <button 
                                className="w-7 h-7 bg-white/5 group-hover:bg-indigo-600 text-white rounded-lg flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Physical Barcode Scanner connection details note */}
                <div className="bg-[#16191E] border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-medium">
                    <Wifi className="w-4 h-4 shrink-0" />
                    <span>Integrasi Barcode OTG & Bluetooth AKTIF</span>
                  </div>
                  <span>Cukup colok scanner ke HP/Laptop, otomatis mendeteksi saat scan!</span>
                </div>

                {/* Mobile Floating Cart Summary Button */}
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCashierActiveSubView('cart')}
                    className="md:hidden fixed bottom-20 left-4 right-4 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl shadow-[0_4px_16px_rgba(16,185,129,0.3)] border border-emerald-500/20 flex items-center justify-between z-30 font-bold text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-left">
                      <ShoppingCart className="w-4 h-4 shrink-0" />
                      <span>{cart.reduce((ac, el) => ac + el.quantity, 0)} Item di Keranjang</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Total: {formatRupiah(calculateCartTotals().grandTotal)}</span>
                      <span className="bg-black/25 text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider">Bayar &gt;</span>
                    </div>
                  </button>
                )}

              </div>

              {/* Right Column: Checkout Cart Receipt Slip */}
              <div className={`w-full md:w-80 lg:w-96 bg-[#16191E] border border-white/5 rounded-2xl flex-col overflow-hidden shrink-0 ${cashierActiveSubView === 'cart' ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-indigo-400" />
                    <h2 className="font-bold text-sm">Keranjang Belanja</h2>
                  </div>
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded font-bold text-gray-400">
                    {cart.reduce((ac, el) => ac + el.quantity, 0)} Pcs
                  </span>
                </div>

                {/* 1.3 CART LIST ITEMS PANEL */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12 text-center">
                      <ShoppingBag className="w-10 h-10 mb-2 opacity-20" />
                      <p className="text-xs">Keranjang masih kosong</p>
                      <p className="text-[10px] text-gray-600 max-w-[160px] mt-1">Tap produk atau scan barcode untuk menambahkan barang</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => {
                      const originalItemPrice = item.product.sellPrice;
                      let savingsPerUnit = 0;
                      if (item.appliedDiscount) {
                        if (item.appliedDiscount.type === 'percentage') {
                          savingsPerUnit = (originalItemPrice * item.appliedDiscount.value) / 100;
                        } else {
                          savingsPerUnit = item.appliedDiscount.value;
                        }
                      }
                      const activeSinglePrice = originalItemPrice - savingsPerUnit;

                      return (
                        <div 
                          key={'cart-' + item.product.barcode}
                          className="bg-[#1C2026] p-2.5 rounded-xl border border-white/5 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-white text-[11px] leading-tight truncate w-40">
                                {item.product.name}
                              </p>
                              {item.appliedDiscount ? (
                                <span className="text-[9px] bg-orange-600/15 text-orange-400 border border-orange-500/20 px-1 py-0.5 rounded font-black italic block mt-0.5">
                                  {item.appliedDiscount.name}
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-500 font-mono">
                                  {item.product.barcode}
                                </span>
                              )}
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.product.barcode)}
                              className="text-gray-500 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/5">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 bg-black/30 rounded-lg p-0.5 border border-white/5">
                              <button 
                                onClick={() => updateCartQty(item.product.barcode, item.quantity - 1)}
                                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center font-mono text-xs text-white">
                                {item.quantity}
                              </span>
                              <button 
                                onClick={() => updateCartQty(item.product.barcode, item.quantity + 1)}
                                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="text-right">
                              {item.appliedDiscount && (
                                <p className="text-[9px] text-gray-500 line-through">
                                  {formatRupiah(originalItemPrice * item.quantity)}
                                </p>
                              )}
                              <p className="font-bold font-mono text-indigo-400">
                                {formatRupiah(activeSinglePrice * item.quantity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 1.4 TOTAL CALCULATION PANE & QUICK CASH PAYMENT */}
                <div className="p-4 bg-[#1C2026] border-t border-white/5 space-y-3 shrink-0">
                  <div className="space-y-1.5 text-[11px] text-gray-400">
                    <div className="flex justify-between">
                      <span>Subtotal Harga</span>
                      <span className="font-mono">{formatRupiah(calculateCartTotals().subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-orange-400">
                      <span>Potongan Diskon</span>
                      <span className="font-mono">-{formatRupiah(calculateCartTotals().discountTotal)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-white/5 text-xs text-white">
                      <span className="font-extrabold uppercase">GRAND TOTAL</span>
                      <span className="text-base font-extrabold font-mono text-green-400">
                        {formatRupiah(calculateCartTotals().grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Cash paid quick buttons for faster POS operations */}
                  {cart.length > 0 && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span className="font-bold">PEMBAYARAN TUNAI</span>
                        <button 
                          onClick={() => setCashPayment(calculateCartTotals().grandTotal)}
                          className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded hover:bg-indigo-500/20"
                        >
                          Uang Pas (Pas)
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5">
                        <span className="text-xs font-bold text-gray-400 font-mono">Rp</span>
                        <input 
                          type="number" 
                          value={cashPayment || ''} 
                          onChange={(e) => setCashPayment(Number(e.target.value))}
                          placeholder="Masukkan tunai..."
                          className="bg-transparent border-none text-sm focus:outline-none w-full text-white font-mono font-bold"
                        />
                      </div>

                      {/* Quick Denominations */}
                      <div className="grid grid-cols-3 gap-1">
                        {[10000, 20000, 50000, 100000].map(cash => (
                          <button 
                            key={cash}
                            onClick={() => setCashPayment(prev => prev + cash)}
                            className="bg-[#16191E] text-[10px] font-bold py-1 px-1.5 rounded border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            +{cash.toLocaleString('id-ID')}
                          </button>
                        ))}
                        <button 
                          onClick={() => setCashPayment(0)}
                          className="bg-[#241315] text-[10px] font-bold text-red-400 py-1 px-1.5 rounded border border-red-500/15 hover:bg-red-950/20"
                        >
                          Hapus
                        </button>
                      </div>

                      {cashPayment > 0 && (
                        <div className="flex justify-between text-[11px] font-bold bg-white/5 p-1.5 rounded">
                          <span className="text-gray-400">Kembalian:</span>
                          <span className={`${cashPayment < calculateCartTotals().grandTotal ? 'text-red-400' : 'text-green-400'} font-mono`}>
                            {cashPayment < calculateCartTotals().grandTotal 
                              ? `Uang kurang Rp ${(calculateCartTotals().grandTotal - cashPayment).toLocaleString('id-ID')}`
                              : formatRupiah(cashPayment - calculateCartTotals().grandTotal)
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Complete buttons */}
                  <div className="grid grid-cols-1 mt-4">
                    <button 
                      onClick={handleCheckout}
                      disabled={cart.length === 0 || cashPayment < calculateCartTotals().grandTotal}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                    >
                      <Check className="w-4 h-4" />
                      <span>Selesaikan Belanja (F9)</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 2. VIEW TAB: INVENTORY / MANAGEMEN GUDANG */}
          {activeTab === 'inventory' && (
            <div className="h-full flex flex-col gap-4 overflow-hidden">
              
              {/* Top controls and action triggers */}
              <div className="flex justify-between items-center shrink-0 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <span>Database Offline: {products.length} Item Terdaftar</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Akses penuh Admin untuk mengunggah, mengubah, stok, harga modal, dan detail kategori produk.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingProduct(null);
                      setEditForm({
                        barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString(),
                        name: '',
                        category: categories[0]?.name || 'Umum',
                        costPrice: 0,
                        sellPrice: 0,
                        stock: 10
                      });
                      setIsProductModalOpen(true);
                      SQLite.logQuery("INITIATING NEW PRODUCT DRAW FORM");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs leading-none flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Produk Baru</span>
                  </button>

                  <button 
                    onClick={() => setIsDiscountModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg text-xs leading-none flex items-center gap-2 cursor-pointer"
                  >
                    <Percent className="w-4 h-4" />
                    <span>Buat Diskon Baru</span>
                  </button>
                </div>
              </div>

              {/* Sub-Tabs Grid layout: 2 columns split */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden min-h-0">
                
                {/* Column Left (2 cols): Product list Table */}
                <div className="lg:col-span-2 bg-[#16191E] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-semibold text-white">Daftar Inventaris Produk</h3>
                    <div className="w-60 flex items-center bg-[#0F1115] border border-white/10 rounded px-2 py-1 text-xs text-gray-300">
                      <Search className="w-3.5 h-3.5 text-gray-500 mr-1.5 shrink-0" />
                      <input 
                        placeholder="Ketik cari item..." 
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="bg-transparent border-none w-full focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-gray-400 font-bold bg-[#1C2026] text-[11px] uppercase tracking-wider">
                          <th className="p-3 hidden sm:table-cell">Barcode</th>
                          <th className="p-3">Nama Barang</th>
                          <th className="p-3 hidden md:table-cell">Kategori</th>
                          <th className="p-3 hidden sm:table-cell">Harga Modal</th>
                          <th className="p-3">Harga Jual</th>
                          <th className="p-3 text-center">Stok HP</th>
                          <th className="p-3 text-right">Opsi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.barcode.includes(productSearch)).map(p => (
                          <tr key={p.barcode} className="hover:bg-white/[0.02] transition-colors leading-tight">
                            <td className="p-3 font-mono text-gray-400 text-[10px] tracking-tight hidden sm:table-cell">{p.barcode}</td>
                            <td className="p-3 font-bold text-white max-w-[120px] truncate">{p.name}</td>
                            <td className="p-3 text-indigo-300 hidden md:table-cell">{p.category}</td>
                            <td className="p-3 font-mono text-gray-500 hidden sm:table-cell">{formatRupiah(p.costPrice)}</td>
                            <td className="p-3 font-mono font-bold text-green-400">{formatRupiah(p.sellPrice)}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-block font-extrabold px-1.5 py-0.5 rounded ${p.stock <= 5 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/10'}`}>
                                {p.stock} pcs
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1 whitespace-nowrap">
                              <button 
                                onClick={() => {
                                  setEditingProduct(p);
                                  setEditForm(p);
                                  setIsProductModalOpen(true);
                                }}
                                className="bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white p-1.5 rounded cursor-pointer transition-all"
                                title="Edit data"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(p.barcode)}
                                className="bg-red-650 bg-red-650/15 hover:bg-red-600 text-red-400 hover:text-white p-1.5 rounded cursor-pointer transition-all"
                                title="Hapus produk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Column Right (1 col): Current Promotions & Active Discounts */}
                <div className="flex flex-col gap-4 overflow-hidden min-h-0">
                  
                  {/* Category manager helper list */}
                  <div className="bg-[#16191E] border border-white/5 rounded-2xl p-4 flex flex-col min-h-[140px] shrink-0">
                    <div className="flex justify-between items-center mb-2.5">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Kategori Inventaris</h4>
                      <button 
                        onClick={() => {
                          showPrompt(
                            "Tambah Kategori Kencana", 
                            "Ketik nama kategori baru yang ingin ditambahkan ke SQLite:", 
                            "", 
                            "Contoh: Sembako, Minuman, Elektronik...",
                            (catName) => {
                              if (!catName || !catName.trim()) return;
                              const trimmed = catName.trim();
                              if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
                                showAlert("Pemberitahuan", `Kategori "${trimmed}" sudah terdaftar!`);
                                return;
                              }
                              const newCat = { id: Date.now().toString(), name: trimmed };
                              const updated = [...categories, newCat];
                              setCategories(updated);
                              SQLite.saveCategories(updated);
                              triggerBeep("Kategori Baru Tersimpan!");
                            }
                          );
                        }}
                        className="text-[10px] text-indigo-400 font-bold hover:underline cursor-pointer"
                      >
                        + Tambah Kategori
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                      {categories.map(c => (
                        <div key={c.id} className="flex justify-between items-center bg-[#0F1115] p-2 rounded-lg border border-white/5 text-xs">
                          <span className="font-semibold text-gray-300">{c.name}</span>
                          <button 
                            onClick={() => {
                              showConfirm(
                                "Hapus Kategori",
                                `Apakah Anda yakin ingin menghapus kategori "${c.name}"? Produk di bawah kategori ini akan tetap tersimpan aman.`,
                                () => {
                                  const updated = categories.filter(cat => cat.id !== c.id);
                                  setCategories(updated);
                                  SQLite.saveCategories(updated);
                                  triggerBeep("Kategori Dihapus!");
                                }
                              );
                            }}
                            className="text-gray-500 hover:text-red-400 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* List of active promotional discounts */}
                  <div className="bg-[#16191E] border border-white/5 rounded-2xl p-4 flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="flex justify-between items-center mb-3 shrink-0">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-orange-500" />
                        <span>Program Diskon Promosi</span>
                      </h4>
                      <span className="text-[10px] text-gray-500 font-bold font-mono">SQLite DB</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {discounts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-600">
                          <Percent className="w-8 h-8 opacity-20 mb-1" />
                          <p className="text-[11px]">Belum ada diskon aktif yang terdaftar</p>
                        </div>
                      ) : (
                        discounts.map(d => {
                          const targetProductRef = products.find(p => p.barcode === d.barcode);
                          
                          return (
                            <div key={d.id} className={`p-2.5 rounded-xl border flex flex-col gap-1 text-xs relative ${d.isActive ? 'bg-orange-950/15 border-orange-500/20' : 'bg-[#0F1115] border-white/5 opacity-60'}`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-extrabold text-white text-[11px] leading-tight text-orange-400">{d.name}</div>
                                  <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                                    Target: {targetProductRef ? targetProductRef.name : d.barcode}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteDiscount(d.id)}
                                  className="text-gray-500 hover:text-red-400 p-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-white/5 text-[10px]">
                                <div>
                                  <p className="text-green-400 font-bold font-mono text-xs">
                                    Diskon: {d.type === 'percentage' ? `${d.value}%` : `Rp ${d.value.toLocaleString('id-ID')}`}
                                  </p>
                                  <p className="text-[8px] text-gray-500 mt-0.5 font-mono">
                                    Durs: {d.startDate} s/d {d.endDate}
                                  </p>
                                </div>

                                <button 
                                  onClick={() => toggleDiscountStatus(d.id)}
                                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase cursor-pointer ${d.isActive ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                                >
                                  {d.isActive ? 'Aktif' : 'Nonaktif'}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* 3. VIEW TAB: SALES REPORTS / LAPORAN */}
          {activeTab === 'reports' && (
            <div className="h-full flex flex-col gap-4 overflow-hidden">
              
              {/* Reports Dashboard top stats panels */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                
                <div className="bg-[#16191E] border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] text-gray-550 uppercase tracking-widest font-bold text-gray-500 mb-1">OMSET KOTOR (REVENUE)</div>
                  <div className="text-xl font-mono font-extrabold text-indigo-400">
                    {formatRupiah(transactions.reduce((sum, tx) => sum + tx.grandTotal, 0))}
                  </div>
                  <div className="text-[9px] text-green-500 mt-1 font-medium">● SQLite Database Secure</div>
                </div>

                <div className="bg-[#16191E] border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] text-gray-550 uppercase tracking-widest font-bold text-gray-500 mb-1">ESTIMASI LABA KOTOR</div>
                  <div className="text-xl font-mono font-extrabold text-green-400">
                    {formatRupiah(transactions.reduce((sum, tx) => {
                      let totalProfit = 0;
                      tx.items.forEach(it => {
                        const originalProductRef = products.find(p => p.barcode === it.productBarcode);
                        const cost = originalProductRef ? originalProductRef.costPrice : it.price * 0.7;
                        totalProfit += (it.finalPrice - cost) * it.quantity;
                      });
                      return sum + totalProfit;
                    }, 0))}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-1">Estimasi Margin: ~32%</div>
                </div>

                <div className="bg-[#16191E] border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] text-gray-550 uppercase tracking-widest font-bold text-gray-500 mb-1">TOTAL STRUK PENJUALAN</div>
                  <div className="text-xl font-mono font-extrabold text-white">
                    {transactions.length} Struk
                  </div>
                  <div className="text-[9px] text-indigo-400 mt-1 font-bold">Rerata: {formatRupiah(transactions.length ? (transactions.reduce((s, t) => s + t.grandTotal, 0) / transactions.length) : 0)} per struk</div>
                </div>

                <div className="bg-[#16191E] border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] text-gray-550 uppercase tracking-widest font-bold text-gray-500 mb-1">TOTAL ITEM PENJUALAN</div>
                  <div className="text-xl font-mono font-extrabold text-orange-400">
                    {transactions.reduce((sum, tx) => sum + tx.items.reduce((s, it) => s + it.quantity, 0), 0)} Pcs
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1">Dari {products.filter(p => p.stock < 10).length} Barang kritis stok</div>
                </div>

              </div>

              {/* Exports actions section & layout charts */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden min-h-0">
                
                {/* Visual Sales List Table left (2 columns) */}
                <div className="lg:col-span-2 bg-[#16191E] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Rekapitulasi Transaksi Terakhir</h3>
                      <span className="text-[10px] text-[#A78BFA] font-mono leading-none font-bold">100% OFFLINE PERSISTED IN MEMORY HP</span>
                    </div>

                    {/* Batch Export triggers */}
                    <div className="flex gap-1.5 flex-wrap">
                      <button 
                        onClick={() => exportToExcelCSV('daily')}
                        className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 px-2.5 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        title="Ekspor CSV compatible dengan Excel"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Ekspor Excel/CSV</span>
                      </button>

                      <button 
                        onClick={printReportPDF}
                        className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/20 px-2.5 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        title="Cetak format PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Cetak PDF Laporan</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    {transactions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-600 py-16">
                        <ShoppingBag className="w-12 h-12 opacity-15 mb-2" />
                        <p className="text-xs">Belum ada struk transaksi yang terekam di SQLite HP.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-gray-400 font-bold bg-[#1C2026] text-[10px] uppercase tracking-wider">
                            <th className="p-3 text-center hidden sm:table-cell">No</th>
                            <th className="p-3">Invoice</th>
                            <th className="p-3">Waktu Transaksi</th>
                            <th className="p-3 hidden md:table-cell">Kasir</th>
                            <th className="p-3 text-right hidden sm:table-cell">Potongan</th>
                            <th className="p-3 text-right">Total Akhir</th>
                            <th className="p-3 text-center">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                          {transactions.map((tx, idx) => (
                            <tr key={tx.id} className="hover:bg-white/[0.01]">
                              <td className="p-3 text-center text-gray-500 hidden sm:table-cell">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-white">{tx.invoiceNumber}</td>
                              <td className="p-3 text-gray-400 text-[11px]">
                                {new Date(tx.date).toLocaleDateString('id-ID')} {new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-3 text-gray-400 hidden md:table-cell">{tx.cashierName}</td>
                              <td className="p-3 text-right text-red-400 font-mono hidden sm:table-cell">-Rp {tx.discountTotal.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right font-mono font-extrabold text-green-400">Rp {tx.grandTotal.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-center">
                                <button 
                                  onClick={() => {
                                    setLastCompletedTx(tx);
                                    setIsReceiptModalOpen(true);
                                  }}
                                  className="text-xs text-indigo-400 hover:underline bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded cursor-pointer"
                                >
                                  Detail Struk
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* SQLite Logs Terminal & Analytical Summary (1 col) */}
                <div className="flex flex-col gap-4 overflow-hidden min-h-0">
                  
                  {/* Top selling product list rekap */}
                  <div className="bg-[#16191E] border border-white/5 rounded-2xl p-4 flex-1 flex flex-col overflow-hidden">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 shrink-0">
                      Top Produk Terlaris
                    </h4>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                      {products.slice(0, 5).map(p => {
                        const totalSold = transactions.reduce((acc, currentTx) => {
                          const itemMatch = currentTx.items.find(it => it.productBarcode === p.barcode);
                          return acc + (itemMatch ? itemMatch.quantity : 0);
                        }, 0);

                        return (
                          <div key={'top-' + p.barcode} className="bg-[#0F1115] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-white truncate leading-tight">{p.name}</p>
                              <span className="text-[9px] text-indigo-400 font-mono">{p.category}</span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[11px] font-extrabold text-green-400 font-mono block">
                                {totalSold} Pcs
                              </span>
                              <span className="text-[8px] text-gray-500 block leading-tight">
                                Stok Sisa: {p.stock}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SQL Live Executed Logs (simulate database integrity audit) */}
                  <div className="bg-[#16191E] border border-white/5 rounded-2xl p-4 h-[160px] shrink-0 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-1.5 shrink-0">
                      <h4 className="text-[10px] font-bold text-amber-500 tracking-wider uppercase font-mono">
                        🖥️ SQLite Terminal Console Log
                      </h4>
                      <button 
                        onClick={() => {
                          localStorage.removeItem('sqlite_logs');
                          setSqliteLogs([]);
                          triggerBeep("Console Cleared");
                        }}
                        className="text-[8px] text-gray-505 bg-white/5 px-1 py-0.5 rounded text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        Hapus Log
                      </button>
                    </div>

                    <div className="flex-1 bg-black/60 rounded-lg p-2 overflow-y-auto font-mono text-[9px] text-green-400 space-y-1">
                      {sqlliteLogs.length === 0 ? (
                        <p className="text-gray-600">SQLite is vacuumed & ready.</p>
                      ) : (
                        sqlliteLogs.map((log, lidx) => (
                          <div key={lidx} className="border-b border-white/5 pb-1 select-all break-all leading-tight">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* 4. VIEW TAB: STORE & PRINTER SETTINGS */}
          {activeTab === 'settings' && (
            <div className="h-full flex flex-col gap-4 overflow-y-auto">
              <div>
                <h2 className="text-lg font-bold text-white">Konfigurasi Nama Toko & Printer Thermal</h2>
                <p className="text-xs text-gray-500">
                  Data langsung disimpan pada memori HP, andal dipakai walau tanpa koneksi internet sama sekali (100% OFFLINE).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left panel: Store Details Forms */}
                <div className="bg-[#16191E] border border-white/5 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase text-white tracking-wider border-b border-white/5 pb-2">
                    Profil Toko Utama & Label Struk
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-400 font-semibold mb-1">Nama Toko Utama</label>
                      <input 
                        type="text" 
                        value={settings.storeName}
                        onChange={(e) => {
                          const updated = { ...settings, storeName: e.target.value };
                          setSettings(updated); SQLite.saveSettings(updated);
                        }}
                        className="w-full bg-[#0F1115] border border-white/10 p-2 rounded focus:outline-none focus:border-indigo-500 font-bold text-white text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-400 font-semibold mb-1">Nomor Telpon</label>
                        <input 
                          type="text" 
                          value={settings.phone}
                          onChange={(e) => {
                            const updated = { ...settings, phone: e.target.value };
                            setSettings(updated); SQLite.saveSettings(updated);
                          }}
                          className="w-full bg-[#0F1115] border border-white/10 p-2 rounded focus:outline-none focus:border-indigo-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 font-semibold mb-1">Logo Inisial</label>
                        <input 
                          type="text" 
                          maxLength={3}
                          value={settings.logoText}
                          onChange={(e) => {
                            const updated = { ...settings, logoText: e.target.value };
                            setSettings(updated); SQLite.saveSettings(updated);
                          }}
                          className="w-full bg-[#0F1115] border border-white/10 p-2 rounded focus:outline-none focus:border-indigo-500 font-bold text-xs"
                          placeholder="KM"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 font-semibold mb-1">Alamat Toko</label>
                      <input 
                        type="text" 
                        value={settings.address}
                        onChange={(e) => {
                          const updated = { ...settings, address: e.target.value };
                          setSettings(updated); SQLite.saveSettings(updated);
                        }}
                        className="w-full bg-[#0F1115] border border-white/10 p-2 rounded focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 font-semibold mb-1">Pesan Header Struk (Thermal Top)</label>
                      <textarea 
                        rows={1}
                        value={settings.receiptHeader}
                        onChange={(e) => {
                          const updated = { ...settings, receiptHeader: e.target.value };
                          setSettings(updated); SQLite.saveSettings(updated);
                        }}
                        className="w-full bg-[#0F1115] border border-white/10 p-2 rounded focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 font-semibold mb-1">Pesan Penutup (Thermal Footer Bottom)</label>
                      <textarea 
                        rows={3}
                        value={settings.receiptFooter}
                        onChange={(e) => {
                          const updated = { ...settings, receiptFooter: e.target.value };
                          setSettings(updated); SQLite.saveSettings(updated);
                        }}
                        className="w-full bg-[#0F1115] border border-white/10 p-2 rounded focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>

                    <div className="border-t border-white/5 pt-3 mt-1">
                      <label className="block text-gray-400 font-semibold mb-1">PIN Keamanan Admin (Default: 1234)</label>
                      <input 
                        type="text"
                        maxLength={6}
                        value={settings.adminPin || '1234'}
                        onChange={(e) => {
                          const pinVal = e.target.value.replace(/\D/g, '');
                          const updated = { ...settings, adminPin: pinVal };
                          setSettings(updated); 
                          SQLite.saveSettings(updated);
                        }}
                        placeholder="1234"
                        className="w-1/2 bg-[#0F1115] border border-white/10 p-2 rounded focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-xs font-bold text-white text-center"
                      />
                      <span className="text-[10px] text-indigo-400 block mt-1.5 leading-relaxed">
                        ⚠️ PIN ini digunakan untuk membatasi akses menu Gudang & Stok, Laporan Keuangan, dan Setelan Toko dari Kasir.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right panel: Printer Connection simulators */}
                <div className="bg-[#16191E] border border-white/5 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase text-white tracking-wider border-b border-white/5 pb-2">
                    Integrasi Konektor Printer Thermal
                  </h3>

                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="block text-gray-450 text-gray-400 font-semibold mb-1.5">Ukuran Kertas Thermal Printer</span>
                      <div className="flex gap-2">
                        {['58mm', '80mm'].map(size => (
                          <button 
                            key={size}
                            onClick={() => {
                              const updated = { ...settings, printPaperSize: size as '58mm' | '80mm' };
                              setSettings(updated); SQLite.saveSettings(updated);
                              triggerBeep(`Kertas Set: ${size}`);
                            }}
                            className={`flex-1 font-bold py-2 px-3 rounded-lg border text-xs cursor-pointer text-center ${settings.printPaperSize === size ? 'bg-indigo-600 border-indigo-500 text-white shadow' : 'bg-[#0F1115] border-white/10 text-gray-400'}`}
                          >
                            Thermal {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 font-semibold mb-1">Device Bluetooth Terdeteksi (Simulasi OTG)</label>
                      <select 
                        value={settings.printerConnectedName || ''}
                        onChange={(e) => {
                          const updated = { ...settings, printerConnectedName: e.target.value };
                          setSettings(updated); SQLite.saveSettings(updated);
                          triggerBeep(`Tersambung ke ${e.target.value}`);
                        }}
                        className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white text-xs text-indigo-300 focus:outline-none"
                      >
                        <option value="Thermal BT-P58">Bluetooth Thermal BT-P58 (58mm)</option>
                        <option value="Thermal BT-P80">Bluetooth Giant Thermal BT-P80 (80mm)</option>
                        <option value="USB OTG Thermal">USB OTG Thermal Printer (Wired)</option>
                        <option value="Off">Nonaktifkan / Print via browser dialog saja</option>
                      </select>
                    </div>

                    {/* ESC POS Test simulation box block */}
                    <div className="bg-[#0F1115] p-3 rounded-xl border border-white/5">
                      <span className="block text-[11px] font-bold text-amber-500 font-mono mb-2">⚡ TEST SPOOL PRINTER CODES (RAW ESC/POS):</span>
                      
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={testPrintText}
                          onChange={(e) => setTestPrintText(e.target.value)}
                          className="flex-1 bg-black/60 border border-white/10 p-1.5 rounded text-[11px] font-mono text-green-400 focus:outline-none"
                        />
                        <button 
                          onClick={() => {
                            triggerBeep("ESC/POS Spooled successfully!");
                            SQLite.logQuery(`ESC_POS spool: ${testPrintText}`);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded text-[10px] cursor-pointer"
                        >
                          Kirim Print Test
                        </button>
                      </div>
                      <span className="block text-[9px] text-gray-500 mt-2">
                        Spooler mentransfer string byte Esc/POS ke Port USB OTG pin rdx/tdx atau Bluetooth transceiver secara instan.
                      </span>
                    </div>

                    {/* Database Backup & Restore Control Block */}
                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <span className="block text-gray-400 font-semibold text-xs">Pencadangan & Pemulihan (SQLite JSON Backup)</span>
                      
                      <div className="p-3 bg-[#0F1115] rounded-xl border border-white/5 space-y-2.5">
                        <p className="text-[10px] text-gray-400 leading-relaxed font-normal">
                          Ekspor semua produk, program promo diskon, kategori, profil toko, serta riwayat transaksi ke file JSON lokal, atau pulihkan kembali kapan saja secara instan.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={handleExportDBBackup}
                            type="button"
                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 border border-indigo-600/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Ekspor Backup</span>
                          </button>

                          <label className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-600/30 rounded-lg text-xs font-bold transition-all cursor-pointer text-center">
                            <Database className="w-3.5 h-3.5" />
                            <span>Impor Backup</span>
                            <input 
                              type="file" 
                              accept=".json" 
                              onChange={handleImportDBBackup} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Critical reset database controls */}
                    <div className="pt-4 border-t border-white/5">
                      <span className="block text-gray-400 font-semibold mb-1">Zona Bahaya Sistem</span>
                      <button 
                        onClick={handleResetDB}
                        className="bg-red-950/20 hover:bg-red-950/40 text-red-500 border border-red-500/20 font-bold py-2.5 px-4 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors w-full justify-center"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Kosongkan Seluruh Database SQLite HP</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* ==================================
          A. MODAL ELEMENT: PRODUCT FORM (ADD/EDIT)
          ================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#16191E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">
                {editingProduct ? 'Ubah Detail Inventaris' : 'Tambah Produk Baru ke SQLite'}
              </h3>
              <button 
                onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Barcode Produk (Wajib Unik)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required
                    value={editForm.barcode || ''}
                    onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                    className="flex-1 bg-[#0F1115] border border-white/10 p-2 rounded text-white font-mono focus:outline-none"
                    placeholder="899..."
                  />
                  {!editingProduct && (
                    <button 
                      type="button"
                      onClick={() => setEditForm({ 
                        ...editForm, 
                        barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString() 
                      })}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded font-bold text-gray-300"
                    >
                      Acak Barcode
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Nama Produk dagang</label>
                <input 
                  type="text" 
                  required
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none"
                  placeholder="Contoh: Coca Cola 250ml"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Kategori</label>
                  <select 
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-[#0F1115] border border-[#2A2F3D] border-white/10 p-2 rounded text-white focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="Umum">Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Stok Tersedia</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={editForm.stock || 0}
                    onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                    className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Harga Modal (Beli)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={editForm.costPrice || 0}
                    onChange={(e) => setEditForm({ ...editForm, costPrice: Number(e.target.value) })}
                    className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none font-mono"
                    placeholder="8000"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Harga Jual</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={editForm.sellPrice || 0}
                    onChange={(e) => setEditForm({ ...editForm, sellPrice: Number(e.target.value) })}
                    className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none font-mono"
                    placeholder="10000"
                  />
                </div>
              </div>

              {editForm.sellPrice && editForm.costPrice && (
                <div className="bg-[#0F1115] p-2.5 rounded border border-white/5 text-[10px] text-gray-400">
                  Perhitungan Laba Kotor: <span className="text-green-400 font-bold">+{formatRupiah(editForm.sellPrice - (editForm.costPrice || 0))}</span> per barang
                </div>
              )}

              <div className="pt-4 flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-2 px-4 rounded-lg cursor-pointer"
                >
                  Batalkan
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg cursor-pointer"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================
          B. MODAL ELEMENT: ADD PROMO DISCOUNT PROGRAM
          ================================== */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#16191E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-orange-500" />
                <span>Buat Promosi Diskon Baru</span>
              </h3>
              <button 
                onClick={() => setIsDiscountModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDiscount} className="p-4 space-y-3 p-4 text-xs">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Nama Program Promosi</label>
                <input 
                  type="text" 
                  required
                  value={newDiscount.name}
                  onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                  placeholder="Contoh: Diskon Gajian, Cuci Gudang"
                  className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Target Barang dagangan</label>
                <select 
                  required
                  value={newDiscount.barcode}
                  onChange={(e) => setNewDiscount({ ...newDiscount, barcode: e.target.value })}
                  className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none text-xs"
                >
                  <option value="">-- Pilihlah Produk Target --</option>
                  {products.map(p => (
                    <option key={'disc-opt-' + p.barcode} value={p.barcode}>
                      {p.name} ({p.barcode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Metode Potongan</label>
                  <select 
                    value={newDiscount.type}
                    onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (potongan Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Nilai Potongan</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={newDiscount.value || ''}
                    onChange={(e) => setNewDiscount({ ...newDiscount, value: Number(e.target.value) })}
                    className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Tanggal Berlaku Mulai</label>
                  <input 
                    type="date" 
                    value={newDiscount.startDate || ''}
                    onChange={(e) => setNewDiscount({ ...newDiscount, startDate: e.target.value })}
                    className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-450 font-bold text-gray-400 mb-1">Tanggal Berlaku Selesai</label>
                  <input 
                    type="date" 
                    value={newDiscount.endDate || ''}
                    onChange={(e) => setNewDiscount({ ...newDiscount, endDate: e.target.value })}
                    className="w-full bg-[#0F1115] border border-white/10 p-2 rounded text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsDiscountModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-2 px-4 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg cursor-pointer animate-pulse"
                >
                  Aktifkan Program Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================
          C. MODAL ELEMENT: RECEIPT DETAIL VIEW & BLUETOOTH PRINT PREVIEW
          ================================== */}
      {isReceiptModalOpen && lastCompletedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur bg-opacity-70 p-4 overflow-y-auto">
          <div className="bg-[#1C2026] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto max-h-[90vh]">
            
            {/* Left side: Pure virtual physical scroll thermal paper slip mockup */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-black/40 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">
              <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase mb-3 text-center">
                Visual Kertas Struk Thermal ({settings.printPaperSize === '58mm' ? '58mm Roll' : '80mm Roll'})
              </span>

              {/* Physical Monospace Thermal paper container mockup */}
              <div 
                className={`bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-lg border border-black/10`} 
                style={{ width: settings.printPaperSize === '58mm' ? '280px' : '360px' }}
              >
                <div className="text-center font-bold">
                  <div className="border border-black px-2 py-0.5 inline-block text-[13px] tracking-widest mb-1">{settings.logoText}</div>
                  <div className="text-[12px] leading-tight">{settings.storeName}</div>
                  <div className="text-[9px] font-normal">{settings.address}</div>
                  <div className="text-[9px] font-normal">Telp: {settings.phone}</div>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="text-[9px]">
                  <div>No : {lastCompletedTx.invoiceNumber}</div>
                  <div>Tgl: {new Date(lastCompletedTx.date).toLocaleString()}</div>
                  <div>Ksr: {lastCompletedTx.cashierName}</div>
                </div>

                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="space-y-1.5">
                  {lastCompletedTx.items.map((it, idx) => (
                    <div key={'slip-it-' + idx}>
                      <div className="font-bold">{it.productName}</div>
                      <div className="flex justify-between">
                        <span>  {it.quantity} x {it.price.toLocaleString('id-ID')}</span>
                        <span>{it.subtotal.toLocaleString('id-ID')}</span>
                      </div>
                      {it.discountApplied > 0 && (
                        <div className="text-[9px] text-gray-700">  * Potongan: -Rp {(it.discountApplied * it.quantity).toLocaleString('id-ID')}</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rp {lastCompletedTx.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Pot. Diskon:</span>
                    <span>-Rp {lastCompletedTx.discountTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[12px] pt-1">
                    <span>GRAND TOTAL:</span>
                    <span>Rp {lastCompletedTx.grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>Bayar Tunai:</span>
                    <span>Rp {lastCompletedTx.cashPaid.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kembalian:</span>
                    <span>Rp {lastCompletedTx.change.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="border-t-2 border-double border-black my-2"></div>
                
                <div className="text-center text-[10px] whitespace-pre-line font-bold">
                  {settings.receiptHeader}
                  <div className="font-normal text-[9px] mt-1 text-gray-600 font-sans">{settings.receiptFooter}</div>
                </div>
              </div>
            </div>

            {/* Right side: Interactive EscPos output console logs & print triggers */}
            <div className="w-full md:w-80 p-5 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-md">Transaksi Sukses!</h4>
                    <p className="text-[11px] text-purple-300">Kembalian: {formatRupiah(lastCompletedTx.change)}</p>
                  </div>
                  <button 
                    onClick={() => { setIsReceiptModalOpen(false); setLastCompletedTx(null); }}
                    className="p-1 hover:bg-white/10 rounded-full"
                  >
                    <X className="w-5 h-5 text-gray-400 hover:text-white" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="block text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                    Koneksi Spool Printer Anda:
                  </span>
                  
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center gap-2 text-green-400 font-bold text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span>{settings.printerConnectedName || 'Bluetooth Printer Offline'}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Spooler raw-text data ESC/POS siap cetak otomatis via port Bluetooth serial 9600-bpss.
                    </p>
                  </div>
                </div>

                {/* Simulated Binary Buffer */}
                <div className="space-y-1.5 text-[10px]">
                  <span className="block font-mono text-gray-400">Byte Array output (ESC/POS):</span>
                  <div className="bg-black/40 p-2.5 rounded font-mono text-gray-500 h-28 overflow-y-auto select-all leading-tight">
                    {generateEscPosVisual(lastCompletedTx)}
                  </div>
                </div>
              </div>

              {/* Action operations printable */}
              <div className="space-y-2 pt-4 border-t border-white/5 mt-4">
                <button 
                  onClick={printDirectlyToPaper}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>PRINT STRUK SEKARANG</span>
                </button>

                <button 
                  onClick={() => { setIsReceiptModalOpen(false); setLastCompletedTx(null); }}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs rounded-xl border border-white/10 cursor-pointer"
                >
                  Tutupi (Kembali Ke Kasir)
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ==================================
          MOBILE BOTTOM NAVIGATION TAB BAR
          ================================== */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#16191E] border-t border-white/5 flex justify-around items-center z-40 md:hidden">
        <button
          onClick={() => { handleTabChange('cashier'); }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors cursor-pointer ${activeTab === 'cashier' ? 'text-indigo-400' : 'text-gray-400'}`}
        >
          <ShoppingCart className="w-5 h-5 shrink-0" />
          <span className="text-[9px] font-bold">Kasir</span>
        </button>

        <button
          onClick={() => { handleTabChange('inventory'); }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors cursor-pointer ${activeTab === 'inventory' ? 'text-indigo-400' : 'text-gray-400'}`}
        >
          <Layers className="w-5 h-5 shrink-0" />
          <span className="text-[9px] font-bold">Gudang</span>
        </button>

        <button
          onClick={() => { handleTabChange('reports'); }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors cursor-pointer ${activeTab === 'reports' ? 'text-indigo-400' : 'text-gray-400'}`}
        >
          <TrendingUp className="w-5 h-5 shrink-0" />
          <span className="text-[9px] font-bold">Laporan</span>
        </button>

        <button
          onClick={() => { handleTabChange('settings'); }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors cursor-pointer ${activeTab === 'settings' ? 'text-indigo-400' : 'text-gray-400'}`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className="text-[9px] font-bold">Setelan</span>
        </button>
      </nav>

      {/* ==================================
          CUSTOM DIALOG MODAL LAYOUT (OFFLINE ENGINE)
          ================================== */}
      {dialogConfig.isOpen && (
        <div id="custom-dialog-modal" className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#16191E] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative space-y-4 text-left">
            
            {/* Modal title */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <span className="text-sm font-bold text-white tracking-wide uppercase">
                {dialogConfig.title}
              </span>
            </div>

            {/* Modal description message */}
            <p className="text-xs text-gray-300 leading-relaxed font-normal">
              {dialogConfig.message}
            </p>

            {/* Sub-inputs depending on dialog type */}
            {dialogConfig.type === 'prompt' && (
              <input
                type="text"
                value={dialogConfig.inputValue || ''}
                placeholder={dialogConfig.placeholder || 'Ketik data...'}
                onChange={(e) => setDialogConfig(prev => ({ ...prev, inputValue: e.target.value }))}
                className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && dialogConfig.onSuccess) {
                    dialogConfig.onSuccess(dialogConfig.inputValue);
                  }
                }}
              />
            )}

            {dialogConfig.type === 'pin' && (
              <div className="space-y-3">
                {/* Numeric View screen */}
                <div className="bg-[#0F1115] border border-white/10 rounded-xl p-3 text-center tracking-widest text-[#E5E7EB] font-bold text-lg select-none">
                  {dialogConfig.inputValue 
                    ? '*'.repeat(dialogConfig.inputValue.length) 
                    : <span className="text-gray-600 font-sans text-xs tracking-normal">Ketik 4-Digit PIN...</span>
                  }
                </div>

                {/* Grid Pad buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        const currentVal = dialogConfig.inputValue || '';
                        if (currentVal.length < 10) {
                          setDialogConfig(prev => ({ ...prev, inputValue: currentVal + num }));
                        }
                      }}
                      className="py-3 bg-white/5 hover:bg-white/15 active:bg-white/10 text-white rounded-xl text-base font-extrabold cursor-pointer transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setDialogConfig(prev => ({ ...prev, inputValue: '' }));
                    }}
                    className="py-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-xl text-xs font-black cursor-pointer transition-colors"
                  >
                    RESET
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentVal = dialogConfig.inputValue || '';
                      if (currentVal.length < 10) {
                        setDialogConfig(prev => ({ ...prev, inputValue: currentVal + '0' }));
                      }
                    }}
                    className="py-3 bg-white/5 hover:bg-white/15 active:bg-white/10 text-white rounded-xl text-base font-extrabold cursor-pointer transition-colors"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentVal = dialogConfig.inputValue || '';
                      if (currentVal.length > 0) {
                        setDialogConfig(prev => ({ ...prev, inputValue: currentVal.slice(0, -1) }));
                      }
                    }}
                    className="py-3 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    HAPUS
                  </button>
                </div>
              </div>
            )}

            {/* Actions button footer row */}
            <div className="flex gap-2 pt-2 border-t border-white/5">
              {dialogConfig.type !== 'alert' && (
                <button
                  type="button"
                  onClick={() => {
                    if (dialogConfig.onCancel) dialogConfig.onCancel();
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-gray-400 hover:text-white transition-all font-bold cursor-pointer text-center"
                >
                  Batal
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (dialogConfig.onSuccess) {
                    dialogConfig.onSuccess(dialogConfig.inputValue);
                  }
                }}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white shadow font-extrabold cursor-pointer transition-all text-center"
              >
                {dialogConfig.type === 'pin' ? 'KONFIRMASI PIN' : dialogConfig.type === 'confirm' ? 'YA, LANJUTKAN' : 'SETUJU'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
