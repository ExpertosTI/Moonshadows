"use client";

import Link from "next/link";
import { Building2, Network, Search, ArrowRight, ChevronRight, Star, Shield, Zap, Globe, TrendingUp, Package, Eye, PlayCircle, BarChart3, Users } from "lucide-react";
import { useState, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  company_name: string;
  views: number;
}

export default function Home() {
  const [stats, setStats] = useState([
    { value: "500+", label: "Empresas B2B" },
    { value: "$2M+", label: "en Cotizaciones Mensuales" },
    { value: "48h", label: "Tiempo Promedio de Cierre" },
    { value: "98%", label: "Satisfacción de Clientes" },
  ]);
  const [busqueda, setBusqueda] = useState("");
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const statsRes = await fetch(`${apiUrl}/analytics/public-stats`);
        if (statsRes.ok) {
          const data = await statsRes.json();
          // Solo actualizamos si hay datos reales, si no, usamos los de marketing
          if (data.totalEmpresas > 100) {
              setStats([
                { value: `${data.totalEmpresas || 0}+`, label: "Empresas Activas" },
                { value: `${data.totalSectores || 12}`, label: "Sectores" },
                { value: `${data.totalConexiones || 0}+`, label: "Conexiones B2B" },
                { value: "98%", label: "Satisfacción" },
              ]);
          }
        }

        const productsRes = await fetch(`${apiUrl}/products?page=1`);
        if (productsRes.ok) {
          const data = await productsRes.json();
          setLatestProducts((data.data || []).slice(0, 4));
        }
      } catch (e) {
        console.log("Usando datos de marketing estáticos");
      }
    };
    cargarDatos();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (busqueda.trim()) {
      window.location.href = `/directorio?busqueda=${encodeURIComponent(busqueda)}`;
    }
  };

  return (
    <div className="min-h-screen bg-white selection:bg-primary/20">
      {/* Hero Section - Networking & Alliances Style */}
      <section className="pt-20 pb-24 bg-[#0F1419] text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#C5A059] rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Star className="text-[#C5A059]" size={16} />
            <span className="text-white/90 text-[10px] tracking-[0.2em] uppercase font-bold">Networking & Alianzas Exclusivas</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-8 tracking-tight">
            Genera conexiones reales. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] to-primary">
              Construye Alianzas Estratégicas.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto font-light">
            JairoApp es el entorno privado donde convergen empresarios con visión de crecimiento. Porque las mejores oportunidades no se anuncian, <strong className="text-white font-bold">se descubren en la mesa correcta.</strong>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/registro" className="bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(27,127,60,0.4)] hover:shadow-[0_0_30px_rgba(27,127,60,0.6)] flex items-center gap-2 w-full sm:w-auto justify-center uppercase tracking-wider text-sm">
              Solicitar Acceso <ArrowRight size={20} />
            </Link>
            <Link href="/directorio" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2 w-full sm:w-auto justify-center backdrop-blur-sm uppercase tracking-wider text-sm">
              <Network size={20} /> Explorar Directorio
            </Link>
          </div>

          {/* SaaS Dashboard Preview Image/Mockup */}
          <div className="relative mx-auto max-w-5xl group">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1419] via-transparent to-transparent z-10 h-full w-full pointer-events-none"></div>
            <div className="rounded-t-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-2xl p-2 relative">
                <div className="flex gap-2 items-center px-4 py-2 bg-black/40 rounded-t-xl border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                {/* Mockup Content representing the CRM */}
                <div className="bg-gray-50 h-[400px] w-full rounded-b-xl flex border border-gray-200">
                    <div className="w-48 bg-white border-r border-gray-200 p-4 hidden md:block">
                        <div className="h-4 w-24 bg-gray-200 rounded mb-6"></div>
                        <div className="space-y-3">
                            <div className="h-8 bg-primary/10 rounded"></div>
                            <div className="h-8 bg-gray-100 rounded"></div>
                            <div className="h-8 bg-gray-100 rounded"></div>
                        </div>
                    </div>
                    <div className="flex-1 p-6">
                        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="h-24 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="h-4 w-16 bg-gray-100 rounded mb-2"></div>
                                <div className="h-8 w-24 bg-primary/20 rounded"></div>
                            </div>
                            <div className="h-24 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="h-4 w-16 bg-gray-100 rounded mb-2"></div>
                                <div className="h-8 w-24 bg-secondary/20 rounded"></div>
                            </div>
                            <div className="h-24 bg-white border border-gray-200 rounded-xl p-4 shadow-sm hidden md:block"></div>
                        </div>
                        <div className="h-48 bg-white border border-gray-200 rounded-xl shadow-sm"></div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-10 border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8">Confiado por empresas líderes en la región</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">
            {stats.map((stat, i) => (
              <div key={i} className="text-center px-4">
                <p className="text-4xl font-black text-gray-900 mb-2">{stat.value}</p>
                <p className="text-gray-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights - The "Why" */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-gray-900 mb-6">
              Despídete del Excel y los correos perdidos
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              JairoApp estructura tu proceso de ventas y compras B2B en un flujo de trabajo moderno y automatizado.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Package size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Catálogos Inteligentes</h3>
              <p className="text-gray-600 leading-relaxed">
                Muestra tus productos a miles de compradores potenciales. Actualiza precios e inventario en tiempo real, sin enviar PDFs pesados.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-shadow border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-secondary/10 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Popular</span>
              </div>
              <div className="w-16 h-16 bg-primary-50 text-primary rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Cotizaciones (RFQ) Ágiles</h3>
              <p className="text-gray-600 leading-relaxed">
                ¿Necesitas insumos? Lanza un RFQ y recibe múltiples cotizaciones de proveedores verificados en minutos. Compara y aprueba con un clic.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">CRM Integrado</h3>
              <p className="text-gray-600 leading-relaxed">
                Visualiza el estado de todas tus negociaciones en un tablero Kanban. Mantén el historial de mensajes y acuerdos con cada empresa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Insforge AI Integration Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 text-secondary font-bold mb-4 uppercase tracking-wider text-sm">
              <Zap size={20} /> Exclusivo con Insforge AI
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
              La Inteligencia Artificial que encuentra clientes por ti.
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Nuestro motor de IA analiza tu catálogo y los requerimientos del mercado en tiempo real. Cuando una empresa busca lo que tú vendes, <strong className="text-gray-900">el sistema te alerta instantáneamente.</strong>
            </p>
            <ul className="space-y-5 mb-10">
              {[
                "Matching predictivo B2B basado en comportamiento.",
                "Análisis semántico de cotizaciones (RFQ).",
                "Scoring automático de oportunidades de venta."
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">✓</div>
                  <span className="text-gray-700 text-lg">{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/demo" className="text-primary font-bold text-lg hover:text-primary-600 flex items-center gap-2 hover:gap-4 transition-all">
              Ver cómo funciona la IA <ArrowRight />
            </Link>
          </div>
          <div className="flex-1 w-full max-w-lg lg:max-w-none relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-[40px] blur-3xl"></div>
            <div className="relative bg-[#1A1D24] border border-gray-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                <span className="text-white font-bold flex items-center gap-2"><Zap className="text-secondary" size={18}/> Insforge Radar</span>
                <span className="text-green-400 text-xs font-mono bg-green-400/10 px-2 py-1 rounded">ACTIVO</span>
              </div>
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 font-semibold">Alimentos del Valle S.A.</span>
                    <span className="text-green-400 font-bold">98% Match</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-3">Busca proveedor de empaques en tu región.</p>
                  <button className="w-full bg-primary text-white text-xs py-2 rounded-lg font-bold">Enviar Propuesta Automática</button>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 opacity-50">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 font-semibold">Constructora Nova</span>
                    <span className="text-green-400 font-bold">82% Match</span>
                  </div>
                  <p className="text-gray-400 text-xs">Alineación de catálogo con RFQ-1049.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Products Showcase */}
      {latestProducts.length > 0 && (
        <section className="py-24 bg-gray-50 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                  Mercado B2B Activo
                </h2>
                <p className="text-lg text-gray-600">Explora una muestra de los miles de productos disponibles en nuestra red de empresas verificadas.</p>
              </div>
              <Link href="/directorio" className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors whitespace-nowrap">
                Ver Catálogo Completo
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {latestProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all group">
                  <div className="h-48 bg-gray-100 relative flex items-center justify-center overflow-hidden">
                    {product.images && product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Package className="text-gray-300" size={48} />
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md text-gray-700">
                      B2B
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 truncate text-lg group-hover:text-primary transition-colors">{product.name}</h3>
                    <p className="text-sm text-gray-500 truncate mt-1 flex items-center gap-1">
                      <Building2 size={14} /> {product.company_name}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xl font-black text-primary">
                        {product.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.price) : 'Cotizar'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-[#0F1419] to-[#1A1D24] text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Digitaliza tu canal B2B <span className="text-secondary">hoy mismo</span>.
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Únete a la plataforma que está revolucionando la forma en que las empresas latinoamericanas compran y venden.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro" className="bg-primary hover:bg-primary-600 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all shadow-[0_0_20px_rgba(27,127,60,0.4)] flex items-center justify-center gap-2">
              Crear Cuenta de Empresa <ArrowRight />
            </Link>
            <Link href="/demo" className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-10 py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center">
              Agendar Demostración
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">Sin tarjeta de crédito requerida. Configuración en 5 minutos.</p>
        </div>
      </section>
    </div>
  );
}

