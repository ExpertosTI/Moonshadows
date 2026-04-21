"use client";

import { useState } from "react";
import Link from "next/link";
import { 
    LayoutDashboard, Users, Briefcase, FileText, Settings, 
    Bell, Search, Menu, X, ArrowUpRight, TrendingUp, 
    Activity, BarChart3, PieChart, ChevronRight, Zap
} from "lucide-react";

export default function DemoPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen bg-gray-50 flex overflow-hidden">
            {/* Sidebar */}
            <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col hidden md:flex`}>
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                    <div className={`flex items-center gap-2 font-black text-xl overflow-hidden ${sidebarOpen ? 'w-auto' : 'w-0 opacity-0'}`}>
                        <span className="text-primary">Jairo</span><span className="text-secondary">CRM</span>
                    </div>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
                        <Menu size={20} />
                    </button>
                </div>

                <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
                    {[
                        { icon: LayoutDashboard, label: "Dashboard", active: true },
                        { icon: Briefcase, label: "Oportunidades" },
                        { icon: Users, label: "Contactos B2B" },
                        { icon: FileText, label: "Cotizaciones (RFQ)" },
                        { icon: BarChart3, label: "Reportes" },
                    ].map((item, i) => (
                        <button key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${item.active ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                            <item.icon size={20} className={item.active ? 'text-primary' : 'text-gray-500'} />
                            <span className={`whitespace-nowrap transition-all duration-300 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 w-full">
                        <Settings size={20} />
                        <span className={`whitespace-nowrap transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                            Ajustes
                        </span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar empresas, RFQs..." 
                                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64 md:w-96 transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:shadow-lg transition-all">
                            JD
                        </div>
                    </div>
                </header>

                {/* Dashboard Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Bienvenido a la Demo de JairoCRM</h1>
                            <p className="text-gray-500 mt-1">Así es como tu equipo gestionará las oportunidades B2B.</p>
                        </div>
                        <div className="hidden sm:flex gap-3">
                            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-all">
                                Exportar Datos
                            </button>
                            <Link href="/registro" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 shadow-md shadow-primary/20 transition-all flex items-center gap-2">
                                Crear mi Cuenta Real <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            { label: "Oportunidades Activas", value: "24", change: "+12%", up: true, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
                            { label: "Cotizaciones (RFQ) Abiertas", value: "8", change: "+3%", up: true, icon: FileText, color: "text-primary", bg: "bg-primary-50" },
                            { label: "Tasa de Cierre", value: "68%", change: "+5.4%", up: true, icon: PieChart, color: "text-secondary", bg: "bg-secondary-50" },
                            { label: "Valor del Pipeline", value: "$142,500", change: "-2%", up: false, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                                        <stat.icon size={20} className={stat.color} />
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-medium ${stat.up ? 'text-green-600' : 'text-red-600'}`}>
                                        {stat.up ? '+' : ''}{stat.change}
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                                <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Pipeline CRM - Kanban Style preview */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-900">Pipeline B2B Reciente</h2>
                                <button className="text-sm text-primary font-medium hover:underline flex items-center">
                                    Ver Kanban <ChevronRight size={16} />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {[
                                    { company: "Logística del Norte S.A.", desc: "Provisión de 50 uniformes industriales", amount: "$4,500", status: "Negociación", color: "bg-blue-100 text-blue-700" },
                                    { company: "Constructora Apex", desc: "Materiales de seguridad (RFQ-1029)", amount: "$12,800", status: "Cotizado", color: "bg-yellow-100 text-yellow-700" },
                                    { company: "TechHub Solutions", desc: "Mobiliario de oficina corporativa", amount: "$8,250", status: "Cerrado Ganado", color: "bg-green-100 text-green-700" },
                                    { company: "Alimentos Frescos SRL", desc: "Empaques biodegradables", amount: "$3,100", status: "Nuevo Lead", color: "bg-gray-100 text-gray-700" },
                                ].map((deal, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold border border-gray-200 group-hover:bg-primary-50 group-hover:text-primary group-hover:border-primary/20 transition-colors">
                                                {deal.company.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 text-sm">{deal.company}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">{deal.desc}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="font-bold text-gray-900">{deal.amount}</span>
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${deal.color}`}>
                                                {deal.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Matchmaker (Insforge preview) */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 shadow-lg p-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
                            
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <Zap size={20} className="text-primary-300" />
                                </div>
                                <h2 className="text-lg font-bold">Motor IA (Insforge)</h2>
                            </div>

                            <p className="text-gray-400 text-sm mb-6">
                                Nuestra IA analiza tu catálogo y detecta oportunidades B2B automáticamente en tiempo real.
                            </p>

                            <div className="space-y-4 relative z-10">
                                {[
                                    { match: "Supermercados El Rey", reason: "Busca proveedores de empaques en tu región.", score: "98%" },
                                    { match: "Hotel Paraíso", reason: "Su inventario de blancos coincide con tu stock.", score: "85%" },
                                ].map((ai, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-sm">{ai.match}</h4>
                                            <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">Match {ai.score}</span>
                                        </div>
                                        <p className="text-xs text-gray-400">{ai.reason}</p>
                                        <button className="mt-3 w-full py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors">
                                            Contactar ahora
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/10">
                                <Link href="/registro" className="block w-full py-2.5 bg-primary hover:bg-primary-600 text-center rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(27,127,60,0.4)] transition-all">
                                    Activar IA en mi Empresa
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
