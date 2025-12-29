
import React, { useState, useMemo } from 'react';
import { CashRegister, CashClosure as CashClosureType, Invoice, CashMovement } from '../types';
import { formatCurrency, generateId } from '../utils';
import { Wallet, CheckCircle, ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface CashClosureProps {
  registers: CashRegister[];
  invoices: Invoice[];
  movements: CashMovement[];
  onSaveClosure: (closure: CashClosureType) => void;
  onGoBack: () => void;
  currentUser: string;
  currentUserId: string;
}

const CashClosure: React.FC<CashClosureProps> = ({ registers, invoices, movements, onSaveClosure, onGoBack, currentUser, currentUserId }) => {
  const [selectedRegisterId, setSelectedRegisterId] = useState(registers[0]?.id || '');
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const stats = useMemo(() => {
      const reg = registers.find(r => r.id === selectedRegisterId);
      const today = new Date().toISOString().split('T')[0];
      const sales = invoices.filter(i => i.cashRegisterId === selectedRegisterId && i.date === today && i.status === 'Pago');
      
      const totalSales = sales.reduce((acc, i) => acc + i.total, 0);
      const expected = (reg?.initialBalance || 0) + totalSales;

      return { initial: reg?.initialBalance || 0, totalSales, expected };
  }, [selectedRegisterId, invoices, registers]);

  const handleClose = async () => {
      if (!selectedRegisterId) return alert("Selecione um caixa para o fecho.");
      
      setIsSaving(true);
      const timestamp = new Date().toISOString();
      const closure: CashClosureType = {
          id: generateId(),
          date: timestamp,
          openedAt: timestamp,
          closedAt: timestamp,
          operatorId: currentUserId,
          operatorName: currentUser,
          cashRegisterId: selectedRegisterId,
          expectedCash: stats.expected,
          expectedMulticaixa: 0,
          expectedTransfer: 0,
          expectedCredit: 0,
          totalSales: stats.totalSales,
          actualCash: actualCash,
          difference: actualCash - stats.expected,
          initialBalance: stats.initial,
          finalBalance: actualCash,
          status: 'CLOSED',
          notes
      };

      try {
          const { error } = await supabase.from('fechos_caixa').insert({
              caixa_id: selectedRegisterId,
              operador_nome: currentUser,
              operador_id: currentUserId,
              esperado_dinheiro: stats.expected,
              dinheiro_real: actualCash,
              diferenca: closure.difference,
              total_vendas: stats.totalSales,
              saldo_inicial: stats.initial,
              saldo_final: actualCash,
              notas: notes,
              status: 'CLOSED',
              empresa_id: '00000000-0000-0000-0000-000000000001'
          });
          if (error) throw error;
          onSaveClosure(closure);
          alert("Fecho de caixa realizado e sincronizado com a cloud!");
          onGoBack();
      } catch (err: any) {
          alert("Erro ao gravar fecho: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl animate-in fade-in">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={onGoBack} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"><ArrowLeft/></button>
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Fecho de Turno</h1>
                <p className="text-sm text-slate-500">Conferência física de valores em caixa</p>
            </div>
        </div>
        <div className="space-y-6">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Selecionar Caixa para Fechar</label>
                <select className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold bg-slate-50 focus:border-blue-600 outline-none" value={selectedRegisterId} onChange={e => setSelectedRegisterId(e.target.value)}>
                    {registers.map(r => <option key={r.id} value={r.id}>{r.name} (Saldo: {formatCurrency(r.balance)})</option>)}
                </select>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 space-y-3">
                <div className="flex justify-between text-slate-600 font-medium"><span>Saldo de Abertura:</span> <span>{formatCurrency(stats.initial)}</span></div>
                <div className="flex justify-between text-slate-600 font-medium"><span>Vendas POS Hoje:</span> <span className="text-green-600 font-bold">+{formatCurrency(stats.totalSales)}</span></div>
                <div className="border-t-2 border-slate-200 pt-3 flex justify-between text-xl font-black text-slate-800"><span>Saldo Esperado:</span> <span>{formatCurrency(stats.expected)}</span></div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Contagem Física (Dinheiro Real no Caixa)</label>
                <input 
                    type="number" 
                    className="w-full p-4 border-2 border-blue-600 rounded-2xl text-4xl font-black text-right text-blue-700 focus:ring-4 focus:ring-blue-100 outline-none transition" 
                    value={actualCash || ''} 
                    onChange={e => setActualCash(Number(e.target.value))}
                    placeholder="0.00"
                    autoFocus
                />
                <div className={`mt-2 text-right font-bold text-sm ${actualCash - stats.expected === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Diferença: {formatCurrency(actualCash - stats.expected)}
                </div>
            </div>
            <textarea className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm h-24 resize-none focus:border-blue-600 outline-none" placeholder="Observações e notas do fecho..." value={notes} onChange={e => setNotes(e.target.value)}/>
            <button onClick={handleClose} disabled={isSaving} className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition shadow-xl disabled:opacity-50">
                {isSaving ? <RefreshCw className="animate-spin"/> : <CheckCircle size={24}/>} CONFIRMAR FECHO DE CAIXA
            </button>
        </div>
    </div>
  );
};

export default CashClosure;
