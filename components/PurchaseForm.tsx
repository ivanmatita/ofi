
import React, { useState, useEffect } from 'react';
import { Purchase, PurchaseItem, Product, PurchaseType, WorkLocation, CashRegister, PaymentMethod, Supplier, Warehouse } from '../types';
import { generateId, formatCurrency } from '../utils';
import { Plus, Trash, Save, ArrowLeft, FileText, List, Calculator, CreditCard, Eraser, UserPlus, QrCode, X, Box, Info } from 'lucide-react';

interface PurchaseFormProps {
  onSave: (purchase: Purchase) => void;
  onCancel: () => void;
  products: Product[];
  workLocations?: WorkLocation[];
  cashRegisters?: CashRegister[];
  suppliers: Supplier[];
  onSaveSupplier: (supplier: Supplier) => void;
  warehouses?: Warehouse[]; 
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ onSave, onCancel, products, workLocations = [], cashRegisters = [], suppliers, onSaveSupplier, warehouses = [] }) => {
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(PurchaseType.FT);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [nif, setNif] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [notes, setNotes] = useState('');
  const [hash, setHash] = useState(''); 
  
  const [workLocationId, setWorkLocationId] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses.length > 0 ? warehouses[0].id : ''); 
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [cashRegisterId, setCashRegisterId] = useState('');
  const [retentionType, setRetentionType] = useState<'NONE' | 'CAT_50' | 'CAT_100'>('NONE');
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const [taxRate, setTaxRate] = useState(14);
  const [useAutoCalc, setUseAutoCalc] = useState(true);
  const [manualTaxAmount, setManualTaxAmount] = useState(0);

  const [currency, setCurrency] = useState<'AOA' | 'USD' | 'EUR' | 'BRL'>('AOA');
  const [exchangeRate, setExchangeRate] = useState(1);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSup, setNewSup] = useState<Partial<Supplier>>({ city: 'Luanda', province: 'Luanda' });

  useEffect(() => {
      if (currency === 'AOA') setExchangeRate(1);
      if (currency === 'USD') setExchangeRate(850);
      if (currency === 'EUR') setExchangeRate(920);
      if (currency === 'BRL') setExchangeRate(170);
  }, [currency]);

  useEffect(() => {
      if (supplierId) {
          const s = suppliers.find(sup => sup.id === supplierId);
          if (s) {
              setSupplierName(s.name);
              setNif(s.vatNumber);
          }
      }
  }, [supplierId, suppliers]);

  useEffect(() => {
      if (warehouses.length > 0 && !warehouseId) {
          setWarehouseId(warehouses[0].id);
      }
  }, [warehouses, warehouseId]);

  const calculateLineTotal = (qty: number, price: number, discount: number) => {
      const base = qty * price;
      const discAmount = base * (discount / 100);
      return base - discAmount;
  }

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const globalDiscountAmount = subtotal * (globalDiscount / 100);
  const taxableAmount = subtotal - globalDiscountAmount;
  
  const taxAmount = useAutoCalc ? (taxableAmount * (taxRate / 100)) : manualTaxAmount;
  
  let retentionAmount = 0;
  if (retentionType === 'CAT_50') retentionAmount = taxAmount * 0.5;
  if (retentionType === 'CAT_100') retentionAmount = taxAmount;

  const total = taxableAmount + taxAmount - retentionAmount;

  const handleAddItem = () => {
    setItems([...items, { id: generateId(), description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        unitPrice: product.costPrice,
        total: calculateLineTotal(newItems[index].quantity, product.costPrice, newItems[index].discount || 0)
      };
      setItems(newItems);
    }
  };

  const handleUpdateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;
    item.total = calculateLineTotal(item.quantity, item.unitPrice, item.discount || 0);
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveSupplier = () => {
      if (!newSup.name || !newSup.vatNumber) return alert("Preencha Nome e NIF");
      // Fix: Added missing supplierType property to new supplier object
      const supplier: Supplier = {
          id: generateId(),
          name: newSup.name!,
          vatNumber: newSup.vatNumber!,
          email: newSup.email || '',
          phone: newSup.phone || '',
          address: newSup.address || '',
          city: newSup.city || 'Luanda',
          province: newSup.province || 'Luanda',
          supplierType: newSup.supplierType || 'Nacional',
          accountBalance: 0,
          transactions: []
      };
      onSaveSupplier(supplier);
      setSupplierId(supplier.id);
      setShowSupplierModal(false);
      setNewSup({ city: 'Luanda', province: 'Luanda' });
  }

  const handleScanQR = () => {
      const simulatedScan = "AGTHASH123456789*2024-05-20*150000*500123999*Fornecedor QR Lda*FT QR/2024/99";
      const parts = simulatedScan.split('*');
      if (parts.length >= 6) {
          const [qrHash, qrDate, qrTotal, qrNif, qrSupplier, qrDoc] = parts;
          setTimeout(() => {
              setSupplierName(qrSupplier);
              setNif(qrNif);
              setDocumentNumber(qrDoc);
              setDate(qrDate);
              setHash(qrHash);
              setItems([{
                  id: generateId(),
                  description: 'Mercadoria Diversa (QR Scan Auto)',
                  quantity: 1,
                  unitPrice: Number(qrTotal),
                  discount: 0,
                  total: Number(qrTotal)
              }]);
              alert("Fatura lida com sucesso via Código QR! Dados preenchidos.");
          }, 1000);
      } else {
          alert("QR Code inválido ou formato desconhecido.");
      }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supplierName || items.length === 0 || !documentNumber) {
        alert("Preencha o fornecedor, nº do documento e adicione itens.");
        return;
    }
    const showPaymentFields = purchaseType === PurchaseType.FR || purchaseType === PurchaseType.REC;
    if (showPaymentFields && (!paymentMethod || !cashRegisterId)) {
        alert("Para Fatura/Recibo ou Recibo, selecione a Forma de Pagamento e Caixa.");
        return;
    }

    if (!warehouseId) {
        alert("Selecione o armazém de entrada.");
        return;
    }

    const newPurchase: Purchase = {
      id: generateId(),
      type: purchaseType,
      supplierId: supplierId || undefined,
      supplier: supplierName,
      nif: nif || '999999999',
      date,
      dueDate: dueDate || date,
      documentNumber: documentNumber,
      items,
      subtotal,
      globalDiscount,
      taxAmount,
      total,
      status: (purchaseType === PurchaseType.FR || purchaseType === PurchaseType.REC) ? 'PAID' : 'PENDING',
      notes,
      currency,
      exchangeRate,
      workLocationId: workLocationId || undefined,
      paymentMethod: paymentMethod || undefined,
      cashRegisterId: cashRegisterId || undefined,
      retentionType,
      retentionAmount,
      warehouseId: warehouseId, 
      hash: hash || undefined 
    };
    onSave(newPurchase);
  };

  const showPaymentFields = purchaseType === PurchaseType.FR || purchaseType === PurchaseType.REC;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 relative">
      
      {showSupplierModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center sticky top-0 z-10">
                      <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus size={20}/> Novo Fornecedor</h3>
                      <button onClick={() => setShowSupplierModal(false)} className="hover:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Nome / Empresa <span className="text-red-500">*</span></label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Nome do Fornecedor" value={newSup.name || ''} onChange={e => setNewSup({...newSup, name: e.target.value})} />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">NIF <span className="text-red-500">*</span></label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="NIF" value={newSup.vatNumber || ''} onChange={e => setNewSup({...newSup, vatNumber: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Endereço Completo</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Morada" value={newSup.address || ''} onChange={e => setNewSup({...newSup, address: e.target.value})} />
                      </div>
                  </div>
                  <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10">
                      <button onClick={() => setShowSupplierModal(false)} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-white transition-colors">Cancelar</button>
                      <button onClick={handleSaveSupplier} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">Salvar Fornecedor</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={onCancel} className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
                <ArrowLeft size={16} /> Voltar
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-sm">Entrada de Mercadoria / Despesas</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Registar Compra</h1>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border border-slate-300 transition"
            >
                <List size={18} />
                <span className="hidden sm:inline">Ver Lista de Compras</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileText size={18} className="text-blue-500"/> Dados do Documento
                      </h3>
                      <button onClick={handleScanQR} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded flex items-center gap-2 hover:bg-black transition font-bold shadow-md">
                          <QrCode size={16} /> Ler QR Code
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Documento</label>
                          <select className="w-full border p-2 rounded-lg" value={purchaseType} onChange={e => setPurchaseType(e.target.value as PurchaseType)}>
                              {Object.values(PurchaseType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nº Documento</label>
                          <input className="w-full border p-2 rounded-lg" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="Ex: FT 123/2024" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Fornecedor</label>
                          <div className="flex gap-2">
                              <select className="flex-1 border p-2 rounded-lg" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                                  <option value="">-- Seleccionar --</option>
                                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.vatNumber})</option>)}
                              </select>
                              <button type="button" onClick={() => setShowSupplierModal(true)} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><Plus size={20}/></button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                          <input type="date" className="w-full border p-2 rounded-lg" value={date} onChange={e => setDate(e.target.value)} />
                      </div>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Box size={18} className="text-blue-500"/> Itens da Compra</h3>
                      <button type="button" onClick={handleAddItem} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                          <Plus size={16} /> Adicionar Item
                      </button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                          <thead>
                              <tr className="bg-slate-50 text-slate-500 font-bold border-b">
                                  <th className="p-2 text-left">Produto / Descrição</th>
                                  <th className="p-2 text-center w-20">Qtd</th>
                                  <th className="p-2 text-right w-32">Preço Un.</th>
                                  <th className="p-2 text-right w-32">Total</th>
                                  <th className="p-2 w-10"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {items.map((item, idx) => (
                                  <tr key={item.id}>
                                      <td className="p-2">
                                          <div className="space-y-1">
                                              <select className="w-full border p-1 rounded text-xs" value={item.productId || ''} onChange={e => handleProductSelect(idx, e.target.value)}>
                                                  <option value="">-- Seleccionar Artigo --</option>
                                                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                              </select>
                                              <input className="w-full border-b border-dashed p-1 text-xs outline-none" value={item.description} onChange={e => handleUpdateItem(idx, 'description', e.target.value)} placeholder="Descrição manual..." />
                                          </div>
                                      </td>
                                      <td className="p-2">
                                          <input type="number" className="w-full border p-1 rounded text-center" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))} />
                                      </td>
                                      <td className="p-2">
                                          <input type="number" className="w-full border p-1 rounded text-right" value={item.unitPrice} onChange={e => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))} />
                                      </td>
                                      <td className="p-2 text-right font-bold">{formatCurrency(item.total)}</td>
                                      <td className="p-2 text-center">
                                          <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-300 hover:text-red-500"><Trash size={16}/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          <div className="space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><Calculator size={20}/> Resumo</h3>
                  <div className="space-y-3">
                      <div className="flex justify-between text-sm opacity-70"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between text-sm opacity-70"><span>Imposto (IVA)</span><span>{formatCurrency(taxAmount)}</span></div>
                      <div className="flex justify-between text-2xl font-black pt-4 border-t border-white/10"><span>Total</span><span>{formatCurrency(total)}</span></div>
                  </div>
                  {showPaymentFields && (
                      <div className="mt-6 space-y-4 border-t border-white/10 pt-4">
                          <h4 className="text-xs font-bold uppercase text-slate-400">Dados de Pagamento</h4>
                          <select className="w-full bg-slate-800 border-none rounded-lg p-2 text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                              <option value="">Forma Pagamento...</option>
                              <option value="CASH">Dinheiro</option>
                              <option value="MULTICAIXA">Multicaixa</option>
                          </select>
                          <select className="w-full bg-slate-800 border-none rounded-lg p-2 text-sm" value={cashRegisterId} onChange={e => setCashRegisterId(e.target.value)}>
                              <option value="">Caixa de Saída...</option>
                              {cashRegisters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                  )}
                  <button onClick={() => handleSubmit()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-6 transition shadow-lg flex items-center justify-center gap-2">
                      <Save size={20}/> Gravar Compra
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

// Fix: Added default export
export default PurchaseForm;
