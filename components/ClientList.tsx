
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Invoice, Company, WorkLocation, InvoiceType } from '../types';
import { generateId, formatCurrency, formatDate } from '../utils';
import { supabase } from '../services/supabaseClient';
import { 
  Search, MapPin, ArrowLeft, X, RefreshCw, UserPlus, Printer, 
  Database, Loader2, Save, Send, Share2, FileSearch, History, 
  DollarSign, FileCheck, Landmark, FileSpreadsheet, Calendar, 
  MoreVertical, Edit2, Globe, Phone, Mail, Building2, User
} from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  onSaveClient: (client: Client) => void;
  initialSelectedClientId?: string | null;
  onClearSelection?: () => void;
  companyId?: string;
  currentCompany?: Company;
  invoices?: Invoice[];
  workLocations?: WorkLocation[];
}

const ClientList: React.FC<ClientListProps> = ({ 
  clients, onSaveClient, initialSelectedClientId, onClearSelection, companyId,
  currentCompany, invoices = [], workLocations = []
}) => {
  const [view, setView] = useState<'LIST' | 'FORM' | 'CONTA_CORRENTE'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [activeEmpresaId, setActiveEmpresaId] = useState<string | null>(null);
  const [showCentralMenu, setShowCentralMenu] = useState<string | null>(null);

  useEffect(() => {
    inicializarSupabase();
  }, []);

  useEffect(() => {
    if (initialSelectedClientId) {
        const found = clients.find(c => c.id === initialSelectedClientId);
        if (found) {
            setSelectedClient(found);
            setView('CONTA_CORRENTE');
        }
    }
  }, [initialSelectedClientId, clients]);

  async function inicializarSupabase() {
    setIsLoading(true);
    try {
      let { data: empresas } = await supabase.from('empresas').select('id').limit(1);
      if (empresas && empresas.length > 0) {
        setActiveEmpresaId(empresas[0].id);
      } else {
        setActiveEmpresaId('00000000-0000-0000-0000-000000000001');
      }
      await carregarClientesSupabase();
    } catch (err: any) {
      console.error("Erro Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function carregarClientesSupabase() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: Client[] = data.map(c => ({
          id: c.id,
          name: c.nome || '',
          email: c.email || '',
          phone: c.telefone || '',
          vatNumber: c.nif || '',
          address: c.endereco || '',
          city: c.localidade || 'Luanda', 
          country: c.pais || 'Angola',
          province: c.provincia || '',
          municipality: c.municipio || '',
          postalCode: c.codigo_postal || '',
          webPage: c.web_page || '',
          clientType: c.tipo_cliente || 'nao grupo nacional',
          iban: c.iban || '',
          isAccountShared: c.conta_partilhada || false,
          initialBalance: Number(c.saldo_inicial || 0),
          accountBalance: 0, // Calculado localmente se necessário
          transactions: []
        }));
        setDbClients(mapped);
        mapped.forEach(c => onSaveClient(c));
      }
    } catch (err: any) {
      console.error(err);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.vatNumber) return alert('Contribuinte e Nome são obrigatórios');
    
    setIsLoading(true);
    const payload: any = {
      nome: formData.name,
      email: formData.email || '',
      telefone: formData.phone || '',
      nif: formData.vatNumber,
      endereco: formData.address || '',
      localidade: formData.city || 'Luanda',
      provincia: formData.province || '',
      municipio: formData.municipality || '',
      codigo_postal: formData.postalCode || '',
      pais: 'Angola',
      web_page: formData.webPage || '',
      tipo_cliente: formData.clientType || 'nao grupo nacional',
      iban: formData.iban || '',
      conta_partilhada: formData.isAccountShared || false,
      saldo_inicial: Number(formData.initialBalance || 0),
      empresa_id: activeEmpresaId
    };

    try {
      const { error } = await supabase
        .from('clientes')
        .upsert(formData.id ? { ...payload, id: formData.id } : payload);

      if (error) throw error;

      await carregarClientesSupabase();
      setView('LIST');
      alert("Cliente registado com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const allClients = useMemo(() => {
    const combined = [...dbClients, ...clients];
    const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());
    return unique.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.vatNumber.includes(searchTerm)
    );
  }, [dbClients, clients, searchTerm]);

  const renderList = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">Gestão de Clientes</h1>
                <p className="text-xs text-slate-500 flex items-center gap-1"><Database size={12}/> Cloud Sincronizado</p>
            </div>
            <div className="flex gap-2">
                <button onClick={carregarClientesSupabase} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border text-sm font-bold flex items-center gap-2">
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""}/> Sincronizar
                </button>
                <button onClick={() => { setFormData({ clientType: 'nao grupo nacional', city: 'Luanda', country: 'Angola' }); setView('FORM'); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-bold shadow-lg">
                    <UserPlus size={16}/> Registar Cliente
                </button>
            </div>
        </div>

        <div className="bg-white p-3 border border-slate-200 rounded-lg flex items-center gap-3 shadow-sm">
            <Search className="text-slate-400" size={18}/>
            <input className="flex-1 outline-none text-sm" placeholder="Pesquisar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>

        <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-700 text-white uppercase font-bold">
                        <tr>
                            <th className="p-3">Contribuinte</th>
                            <th className="p-3">Nome do Cliente</th>
                            <th className="p-3">Localidade</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3 text-right">Saldo</th>
                            <th className="p-3 text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {allClients.map((client) => (
                            <tr key={client.id} className="hover:bg-blue-50 transition-colors">
                                <td className="p-3 font-mono">{client.vatNumber}</td>
                                <td className="p-3 font-bold uppercase">{client.name}</td>
                                <td className="p-3">{client.city}</td>
                                <td className="p-3 uppercase text-[10px] font-bold text-slate-500">{client.clientType}</td>
                                <td className="p-3 text-right font-black text-blue-600">{formatCurrency(client.accountBalance)}</td>
                                <td className="p-3 text-center relative">
                                    <button 
                                        onClick={() => setShowCentralMenu(client.id)}
                                        className="p-1.5 hover:bg-slate-200 rounded-full transition text-slate-600"
                                    >
                                        <MoreVertical size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Menu Centralizado Solicitado */}
        {showCentralMenu && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest">Opções do Cliente</span>
                        <button onClick={() => setShowCentralMenu(null)} className="hover:bg-red-500 p-1 rounded-full"><X size={18}/></button>
                    </div>
                    <div className="flex flex-col text-sm font-bold text-slate-700">
                        {(() => {
                            const client = allClients.find(c => c.id === showCentralMenu);
                            if (!client) return null;
                            return (
                                <>
                                    <button onClick={() => { setFormData(client); setView('FORM'); setShowCentralMenu(null); }} className="p-4 text-left hover:bg-blue-50 flex items-center gap-3 border-b transition-colors">
                                        <Edit2 size={16} className="text-blue-600"/> Editar Cliente
                                    </button>
                                    <button onClick={() => { setSelectedClient(client); setView('CONTA_CORRENTE'); setShowCentralMenu(null); }} className="p-4 text-left hover:bg-blue-50 flex items-center gap-3 border-b transition-colors">
                                        <History size={16} className="text-emerald-600"/> Conta Corrente
                                    </button>
                                    <button className="p-4 text-left hover:bg-blue-50 flex items-center gap-3 border-b transition-colors">
                                        <Send size={16} className="text-indigo-600"/> Envio Conta Corrente Email
                                    </button>
                                    <button className="p-4 text-left hover:bg-blue-50 flex items-center gap-3 border-b transition-colors">
                                        <Share2 size={16} className="text-orange-600"/> Autoriza Conta Corrente Partilhada
                                    </button>
                                    <button className="p-4 text-left hover:bg-blue-50 flex items-center gap-3 border-b transition-colors">
                                        <FileSearch size={16} className="text-slate-500"/> CadastroV5
                                    </button>
                                    <button className="p-4 text-left hover:bg-blue-50 flex items-center gap-3 border-b transition-colors">
                                        <DollarSign size={16} className="text-green-600"/> Saldo Inicial de Conta Corrente
                                    </button>
                                    <button className="p-4 text-left hover:bg-blue-50 flex items-center gap-3 border-b transition-colors">
                                        <FileCheck size={16} className="text-blue-500"/> Documentos Liquidados
                                    </button>
                                    <button className="p-4 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors">
                                        <Landmark size={16} className="text-slate-800"/> Registo de Iban
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>
        )}
    </div>
  );

  const renderForm = () => (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
             <div className="bg-slate-900 text-white p-6 flex justify-between items-center sticky top-0 z-10 border-b-4 border-blue-600">
                <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
                    <UserPlus size={24} className="text-blue-400"/> {formData.id ? 'Editar Cadastro de Cliente' : 'Novo Cadastro de Cliente'}
                </h3>
                <button onClick={() => setView('LIST')} className="hover:bg-red-600 p-2 rounded-full transition"><X size={24}/></button>
             </div>
             
             <form onSubmit={handleSave}>
                 <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="col-span-3 border-b pb-2">
                           <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">01 - Identificação Principal</h4>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Contribuinte *</label>
                          <input required className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-mono focus:border-blue-600 outline-none transition" placeholder="NIF" value={formData.vatNumber || ''} onChange={e => setFormData({...formData, vatNumber: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Nome do Cliente *</label>
                          <input required className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-600 outline-none transition" placeholder="Nome Completo / Razão Social" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      
                      <div className="col-span-3 border-b pb-2 mt-4">
                           <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">02 - Endereço e Localização</h4>
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Morada</label>
                          <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-medium focus:border-blue-600 outline-none transition" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Localidade</label>
                          <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-600 outline-none transition" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Codigo Postal</label>
                          <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl focus:border-blue-600 outline-none" value={formData.postalCode || ''} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Provincia</label>
                          <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl focus:border-blue-600 outline-none" value={formData.province || ''} onChange={e => setFormData({...formData, province: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Municipio</label>
                          <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl focus:border-blue-600 outline-none" value={formData.municipality || ''} onChange={e => setFormData({...formData, municipality: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Pais</label>
                          <input readOnly className="w-full p-3 border-2 border-slate-100 bg-slate-100 text-slate-400 rounded-xl outline-none" value="Angola" />
                      </div>

                      <div className="col-span-3 border-b pb-2 mt-4">
                           <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">03 - Contactos e Web</h4>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Telefone</label>
                          <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-600 outline-none transition" placeholder="(+000) 000 000 000" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Email</label>
                          <input type="email" className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl focus:border-blue-600 outline-none" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">WebPage</label>
                          <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl focus:border-blue-600 outline-none" placeholder="www.site.com" value={formData.webPage || ''} onChange={e => setFormData({...formData, webPage: e.target.value})} />
                      </div>

                      <div className="col-span-3 border-b pb-2 mt-4">
                           <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">04 - Configuração Fiscal</h4>
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tipo de Cliente</label>
                          <select className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-600 outline-none" value={formData.clientType} onChange={e => setFormData({...formData, clientType: e.target.value})}>
                              <option value="nacional">nacional</option>
                              <option value="associdados">associdados</option>
                              <option value="estrangeiros">estrangeiros</option>
                              <option value="nao grupo nacional">nao grupo nacional</option>
                              <option value="outros">outros</option>
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Saldo Inicial</label>
                          <input type="number" className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-black text-blue-700" value={formData.initialBalance || 0} onChange={e => setFormData({...formData, initialBalance: Number(e.target.value)})} />
                      </div>
                 </div>
                 
                 <div className="p-8 bg-slate-900 flex justify-end gap-4">
                      <button type="button" onClick={() => setView('LIST')} className="px-10 py-4 border-2 border-slate-700 text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-800 transition">Cancelar</button>
                      <button type="submit" disabled={isLoading} className="px-16 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-2xl hover:bg-blue-500 transition transform active:scale-95 disabled:opacity-50 flex items-center gap-3">
                          {isLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                          Registar Cliente
                      </button>
                 </div>
             </form>
        </div>
    </div>
  );

  const renderContaCorrente = () => {
    if (!selectedClient) return null;
    
    // Filtrar faturas deste cliente para cálculos
    const clientInvoices = (invoices || []).filter(i => i.clientId === selectedClient.id && i.isCertified);
    const totalDebito = clientInvoices.filter(i => ![InvoiceType.NC, InvoiceType.RG].includes(i.type)).reduce((acc, i) => acc + (i.currency === 'AOA' ? i.total : i.contraValue || i.total), 0);
    const totalCredito = clientInvoices.filter(i => [InvoiceType.NC, InvoiceType.RG].includes(i.type)).reduce((acc, i) => acc + i.total, 0);
    const saldoFinal = selectedClient.initialBalance + totalDebito - totalCredito;

    return (
        <div className="space-y-4 animate-in slide-in-from-right h-full flex flex-col pb-20 bg-[#eef2f3] p-6 min-h-screen">
            {/* Toolbar Superior idêntica à imagem */}
            <div className="flex justify-between items-start print:hidden mb-4">
                 <div className="flex gap-4">
                    <button onClick={() => setView('LIST')} className="bg-slate-200 hover:bg-slate-300 p-2 rounded-full transition text-slate-600 shadow-sm"><ArrowLeft size={20}/></button>
                 </div>
                 <div className="flex gap-2">
                    <button className="bg-[#689f38] text-white p-2 rounded-full font-black text-[10px] w-10 h-10 flex items-center justify-center shadow-lg hover:bg-green-700 transition" title="Exportar XLSX"><FileSpreadsheet size={18}/></button>
                    <button className="bg-[#689f38] text-white p-2 rounded-full font-black text-[10px] w-10 h-10 flex items-center justify-center shadow-lg hover:bg-green-700 transition" title="Mapa Mensal"><Calendar size={18}/></button>
                    <button className="bg-[#ffa000] text-white p-2 rounded-full font-black text-[10px] w-10 h-10 flex items-center justify-center shadow-lg hover:bg-orange-600 transition" title="Resumo Financeiro"><DollarSign size={18}/></button>
                    <button onClick={() => window.print()} className="bg-[#4a90e2] text-white p-2 rounded-full font-black text-[10px] w-10 h-10 flex items-center justify-center shadow-lg hover:bg-blue-700 transition" title="Imprimir Extrato"><Printer size={18}/></button>
                 </div>
            </div>

            {/* Content Box */}
            <div className="bg-white p-10 border border-slate-300 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="flex flex-col md:flex-row justify-between mb-12 gap-8">
                    {/* Lado Esquerdo: Info Cliente */}
                    <div className="text-[11px] space-y-2 max-w-sm">
                        <div className="flex justify-between border-b border-slate-100 pb-1"><span className="font-bold text-slate-400">Data de Emissão:</span> <span className="font-bold text-slate-800">{new Date().toLocaleString('pt-PT')}</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1"><span className="font-bold text-slate-400">Nº Contribuinte:</span> <span className="font-bold text-slate-800">{selectedClient.vatNumber}</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1"><span className="font-bold text-slate-400">Extrato Cliente:</span> <span className="font-bold text-slate-800 uppercase">{selectedClient.name}</span></div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-6">Cod. {selectedClient.id.substring(0,4)}</div>
                    </div>

                    {/* Lado Direito: Info Empresa */}
                    <div className="text-right flex flex-col items-end">
                        <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded font-black text-sm uppercase mb-4 w-fit shadow-inner">{(currentCompany?.name || 'GLOBALSHARE ANGOLA - COMERCIO E SERVIÇO, LDA').toUpperCase()}</div>
                        <div className="text-[10px] text-slate-600 font-bold text-right space-y-0.5 leading-tight">
                            <p>{currentCompany?.address || 'Av. Ho Chi Min, nº 54'}</p>
                            <p>{selectedClient.municipality || 'Maianga'}</p>
                            <p>{selectedClient.postalCode || '0000-000'}</p>
                            <p>{selectedClient.city || 'Luanda'}</p>
                            <p>{selectedClient.country || 'AO'}</p>
                        </div>
                    </div>
                </div>

                {/* Sub-Header Saldo Acumulado */}
                <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 mb-2">
                    <h2 className="font-black text-xs uppercase tracking-widest text-slate-800">Conta Corrente de Cliente <span className="text-blue-600 ml-4">AOA</span></h2>
                    <div className="text-right">
                         <span className="text-[10px] font-bold text-slate-400 uppercase mr-6">Saldo Acumulado Geral</span>
                         <span className="text-lg font-black text-slate-900">{formatCurrency(saldoFinal).replace('Kz','')}</span>
                    </div>
                </div>

                {/* Tabela idêntica à imagem */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[9px] border-collapse">
                        <thead className="text-slate-400 font-bold uppercase border-b border-slate-100">
                            <tr>
                                <th className="py-2">Data Valor<br/>Data Documento</th>
                                <th className="py-2">File Interno<br/>File Cliente</th>
                                <th className="py-2">URN<br/>EndService</th>
                                <th className="py-2">Doc Nº<br/>OriginatingOn</th>
                                <th className="py-2">Descricao<br/>Doc. Suporte</th>
                                <th className="py-2 text-right">Credito</th>
                                <th className="py-2 text-right">Debito</th>
                                <th className="py-2 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                            {/* Linha de Acumulados */}
                            <tr className="bg-slate-50/50">
                                <td colSpan={5} className="py-3 text-right pr-6 uppercase text-slate-500 font-black">Acumulados do Periodo</td>
                                <td className="py-3 text-right">{formatCurrency(totalCredito).replace('Kz','')}</td>
                                <td className="py-3 text-right">{formatCurrency(totalDebito).replace('Kz','')}</td>
                                <td className="py-3 text-right font-black">0,00</td>
                            </tr>
                            
                            {/* Movimentos Reais */}
                            {clientInvoices.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((inv) => {
                                const isCredit = [InvoiceType.NC, InvoiceType.RG].includes(inv.type);
                                const sourceDoc = inv.sourceInvoiceId ? invoices.find(i => i.id === inv.sourceInvoiceId) : null;
                                
                                return (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 text-slate-800">{formatDate(inv.date)}<br/><span className="text-slate-400">{formatDate(inv.date)}</span></td>
                                        <td className="py-3 uppercase">Obra Generica<br/><span className="text-slate-400">---</span></td>
                                        <td className="py-3 text-slate-400">---<br/>---</td>
                                        <td className="py-3">
                                            {inv.type} {inv.number}<br/>
                                            <span className="text-blue-600 italic">{sourceDoc ? sourceDoc.number : '---'}</span>
                                        </td>
                                        <td className="py-3 uppercase">Factura Recibo Emitida<br/><span className="text-slate-400">---</span></td>
                                        <td className="py-3 text-right">{isCredit ? formatCurrency(inv.total).replace('Kz','') : '0,00'}</td>
                                        <td className="py-3 text-right">{!isCredit ? formatCurrency(inv.total).replace('Kz','') : '0,00'}</td>
                                        <td className="py-3 text-right font-black">0,00</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                {/* Rodapé Fiscal */}
                <div className="mt-32 pt-4 border-t border-slate-100 flex justify-between text-[8px] text-slate-400 font-mono italic">
                    <div>Processado por Programa Certificado nº 25/AGT/2019</div>
                    <div>IMATEC SOFTWARE V.2.0 - Licença de Uso Profissional</div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full">
        {view === 'LIST' && renderList()}
        {view === 'FORM' && renderForm()}
        {view === 'CONTA_CORRENTE' && renderContaCorrente()}
    </div>
  );
};

export default ClientList;
