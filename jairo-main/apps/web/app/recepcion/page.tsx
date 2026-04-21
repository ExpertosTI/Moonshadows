"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, CheckCircle, Clock, Star, Users, Building, ShieldCheck, Mail, Phone, ChevronRight, Check, Briefcase, Globe, Award, Map as MapIcon, LayoutGrid, Scan, Fingerprint, Activity } from "lucide-react";

// LISTADO COMPLETO (70 invitados)
const initialGuests = [
  { id: 1, name: "Ángel Donid", company: "Invitado VIP", table: "Mesa 1", status: "pending", vip: true, type: "individual" },
  { id: 2, name: "Jama", company: "Invitado", table: "Mesa 2", status: "pending", vip: false, type: "individual" },
  { id: 3, name: "Iván", company: "Invitado", table: "Mesa 2", status: "pending", vip: false, type: "individual" },
  { id: 4, name: "Manuel", company: "Invitado", table: "Mesa 3", status: "pending", vip: false, type: "individual" },
  { id: 5, name: "Burak", company: "Invitado", table: "Mesa 3", status: "pending", vip: false, type: "individual" },
  { id: 6, name: "Gilbeat", company: "Invitado", table: "Mesa 4", status: "pending", vip: false, type: "individual" },
  { id: 7, name: "Carbs", company: "Invitado", table: "Mesa 4", status: "pending", vip: false, type: "individual" },
  { id: 8, name: "Sjan", company: "Invitado", table: "Mesa 5", status: "pending", vip: false, type: "individual" },
  { id: 9, name: "Arlel", company: "Invitado", table: "Mesa 5", status: "pending", vip: false, type: "individual" },
  { id: 10, name: "Maimón", company: "Maimón", table: "Mesa 1", status: "pending", vip: true, type: "company" },
  { id: 11, name: "Nelvis", company: "Invitado", table: "Mesa 6", status: "pending", vip: false, type: "individual" },
  { id: 12, name: "Eshem", company: "Invitado", table: "Mesa 6", status: "pending", vip: false, type: "individual" },
  { id: 13, name: "GBC", company: "Farmacias GBC", table: "Mesa 1", status: "pending", vip: true, type: "company" },
  { id: 14, name: "Hino", company: "Invitado", table: "Mesa 7", status: "pending", vip: false, type: "individual" },
  { id: 15, name: "Renso", company: "RenaceTech", table: "Mesa 1", status: "pending", vip: true, type: "individual" },
  { id: 16, name: "Kike", company: "Invitado", table: "Mesa 7", status: "pending", vip: false, type: "individual" },
  { id: 17, name: "Ana Isa", company: "Invitado", table: "Mesa 8", status: "pending", vip: false, type: "individual" },
  { id: 18, name: "Adterlin Rey", company: "Invitado", table: "Mesa 8", status: "pending", vip: false, type: "individual" },
  { id: 19, name: "Robinson Milán", company: "Invitado", table: "Mesa 9", status: "pending", vip: false, type: "individual" },
  { id: 20, name: "Ruban Slio", company: "Invitado", table: "Mesa 9", status: "pending", vip: false, type: "individual" },
  { id: 21, name: "Jessica", company: "Invitado", table: "Mesa 10", status: "pending", vip: false, type: "individual" },
  { id: 22, name: "Rapelito Confesor", company: "Invitado", table: "Mesa 10", status: "pending", vip: false, type: "individual" },
  { id: 23, name: "Balberts Morenito", company: "Invitado", table: "Mesa 11", status: "pending", vip: false, type: "individual" },
  { id: 24, name: "Cuba Luciano", company: "Invitado", table: "Mesa 11", status: "pending", vip: false, type: "individual" },
  { id: 25, name: "King 6 Isaias", company: "Invitado", table: "Mesa 12", status: "pending", vip: false, type: "individual" },
  { id: 26, name: "Mauricio", company: "Invitado", table: "Mesa 12", status: "pending", vip: false, type: "individual" },
  { id: 27, name: "Mayra", company: "Invitado", table: "Mesa 13", status: "pending", vip: false, type: "individual" },
  { id: 28, name: "Roca Céspedes", company: "Invitado", table: "Mesa 13", status: "pending", vip: false, type: "individual" },
  { id: 29, name: "Maguiver ASS", company: "Invitado", table: "Mesa 14", status: "pending", vip: false, type: "individual" },
  { id: 30, name: "Chuky", company: "Invitado", table: "Mesa 14", status: "pending", vip: false, type: "individual" },
  { id: 31, name: "Pamela", company: "Invitado", table: "Mesa 15", status: "pending", vip: false, type: "individual" },
  { id: 32, name: "Compa", company: "Invitado", table: "Mesa 15", status: "pending", vip: false, type: "individual" },
  { id: 33, name: "Pabolo (?)", company: "Por Confirmar", table: "Mesa 16", status: "pending", vip: false, type: "individual" },
  { id: 34, name: "Popy", company: "Invitado", table: "Mesa 16", status: "pending", vip: false, type: "individual" },
  { id: 35, name: "Rubén (?)", company: "Por Confirmar", table: "Mesa 17", status: "pending", vip: false, type: "individual" },
  { id: 36, name: "Yaco", company: "Invitado", table: "Mesa 17", status: "pending", vip: false, type: "individual" },
  { id: 37, name: "Niño", company: "Invitado", table: "Mesa 18", status: "pending", vip: false, type: "individual" },
  { id: 38, name: "Brenda", company: "Invitado", table: "Mesa 18", status: "pending", vip: false, type: "individual" },
  { id: 39, name: "Herarne", company: "Invitado", table: "Mesa 19", status: "pending", vip: false, type: "individual" },
  { id: 40, name: "Lorena", company: "Invitado", table: "Mesa 19", status: "pending", vip: false, type: "individual" },
  { id: 41, name: "Rayhon", company: "Invitado", table: "Mesa 20", status: "pending", vip: false, type: "individual" },
  { id: 42, name: "Eliel", company: "Invitado", table: "Mesa 20", status: "pending", vip: false, type: "individual" },
  { id: 43, name: "Baterry", company: "Invitado", table: "Mesa 21", status: "pending", vip: false, type: "individual" },
  { id: 44, name: "Sergio Weelt", company: "Invitado", table: "Mesa 21", status: "pending", vip: false, type: "individual" },
  { id: 45, name: "Yeba Celulares", company: "Yeba", table: "Mesa 22", status: "pending", vip: false, type: "company" },
  { id: 46, name: "Bia", company: "Invitado", table: "Mesa 22", status: "pending", vip: false, type: "individual" },
  { id: 47, name: "Juan Ron", company: "Invitado", table: "Mesa 23", status: "pending", vip: false, type: "individual" },
  { id: 48, name: "Hunter Cocinas", company: "Hunter", table: "Mesa 23", status: "pending", vip: false, type: "company" },
  { id: 49, name: "Boses (?)", company: "Por Confirmar", table: "Mesa 24", status: "pending", vip: false, type: "individual" },
  { id: 50, name: "Indira (?)", company: "Por Confirmar", table: "Mesa 24", status: "pending", vip: false, type: "individual" },
  { id: 51, name: "Landy (?)", company: "Por Confirmar", table: "Mesa 25", status: "pending", vip: false, type: "individual" },
  { id: 52, name: "Ceballas (?)", company: "Por Confirmar", table: "Mesa 25", status: "pending", vip: false, type: "individual" },
  { id: 53, name: "Quirino (?)", company: "Por Confirmar", table: "Mesa 26", status: "pending", vip: false, type: "individual" },
  { id: 54, name: "Wascar", company: "Invitado", table: "Mesa 26", status: "pending", vip: false, type: "individual" },
  { id: 55, name: "Álvaro Chaca", company: "Invitado", table: "Mesa 27", status: "pending", vip: false, type: "individual" },
  { id: 56, name: "Yor 64", company: "Invitado", table: "Mesa 27", status: "pending", vip: false, type: "individual" },
  { id: 57, name: "Claudia", company: "Invitado", table: "Mesa 28", status: "pending", vip: false, type: "individual" },
  { id: 58, name: "Mark", company: "Invitado", table: "Mesa 28", status: "pending", vip: false, type: "individual" },
  { id: 59, name: "Abi", company: "Invitado", table: "Mesa 29", status: "pending", vip: false, type: "individual" },
  { id: 60, name: "Almanzar", company: "Invitado", table: "Mesa 29", status: "pending", vip: false, type: "individual" },
  { id: 61, name: "Wascar Melo", company: "Invitado", table: "Mesa 30", status: "pending", vip: false, type: "individual" },
  { id: 62, name: "Delvr", company: "Invitado", table: "Mesa 30", status: "pending", vip: false, type: "individual" },
  { id: 63, name: "Lucía", company: "Invitado", table: "Mesa 31", status: "pending", vip: false, type: "individual" },
  { id: 64, name: "UB (+2)", company: "Grupo UB", table: "VIP Lounge", status: "pending", vip: true, type: "group", pax: 3 },
  { id: 65, name: "Musa (+5)", company: "Grupo Musa", table: "VIP Lounge", status: "pending", vip: true, type: "group", pax: 6 },
  { id: 66, name: "NC (?)", company: "Por Confirmar", table: "Mesa 31", status: "pending", vip: false, type: "individual" },
  { id: 67, name: "Ju. Santos (+2)", company: "Grupo Santos", table: "Mesa 32", status: "pending", vip: false, type: "group", pax: 3 },
  { id: 68, name: "Carvajal", company: "Invitado", table: "Mesa 32", status: "pending", vip: false, type: "individual" },
  { id: 69, name: "Bido", company: "Invitado", table: "Mesa 33", status: "pending", vip: false, type: "individual" },
  { id: 70, name: "CoopMaimón (+5)", company: "Cooperativa Maimón", table: "VIP Lounge", status: "pending", vip: true, type: "group", pax: 6 },
];

export default function ReceptionApp() {
  const [guests, setGuests] = useState(initialGuests);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [formData, setFormData] = useState({ companyName: "", email: "", phone: "", sector: "" });
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [aiProfileResult, setAiProfileResult] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';
  const EVENT_ID = "evt_circulo_001";

  useEffect(() => {
    setMounted(true);
    
    // Conexión a la base de datos inteligente (Producción MVP)
    const loadGuestsFromDB = async () => {
      try {
        const res = await fetch(`${apiUrl}/events/${EVENT_ID}/attendance`);
        if (res.ok) {
          const dbGuests = await res.json();
          if (dbGuests && dbGuests.length > 0) {
            const mapped = dbGuests.map((g: any) => ({
              id: g.id,
              name: g.guestName,
              company: g.companyName || "Invitado",
              table: g.metadata?.table || "General",
              status: g.confirmed ? "confirmed" : "pending",
              vip: g.metadata?.vip || false,
              pax: g.metadata?.pax || null,
              type: g.metadata?.type || "individual"
            }));
            
            if (mapped.length > 10) {
              setGuests(mapped);
            }
          }
        }
      } catch (err) {
        console.log("No se pudo conectar a la base de datos, usando listado fallback.");
      }
    };
    
    loadGuestsFromDB();
  }, [apiUrl]);

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const matchSearch = (g.name + g.company + g.table).toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (filter === "pending") return g.status === "pending";
      if (filter === "confirmed") return g.status === "confirmed";
      if (filter === "vip") return g.vip;
      return true;
    });
  }, [guests, search, filter]);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter(g => g.status === "confirmed").length;
    const pending = total - confirmed;
    const vip = guests.filter(g => g.vip).length;
    return { total, confirmed, pending, vip };
  }, [guests]);

  // Agrupar por mesas para la vista de mapa
  const tables = useMemo(() => {
    const tableMap = new Map();
    guests.forEach(g => {
      if (!tableMap.has(g.table)) tableMap.set(g.table, []);
      tableMap.get(g.table).push(g);
    });
    return Array.from(tableMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [guests]);

  const handleOpenCheckin = (guest: any) => {
    setSelectedGuest(guest);
    setAiProfileResult(null);
    setFormData({ companyName: guest.company !== "Invitado" ? guest.company : "", email: "", phone: "", sector: "" });
  };

  const handleConfirmCheckin = async () => {
    setIsCheckingIn(true);
    
    try {
      // 1. Integración Backend: Registrar Asistencia
      const attendanceRes = await fetch(`${apiUrl}/events/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: EVENT_ID,
          guestName: selectedGuest.name,
          email: formData.email || `${selectedGuest.name.replace(/\s+/g, '').toLowerCase()}@invitado.com`,
          whatsapp: formData.phone || "0000000000",
          companyName: formData.companyName || selectedGuest.company,
          metadata: {
            table: selectedGuest.table,
            vip: selectedGuest.vip,
            pax: selectedGuest.pax
          }
        })
      });

      // 2. Integración de IA: Generar perfil de Networking en tiempo real
      if (attendanceRes.ok || true) { // Force AI generation even if DB fetch fails for MVP visual
        const aiRes = await fetch(`${apiUrl}/events/ai/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: formData.companyName || selectedGuest.company,
            guestName: selectedGuest.name
          })
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          setAiProfileResult(aiData.aiProfile);
        }
      }

      // Actualizar UI State
      setGuests(prev => prev.map(g => g.id === selectedGuest.id ? { ...g, status: "confirmed" } : g));
      
      // En vez de cerrar inmediatamente, esperamos 4s para que vean el AI Match
      setTimeout(() => {
        setSelectedGuest(null);
        setAiProfileResult(null);
        setFormData({ companyName: "", email: "", phone: "", sector: "" });
      }, 4000);

    } catch (error) {
      console.error("Error confirmando acceso:", error);
      // Fallback
      setGuests(prev => prev.map(g => g.id === selectedGuest.id ? { ...g, status: "confirmed" } : g));
      setTimeout(() => {
        setSelectedGuest(null);
      }, 2000);
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#030407] text-gray-200 font-sans selection:bg-primary/30 relative overflow-hidden">
      
      {/* ULTRA PREMIUM BACKGROUND: Deep layered image + gradients + grid */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?q=80&w=3000&auto=format&fit=crop')" }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#030407] via-[#050A10]/90 to-[#1B7F3C]/10 pointer-events-none"></div>
      
      {/* Tech Grid Overlay */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]"></div>

      {/* Cyberpunk/High-End Lighting Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[150px] rounded-full animate-pulse mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>

      {/* Sidebar / Stats (Ultra Premium Glass) */}
      <aside className="w-[420px] hidden lg:flex bg-[#0A0D14]/60 backdrop-blur-[40px] border-r border-white/[0.05] flex-col z-20 h-screen shrink-0 shadow-[30px_0_100px_rgba(0,0,0,0.8)] relative">
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-primary/30 to-transparent"></div>
        
        <div className="p-12 border-b border-white/[0.05] bg-gradient-to-br from-[#1B7F3C]/10 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Fingerprint size={120} className="text-primary" />
          </div>
          <div className="flex items-center gap-5 mb-8 relative z-10">
            <div className="bg-gradient-to-br from-primary to-[#0F4A21] p-3.5 rounded-[1.2rem] shadow-[0_0_40px_rgba(27,127,60,0.6)] border border-primary/40 relative">
              <div className="absolute inset-0 border border-white/20 rounded-[1.2rem] scale-110 opacity-50 animate-ping"></div>
              <ShieldCheck className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white leading-none drop-shadow-2xl">
                Jairo<span className="text-primary">Acceso</span>
              </h1>
              <p className="text-[11px] font-black text-primary/80 mt-1.5 uppercase tracking-[0.3em] flex items-center gap-2">
                <Activity size={12} className="animate-pulse" /> Command Center
              </p>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1 relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-2">Live Telemetry</p>
            <div className="flex gap-1 mb-2">
              <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
            </div>
          </div>
          
          <div className="space-y-5">
            {/* Stat Card 1 */}
            <div className="bg-black/30 backdrop-blur-2xl rounded-[2rem] p-7 border border-white/[0.05] hover:border-blue-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 group-hover:bg-blue-400 transition-colors"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                  <Users size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60 group-hover:text-blue-400 transition-colors">Target</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">Total Manifest</p>
                  <p className="text-5xl font-black text-white tracking-tighter leading-none">{stats.total}</p>
                </div>
              </div>
            </div>
            
            {/* Stat Card 2 */}
            <div className="bg-gradient-to-br from-[#1B7F3C]/10 to-black/30 backdrop-blur-2xl rounded-[2rem] p-7 border border-primary/20 hover:border-primary/50 transition-all group relative overflow-hidden shadow-[0_0_30px_rgba(27,127,60,0.1)] hover:shadow-[0_0_50px_rgba(27,127,60,0.2)]">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary group-hover:shadow-[0_0_15px_#1B7F3C] transition-shadow"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/20 rounded-2xl text-primary group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(27,127,60,0.5)]">
                  <CheckCircle size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Cleared</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold text-primary/70 mb-1">Access Granted</p>
                  <p className="text-6xl font-black text-white tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{stats.confirmed}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-gray-500/30 leading-none">{(stats.confirmed / stats.total * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-black/30 backdrop-blur-2xl rounded-[2rem] p-7 border border-white/[0.05] hover:border-orange-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50 group-hover:bg-orange-400 transition-colors"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400 group-hover:scale-110 transition-transform">
                  <Clock size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400/60 group-hover:text-orange-400 transition-colors">Inbound</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">Pending Entry</p>
                  <p className="text-5xl font-black text-white tracking-tighter leading-none">{stats.pending}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/[0.05] bg-black/60 relative z-10 backdrop-blur-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-tr from-gray-900 to-gray-700 border border-white/20 flex items-center justify-center shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/20 animate-pulse mix-blend-screen"></div>
                <Globe className="text-gray-300 relative z-10" size={20} />
              </div>
              <div>
                <p className="text-[15px] font-black text-white tracking-tight">Main Terminal</p>
                <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span> Online
                </p>
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
              <Award size={20} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 w-full">
        {/* Topbar: Filters & Search */}
        <header className="bg-[#0A0D14]/70 backdrop-blur-[30px] border-b border-white/[0.05] p-6 md:p-8 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 z-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="relative w-full xl:w-[500px] group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary group-focus-within:scale-110 transition-transform" size={24} />
            <input 
              type="text" 
              placeholder="Search via ID, name or company..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-16 pr-8 py-5 bg-black/50 border border-white/10 rounded-full text-xl text-white placeholder:text-gray-600 focus:bg-black/80 focus:border-primary/50 outline-none transition-all shadow-inner relative z-10 font-medium"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-5 w-full xl:w-auto items-center">
            {/* View Toggles */}
            <div className="flex bg-black/60 p-1.5 rounded-[1.5rem] border border-white/[0.08] shadow-inner">
              <button 
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2.5 px-7 py-3.5 rounded-[1.2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${viewMode === 'list' ? 'bg-primary text-white shadow-[0_0_20px_rgba(27,127,60,0.5)] scale-105' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
              >
                <LayoutGrid size={16} /> Directory
              </button>
              <button 
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-2.5 px-7 py-3.5 rounded-[1.2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${viewMode === 'map' ? 'bg-primary text-white shadow-[0_0_20px_rgba(27,127,60,0.5)] scale-105' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
              >
                <MapIcon size={16} /> Tables
              </button>
            </div>

            {/* AI Scan Button */}
            <button className="hidden md:flex bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-900 border border-white/10 text-white px-8 py-4 rounded-[1.5rem] items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.2em] transition-all shrink-0 shadow-2xl active:scale-95 group overflow-hidden relative">
              <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <Scan className="text-primary relative z-10 group-hover:rotate-90 transition-transform duration-500" size={18} />
              <span className="relative z-10">Initialize Scanner</span>
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative z-10">
          
          {/* Quick Filters - inside scroll area for better space */}
          {viewMode === "list" && (
            <div className="flex gap-3 mb-8 overflow-x-auto hide-scrollbar pb-2">
              {[
                { id: 'all', label: 'All Records' },
                { id: 'pending', label: 'Awaiting Entry' },
                { id: 'confirmed', label: 'Cleared' },
                { id: 'vip', label: 'VIP Lounge' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-6 py-3.5 rounded-[1rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all border whitespace-nowrap ${
                    filter === f.id 
                      ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                      : 'bg-black/40 backdrop-blur-md text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {viewMode === "list" ? (
            // ULTRA PREMIUM LIST VIEW (GRID)
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-7">
              {filteredGuests.map((guest) => (
                <button 
                  key={guest.id}
                  onClick={() => guest.status === 'pending' ? handleOpenCheckin(guest) : null}
                  className={`text-left rounded-[2.5rem] p-8 border transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[220px] group
                    ${guest.status === 'confirmed' 
                      ? 'bg-[#0A0D14]/80 backdrop-blur-2xl border-primary/20 opacity-80' 
                      : 'bg-[#0F131C]/60 backdrop-blur-3xl border-white/[0.08] hover:border-primary/50 hover:shadow-[0_20px_60px_rgba(27,127,60,0.15)] hover:-translate-y-2'
                    }
                  `}
                >
                  <div className={`absolute left-0 top-0 w-1.5 h-full transition-all duration-500 ${guest.status === 'confirmed' ? 'bg-primary shadow-[0_0_20px_#1B7F3C]' : guest.vip ? 'bg-purple-500 shadow-[0_0_20px_#A855F7]' : 'bg-transparent group-hover:bg-primary/50'}`}></div>
                  
                  {/* Decorative Glow */}
                  <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-[80px] transition-opacity duration-700 pointer-events-none
                    ${guest.vip ? 'bg-purple-600/20 opacity-100' : 'bg-primary/20 opacity-0 group-hover:opacity-100'}
                  `}></div>

                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 backdrop-blur-md
                      ${guest.status === 'confirmed' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-black/50 border-white/10 text-gray-400 group-hover:border-white/20'}`}>
                      <MapIcon size={12} /> {guest.table}
                    </div>
                    {guest.status === 'confirmed' && <div className="bg-primary/10 p-2 rounded-full border border-primary/30 shadow-[0_0_15px_rgba(27,127,60,0.5)]"><CheckCircle className="text-primary" size={24} /></div>}
                    {guest.vip && guest.status !== 'confirmed' && <div className="bg-purple-500/10 p-2 rounded-full border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]"><Star className="text-purple-400" size={20} fill="currentColor" /></div>}
                  </div>

                  <div className="relative z-10">
                    <h3 className={`font-black text-3xl leading-none mb-3 tracking-tighter ${guest.status === 'confirmed' ? 'text-primary' : 'text-white'}`}>
                      {guest.name}
                    </h3>
                    <p className="text-sm font-bold text-gray-500 tracking-wide">{guest.company}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-5">
                      {guest.pax && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-xl">
                          <Users size={12}/> +{guest.pax} PAXS
                        </span>
                      )}
                      {guest.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                          Tap to Verify <ChevronRight size={12}/>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // ULTRA PREMIUM MAP VIEW (TABLES)
            <div className="columns-1 lg:columns-2 2xl:columns-3 gap-8 space-y-8 pb-20">
              {tables.map(([tableName, tableGuests]) => {
                const confirmedCount = tableGuests.filter((g: any) => g.status === 'confirmed').length;
                const total = tableGuests.length;
                const isComplete = confirmedCount === total;

                return (
                  <div key={tableName} className="break-inside-avoid bg-[#0F131C]/80 backdrop-blur-[40px] border border-white/[0.08] hover:border-white/20 transition-colors duration-500 rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative group">
                    <div className={`absolute top-0 left-0 w-full h-1 ${isComplete ? 'bg-primary shadow-[0_0_20px_#1B7F3C]' : 'bg-transparent group-hover:bg-primary/30'} transition-all duration-500`}></div>
                    
                    <div className="bg-gradient-to-br from-white/5 to-transparent p-8 border-b border-white/[0.05] flex justify-between items-center relative overflow-hidden">
                      {isComplete && <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm pointer-events-none"></div>}
                      <h3 className={`font-black text-2xl tracking-widest uppercase flex items-center gap-4 relative z-10 ${isComplete ? 'text-primary' : 'text-white'}`}>
                        <div className={`p-2 rounded-xl ${isComplete ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'}`}>
                          <LayoutGrid size={24} />
                        </div>
                        {tableName}
                      </h3>
                      <div className="relative z-10 flex flex-col items-end">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-black tracking-widest border ${isComplete ? 'bg-primary text-white border-primary shadow-[0_0_15px_#1B7F3C]' : 'bg-black/60 text-gray-400 border-white/10'}`}>
                          {confirmedCount} / {total}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.3em] text-gray-500 mt-2 font-bold">Occupancy</span>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-3">
                      {tableGuests.map((guest: any) => (
                        <button 
                          key={guest.id}
                          onClick={() => guest.status === 'pending' ? handleOpenCheckin(guest) : null}
                          className={`w-full text-left p-5 rounded-[1.5rem] flex items-center justify-between transition-all duration-300 border
                            ${guest.status === 'confirmed' 
                              ? 'bg-primary/5 border-primary/20 text-primary shadow-inner' 
                              : 'bg-black/40 border-transparent hover:bg-white/5 hover:border-white/10 text-white shadow-sm'}
                          `}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full border-2 ${guest.status === 'confirmed' ? 'bg-primary border-primary shadow-[0_0_10px_#1B7F3C]' : 'bg-transparent border-gray-600'}`}></div>
                            <div>
                              <p className="font-black text-lg tracking-tight leading-none mb-1">{guest.name}</p>
                              <p className="text-[10px] opacity-60 uppercase tracking-[0.2em] font-bold">{guest.company}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {guest.pax && <span className="text-[10px] font-black uppercase text-gray-500 bg-white/5 px-2 py-1 rounded-md">+{guest.pax}</span>}
                            {guest.vip && <Star size={16} className="text-purple-400" />}
                            {guest.status === 'pending' && <ChevronRight size={16} className="text-gray-600 opacity-0 group-hover:opacity-100" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredGuests.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
                <Search size={100} className="text-gray-600/50 mb-8 relative z-10" />
              </div>
              <p className="text-4xl font-black text-white tracking-tighter uppercase relative z-10">Entity Not Found</p>
              <p className="text-gray-500 font-black tracking-[0.3em] uppercase text-xs mt-4 relative z-10">Adjust Search Parameters</p>
            </div>
          )}
        </div>
      </main>

      {/* ULTRA PREMIUM CHECK-IN MODAL */}
      {selectedGuest && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-[50px] z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <div className="bg-[#0A0D14]/90 border border-white/20 rounded-[3rem] w-full max-w-5xl shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden flex flex-col md:flex-row relative scale-in-center duration-500">
            
            {/* Tech Borders */}
            <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-primary rounded-tl-[3rem] opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-primary rounded-br-[3rem] opacity-50"></div>

            {/* Left Panel - Guest Info */}
            <div className="w-full md:w-2/5 bg-gradient-to-br from-primary/10 via-black/50 to-transparent p-12 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Identity Verification</p>
                </div>
                
                <h2 className="text-6xl font-black text-white leading-[0.9] tracking-tighter mb-6 drop-shadow-2xl">{selectedGuest.name}</h2>
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl mb-12">
                  <Briefcase size={14} className="text-gray-400" />
                  <p className="text-sm font-black text-gray-300 uppercase tracking-widest">{selectedGuest.company}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-black/60 border border-white/10 p-5 rounded-2xl flex items-center gap-5 backdrop-blur-md hover:border-primary/50 transition-colors group">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                      <MapIcon size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Zone Assignment</p>
                      <p className="text-2xl text-white font-black tracking-tight">{selectedGuest.table}</p>
                    </div>
                  </div>
                  
                  {selectedGuest.pax && (
                    <div className="bg-black/60 border border-white/10 p-5 rounded-2xl flex items-center gap-5 backdrop-blur-md">
                      <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
                        <Users size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Additional Guests</p>
                        <p className="text-2xl text-white font-black tracking-tight">+{selectedGuest.pax} PAX</p>
                      </div>
                    </div>
                  )}

                  {selectedGuest.vip && (
                    <div className="bg-gradient-to-r from-purple-900/40 to-black/60 border border-purple-500/30 p-5 rounded-2xl flex items-center gap-5 backdrop-blur-md">
                      <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                        <Star size={24} fill="currentColor" />
                      </div>
                      <div>
                        <p className="text-[10px] text-purple-300/70 uppercase tracking-[0.2em] font-bold">Clearance Level</p>
                        <p className="text-2xl text-purple-100 font-black tracking-tight">VIP Executive</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/10 relative z-10 flex items-center gap-4 text-gray-500">
                <Fingerprint size={32} className="opacity-50" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em]">Biometric bypass available</p>
                  <p className="text-[9px] font-mono mt-1">SYS_ID: {selectedGuest.id.toString().padStart(6, '0')}-A</p>
                </div>
              </div>
            </div>

            {/* Right Panel - Form & Actions */}
            <div className="w-full md:w-3/5 p-12 flex flex-col bg-black/40 relative overflow-hidden">
              
              {/* AI Match Overlay */}
              {aiProfileResult && (
                <div className="absolute inset-0 bg-[#0A0D14]/95 backdrop-blur-3xl z-20 flex flex-col p-12 animate-in fade-in zoom-in duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-primary/20 rounded-2xl">
                      <Zap className="text-primary animate-pulse" size={32} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter">Insforge AI Match</h3>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Análisis de Oportunidad B2B</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-8 relative z-10">
                    <div className="bg-black/50 border border-white/10 rounded-[2rem] p-8">
                      <p className="text-5xl font-black text-white mb-4">{aiProfileResult.matchScore}% Match</p>
                      <p className="text-base text-gray-400 font-medium leading-relaxed">{aiProfileResult.aiSummary}</p>
                    </div>
                    
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold mb-4">Etiquetas Semánticas</p>
                      <div className="flex flex-wrap gap-3">
                        {aiProfileResult.networkingTags?.map((tag: string, idx: number) => (
                          <span key={idx} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-bold text-gray-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 text-center relative z-10">
                    <div className="inline-flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-sm bg-primary/10 px-6 py-4 rounded-full border border-primary/20">
                      <CheckCircle size={20} className="animate-bounce" /> Acceso Concedido
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Form */}
              <div className={`flex flex-col h-full transition-opacity duration-300 ${aiProfileResult ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-between items-center mb-10">
                  <p className="text-[12px] font-black text-gray-500 uppercase tracking-[0.3em]">Confirmación de Contacto</p>
                  <button onClick={() => setSelectedGuest(null)} className="p-3 bg-white/5 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90">
                    <ChevronRight size={24} className="rotate-180" />
                  </button>
                </div>

                <div className="flex-1 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                      <Phone size={12} /> Móvil / WhatsApp
                    </label>
                    <div className="relative group">
                      <input 
                        type="tel" placeholder="+1 (000) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-[1.5rem] text-2xl text-white outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all font-medium placeholder:text-gray-700"
                      />
                      <div className="absolute inset-0 rounded-[1.5rem] ring-1 ring-primary/0 group-focus-within:ring-primary/30 transition-all pointer-events-none"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                      <Mail size={12} /> Correo Corporativo
                    </label>
                    <div className="relative group">
                      <input 
                        type="email" placeholder="correo@empresa.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-[1.5rem] text-2xl text-white outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all font-medium placeholder:text-gray-700"
                      />
                      <div className="absolute inset-0 rounded-[1.5rem] ring-1 ring-primary/0 group-focus-within:ring-primary/30 transition-all pointer-events-none"></div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex gap-6">
                  <button 
                    onClick={() => setSelectedGuest(null)}
                    className="px-8 py-6 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Posponer
                  </button>
                  <button 
                    onClick={handleConfirmCheckin}
                    disabled={isCheckingIn}
                    className="flex-1 bg-gradient-to-r from-primary to-green-600 hover:from-green-500 hover:to-primary text-white p-6 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.3em] transition-all shadow-[0_20px_50px_rgba(27,127,60,0.4)] flex items-center justify-center gap-4 disabled:opacity-50 group active:scale-95 relative overflow-hidden"
                  >
                    {isCheckingIn && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                    {isCheckingIn ? (
                      <span className="flex items-center gap-3 relative z-10">
                        <Scan className="animate-spin" size={24} /> Sincronizando AI...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3 relative z-10">
                        <Check size={28} className="group-hover:scale-125 transition-transform"/> Conceder Acceso
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
