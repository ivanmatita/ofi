
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Client, Invoice, InvoiceItem, InvoiceType, InvoiceStatus, PaymentMethod, CashRegister, DocumentSeries, POSConfig, Company, User } from '../types';
import { formatCurrency, generateId, formatDate, generateQrCodeUrl } from '../utils';
import { Search, ShoppingCart, Trash2, Plus, Minus, User as UserIcon, X, CreditCard, Monitor, CornerUpLeft, Printer, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface POSProps {
  products: Product[];
  clients: Client[];
  invoices: Invoice[];
  series: DocumentSeries[];
  cashRegisters: CashRegister[];
  config: POSConfig;
  onSaveInvoice: (invoice: Invoice, seriesId: string, action?: 'PRINT' | 'CERTIFY') => void;
  onGoBack: () => void;
  currentUser: User;
  company: Company;
}

const POS: React.FC<POSProps> = ({ 
  products, clients, invoices, series, cashRegisters, config, 
  onSaveInvoice, onGoBack, currentUser, company
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(config.defaultSeriesId || '');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(config.defaultPaymentMethod);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (!selectedSeriesId && series.length > 0) {
          const posSeries = series.find(s => s.code.includes('POS') || s.code.includes('VD')) || series[0];
          setSelectedSeriesId(posSeries.id);
      }
      if (!selectedClient && config.defaultClientId) {
          const defClient = clients.find(c => c.id === config.defaultClientId);
          if(defClient) setSelectedClient(defClient);
      }
  }, [series, clients, config]);

  const categories = useMemo(() => {
      const cats = new Set(products.map(p => p.category || 'Geral'));
      return ['ALL', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
      return products.filter(p => {
          const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (p.barcode && p.barcode.includes(searchTerm));
          const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
          return matchSearch && matchCat;
      });
  }, [products, searchTerm, selectedCategory]);

  const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);
  const changeAmount = Math.max(0, receivedAmount - cartTotal);

  const addToCart = (product: Product) => {
      const existing = cart.find(i => i.productId === product.id);
      if (existing) {
          updateQuantity(existing.id, existing.quantity + 1);
      } else {
          const newItem: InvoiceItem = {
              id: generateId(),
              productId: product.id,
              type: 'PRODUCT',
              description: product.name,
              quantity: 1,
              unitPrice: product.price,
              discount: 0,
              taxRate: 14,
              total: product.price,
              rubrica: '61.1'
          };
          setCart([...cart, newItem]);
      }
  };

  const updateQuantity = (itemId: string, newQty: number) => {
      if (newQty <= 0) {
          setCart(cart.filter(item => item.id !== itemId));
          return;
      }
      setCart(cart.map(item => {
          if (item.id === itemId) {
              const total = newQty * item.unitPrice * (1 - item.discount / 100);
              return { ...item, quantity: newQty, total };
          }
          return item;
      }));
  };

  const handleFinalize = () => {
      if (cart.length === 0 || !selectedSeriesId) return;

      const newInvoice: Invoice = {
          id: generateId(),
          type: InvoiceType.FR,
          seriesId: selectedSeriesId,
          number: 'POS-Gen',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(),
          dueDate: new Date().toISOString().split('T')[0],
          accountingDate: new Date().toISOString().split('T')[0],
          clientId: selectedClient?.id || 'CONSUMIDOR_FINAL',
          clientName: selectedClient?.name || 'Consumidor Final',
          clientNif: selectedClient?.vatNumber || '999999999',
          items: cart,
          subtotal: cartTotal / 1.14,
          globalDiscount: 0,
          taxRate: 14,
          taxAmount: cartTotal - (cartTotal / 1.14),
          total: cartTotal,
          paidAmount: cartTotal,
          currency: 'AOA',
          exchangeRate: 1,
          status: InvoiceStatus.PAID,
          isCertified: true,
          companyId: company.id,
          workLocationId: currentUser.workLocationId || '',
          paymentMethod: paymentMethod,
          cashRegisterId: cashRegisters.find(c => c.status === 'OPEN')?.id,
          operatorName: currentUser.name,
          source: 'POS'
      };

      onSaveInvoice(newInvoice, selectedSeriesId, 'CERTIFY');
      setLastInvoice(newInvoice);
      setCart([]);
      setReceivedAmount(0);
      setShowPaymentModal(false);
      setShowReceipt(true);
  };

  const ReceiptView = () => (
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white p-4 rounded-lg shadow-2xl w-full max-w-[400px]">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="font-bold text-slate-800">Recibo POS</h3>
                  <button onClick={() => setShowReceipt(false)} className="text-slate-500"><X/></button>
              </div>
              <div className="bg-white p-2 w-full font-mono text-[10px] text-black" id="receipt-thermal">
                  <div className="text-center mb-2">
                      <p className="font-bold text-sm">{company.name}</p>
                      <p>NIF: {company.nif}</p>
                      <p>{company.address}</p>
                  </div>
                  <div className="border-y border-dashed border-black py-1 mb-2">
                      <p>Doc: {lastInvoice?.type} {lastInvoice?.number}</p>
                      <p>Data: {formatDate(lastInvoice?.date || '')} {lastInvoice?.time}</p>
                      <p>Operador: {lastInvoice?.operatorName}</p>
                  </div>
                  <table className="w-full mb-2">
                      <thead><tr className="border-b border-black">
                          <th className="text-left">Artigo</th>
                          <th className="text-center">Qtd</th>
                          <th className="text-right">Total</th>
                      </tr></thead>
                      <tbody>{lastInvoice?.items.map((it, idx) => (
                          <tr key={idx}>
                              <td>{it.description}</td>
                              <td className="text-center">{it.quantity}</td>
                              <td className="text-right">{formatCurrency(it.total)}</td>
                          </tr>
                      ))}</tbody>
                  </table>
                  <div className="border-t border-black pt-1 font-bold flex justify-between">
                      <span>TOTAL A PAGAR</span>
                      <span>{formatCurrency(lastInvoice?.total || 0)}</span>
                  </div>
                  <div className="mt-4 text-center">
                      <img src={generateQrCodeUrl(lastInvoice?.hash || 'POS')} alt="QR" className="w-20 h-20 mx-auto"/>
                      <p className="text-[8px] mt-2">Certificado por IMATEC SOFTWARE</p>
                  </div>
              </div>
              <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-2 rounded mt-4 font-bold">IMPRIMIR</button>
          </div>
      </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {showReceipt && ReceiptView()}
      <div className="flex-1 flex flex-col border-r border-slate-300">
          <div className="bg-white p-3 border-b flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                  <button onClick={onGoBack} className="p-2 hover:bg-slate-100 rounded text-slate-600"><CornerUpLeft/></button>
                  <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 text-slate-400" size={18}/>
                      <input 
                        ref={searchInputRef}
                        className="w-full pl-9 pr-2 py-2 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Pesquisar artigo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                  {categories.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>{cat === 'ALL' ? 'Todos' : cat}</button>
                  ))}
              </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition group" onClick={() => addToCart(p)}>
                      <div className="h-28 bg-slate-100 flex items-center justify-center text-slate-300">
                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover"/> : <ImageIcon size={32}/>}
                      </div>
                      <div className="p-3">
                          <h3 className="font-bold text-slate-700 text-xs line-clamp-2 h-8">{p.name}</h3>
                          <p className="text-blue-600 font-black text-lg mt-1">{formatCurrency(p.price)}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
      <div className="w-1/3 bg-white flex flex-col shadow-xl">
          <div className="p-4 bg-slate-900 text-white">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-sm uppercase flex items-center gap-2"><Monitor size={18}/> Checkout POS</h2>
                  <span className="text-[10px] font-bold text-yellow-400">{currentUser.name}</span>
              </div>
              <select 
                className="bg-slate-800 w-full p-2 rounded text-xs font-bold outline-none"
                value={selectedClient?.id || ''}
                onChange={e => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
              >
                  <option value="">Consumidor Final</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {cart.map(item => (
                  <div key={item.id} className="bg-slate-50 p-2 rounded border flex justify-between items-center">
                      <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-bold text-slate-700 text-xs truncate">{item.description}</h4>
                          <span className="text-[10px] text-slate-500">{formatCurrency(item.unitPrice)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 bg-white border rounded"><Minus size={12}/></button>
                          <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 bg-white border rounded"><Plus size={12}/></button>
                          <span className="font-bold text-slate-800 w-16 text-right text-xs">{formatCurrency(item.total)}</span>
                      </div>
                  </div>
              ))}
          </div>
          <div className="p-4 border-t bg-slate-50">
              <div className="flex justify-between items-end mb-4">
                  <span className="text-xs font-bold text-slate-500">TOTAL</span>
                  <span className="text-3xl font-black text-slate-900">{formatCurrency(cartTotal)}</span>
              </div>
              <button 
                onClick={() => setShowPaymentModal(true)} 
                disabled={cart.length === 0}
                className="w-full bg-green-600 text-white font-black py-4 rounded-xl text-lg hover:bg-green-700 transition shadow-lg disabled:opacity-50"
              >
                  FINALIZAR PAGAMENTO
              </button>
          </div>
      </div>
      {showPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">Pagamento</h2>
                      <button onClick={() => setShowPaymentModal(false)}><X/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      <button onClick={() => setPaymentMethod('CASH')} className={`p-4 rounded-xl border-2 font-bold ${paymentMethod === 'CASH' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100'}`}>Dinheiro</button>
                      <button onClick={() => setPaymentMethod('MULTICAIXA')} className={`p-4 rounded-xl border-2 font-bold ${paymentMethod === 'MULTICAIXA' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100'}`}>Multicaixa</button>
                  </div>
                  {paymentMethod === 'CASH' && (
                      <div className="space-y-4 mb-6">
                          <input type="number" className="w-full text-2xl font-bold p-3 border rounded text-right" placeholder="Valor Entregue" onChange={e => setReceivedAmount(Number(e.target.value))}/>
                          <div className="flex justify-between font-bold text-lg"><span>Troco:</span><span className="text-green-600">{formatCurrency(changeAmount)}</span></div>
                      </div>
                  )}
                  <button onClick={handleFinalize} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">CONCLUIR VENDA</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default POS;
