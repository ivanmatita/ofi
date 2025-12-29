
import React from 'react';
import { CashClosure } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Printer, FileText, Calendar, User, Wallet } from 'lucide-react';

interface CashClosureHistoryProps {
  closures: CashClosure[];
}

const CashClosureHistory: React.FC<CashClosureHistoryProps> = ({ closures }) => {
  return (
    <div className="p-6 space-y-6 animate-in fade-in h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-indigo-600"/> Histórico de Fechos</h1>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Registos de encerramento de turno</p>
            </div>
            <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-black transition"><Printer size={16}/> Imprimir Lista</button>
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 font-bold uppercase text-[10px] text-slate-500 border-b border-slate-100">
                    <tr>
                        <th className="p-5">Data/Hora Fecho</th>
                        <th className="p-5">Caixa / Operador</th>
                        <th className="p-5 text-right">Vendas POS</th>
                        <th className="p-5 text-right">Esperado</th>
                        <th className="p-5 text-right">Contagem Real</th>
                        <th className="p-5 text-right">Diferença</th>
                        <th className="p-5 text-center">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {closures.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-5">
                                <div className="font-black text-slate-800 flex items-center gap-2"><Calendar size={14} className="text-slate-400"/> {formatDate(c.date)}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(c.date).toLocaleTimeString()}</div>
                            </td>
                            <td className="p-5">
                                <div className="font-bold text-blue-700 flex items-center gap-2"><Wallet size={14}/> ID: {c.cashRegisterId.substring(0,6).toUpperCase()}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 font-bold uppercase"><User size={12}/> {c.operatorName}</div>
                            </td>
                            <td className="p-5 text-right font-black text-slate-600">{formatCurrency(c.totalSales)}</td>
                            <td className="p-5 text-right font-mono text-slate-500">{formatCurrency(c.expectedCash)}</td>
                            <td className="p-5 text-right font-black text-slate-900 bg-slate-50/50">{formatCurrency(c.actualCash)}</td>
                            <td className={`p-5 text-right font-black ${c.difference < 0 ? 'text-red-600' : c.difference > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                                {formatCurrency(c.difference)}
                            </td>
                            <td className="p-5 text-center">
                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-indigo-100" title="Ver Detalhes / Imprimir">
                                    <Printer size={18}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {closures.length === 0 && (
                        <tr>
                            <td colSpan={7} className="p-20 text-center text-slate-300 font-black uppercase tracking-[5px] bg-slate-50 italic">Nenhum fecho registado</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default CashClosureHistory;
