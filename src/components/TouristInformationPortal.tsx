import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, User as UserIcon, Eye, ArrowRight, 
  X, Search, Filter, Sparkles, BookOpen, Share2, Check, ExternalLink, 
  Scale, Clock, ShieldCheck, FileCheck, Building2, MapPin, Compass, 
  Train, Utensils, Mountain, Shield, Info, ArrowUpRight, RefreshCw
} from 'lucide-react';
import { TouristNews, LanguageCode, getLocalizedNews } from '../types';
import { getNews, seedDefaultNews, initPublicNewsListener, formatPublicationDate, parsePublicationDate, sortNewsList } from '../db';
import { NewsIllustration } from './NewsIllustration';

interface TouristInformationPortalProps {
  currentLanguage: LanguageCode;
  onSelectNews?: (news: TouristNews) => void;
}

export const TouristInformationPortal: React.FC<TouristInformationPortalProps> = ({ 
  currentLanguage 
}) => {
  const [news, setNews] = useState<TouristNews[]>(() => getNews());

  const [activeArticle, setActiveArticle] = useState<TouristNews | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'featured' | 'archive' | 'guide'>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync news on mount & subscribe to real-time events
  useEffect(() => {
    initPublicNewsListener();
    setNews(getNews());
    const handleSync = () => {
      setNews(getNews());
    };
    window.addEventListener('db-sync', handleSync);
    return () => window.removeEventListener('db-sync', handleSync);
  }, []);

  // Keyboard shortcut (Escape to close modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveArticle(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sort news so the latest published news is always first with deterministic creation timestamp tiebreaker
  const sortedNews = sortNewsList(news);

  // Main featured hero story: newest featured article, or the newest article overall
  const featuredArticle = sortedNews.find(n => n.isFeatured) || sortedNews[0];
  
  // Previous/other news for carousel (all other stories)
  const carouselNews = sortedNews.filter(n => n.id !== featuredArticle?.id);

  // Archive filtered news
  const categories = ['all', ...Array.from(new Set(news.map(n => getLocalizedNews(n, currentLanguage).category || n.category || 'General')))];
  
  const filteredArchiveNews = sortedNews.filter(item => {
    const loc = getLocalizedNews(item, currentLanguage);
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory || loc.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = q === '' || 
      loc.title.toLowerCase().includes(q) ||
      (loc.summary && loc.summary.toLowerCase().includes(q)) ||
      loc.body.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // Carousel navigation
  const itemsPerPage = 2; // desktop displays 2 per page, mobile 1
  const maxCarouselIndex = Math.max(0, carouselNews.length - 1);

  const nextCarousel = () => {
    setCarouselIndex(prev => (prev >= carouselNews.length - itemsPerPage ? 0 : prev + 1));
  };

  const prevCarousel = () => {
    setCarouselIndex(prev => (prev <= 0 ? Math.max(0, carouselNews.length - itemsPerPage) : prev - 1));
  };

  const handleCopyLink = (newsItem: TouristNews) => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedId(newsItem.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openArticle = (article: TouristNews) => {
    setActiveArticle(article);
  };

  // Navigating through articles inside modal
  const navigateArticle = (direction: 'prev' | 'next') => {
    if (!activeArticle) return;
    const currentIndex = news.findIndex(n => n.id === activeArticle.id);
    if (currentIndex === -1) return;
    
    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % news.length;
    } else {
      nextIndex = (currentIndex - 1 + news.length) % news.length;
    }
    setActiveArticle(news[nextIndex]);
  };

  return (
    <div id="tourist-information-portal" className="space-y-6 w-full font-sans">
      
      {/* 1. Header with Operator Badge & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2B3232] pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7A9A3C]/35 bg-[#7A9A3C]/10 px-3.5 py-1 text-xs text-[#90B24A]">
            <Building2 className="h-3.5 w-3.5" />
            <span>Jules Verne Hostel • {currentLanguage === 'ru' ? 'Официальный информационный портал e-mehmon' : 'Official e-mehmon Information Portal'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center flex-wrap gap-2">
            <span>{currentLanguage === 'ru' ? 'Информационный портал туризма' : 'Uzbekistan Tourism Portal'}</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-[#23292A] text-[#90B24A] border border-[#3E4747]">
              {news.length} {currentLanguage === 'ru' ? 'статей' : 'articles'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7A9A3C]/15 text-[#90B24A] border border-[#7A9A3C]/30 font-semibold">
              {currentLanguage === 'ru' ? 'Сентябрь 2026' : currentLanguage === 'fr' ? 'Septembre 2026' : 'September 2026'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                const updated = getNews();
                setNews(updated);
                setTimeout(() => setIsRefreshing(false), 500);
              }}
              title={currentLanguage === 'ru' ? 'Обновить ленту новостей' : 'Refresh news feed'}
              className="p-1.5 rounded-lg bg-[#23292A] hover:bg-[#2B3232] text-gray-300 hover:text-[#90B24A] transition border border-[#3E4747] cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#90B24A]' : ''}`} />
            </button>
          </h2>
        </div>

        {/* Portal Tabs */}
        <div className="flex items-center gap-1.5 bg-[#171A1A] p-1 rounded-xl border border-[#2B3232] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('featured')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'featured'
                ? 'bg-[#7A9A3C] text-black shadow-md shadow-[#7A9A3C]/20'
                : 'text-gray-400 hover:text-white hover:bg-[#23292A]'
            }`}
          >
            {currentLanguage === 'ru' ? 'Главное и Карусель' : 'Featured & Stories'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'archive'
                ? 'bg-[#7A9A3C] text-black shadow-md shadow-[#7A9A3C]/20'
                : 'text-gray-400 hover:text-white hover:bg-[#23292A]'
            }`}
          >
            <BookOpen className="h-3 w-3" />
            <span>{currentLanguage === 'ru' ? `Все новости (${news.length})` : `All News (${news.length})`}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-[#7A9A3C] text-black shadow-md shadow-[#7A9A3C]/20'
                : 'text-gray-400 hover:text-white hover:bg-[#23292A]'
            }`}
          >
            <Scale className="h-3 w-3" />
            <span>{currentLanguage === 'ru' ? 'Правила e-mehmon' : 'Legal Rules'}</span>
          </button>
        </div>
      </div>

      {/* 2. TAB: FEATURED MAIN NEWS + CAROUSEL */}
      {activeTab === 'featured' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* A. ГЛАВНАЯ НОВОСТЬ С ИЛЛЮСТРАЦИЕЙ В ВИДЕ ИНФОГРАФИКИ */}
          {featuredArticle && (() => {
            const featLoc = getLocalizedNews(featuredArticle, currentLanguage);
            return (
              <div 
                id="card-featured-hero-news"
                onClick={() => openArticle(featuredArticle)}
                className="group relative rounded-2xl border-2 border-[#7A9A3C]/60 bg-gradient-to-b from-[#1E2519] via-[#161C12] to-[#0F140D] overflow-hidden shadow-2xl hover:border-[#90B24A] transition-all duration-300 cursor-pointer"
              >
                {/* Top Infographic Accent Ribbon */}
                <div className="bg-gradient-to-r from-[#7A9A3C] via-[#90B24A] to-[#7A9A3C] text-black px-4 py-1.5 text-xs font-extrabold tracking-wider uppercase flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 fill-black" />
                    <span>{currentLanguage === 'ru' ? 'Главная новость • Официальная инфографика' : currentLanguage === 'fr' ? 'À la une • Infographie officielle' : 'Hero Story • Official Infographic'}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-black/20 px-2 py-0.5 rounded">
                    {featLoc.category || (currentLanguage === 'ru' ? 'Законодательство РУз' : 'Legislation')}
                  </span>
                </div>

                {/* Infographic Visual Hero Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  
                  {/* Left: Illustration with Infographic Visual Overlay (7 cols) */}
                  <div className="lg:col-span-7 relative h-64 sm:h-72 lg:h-80 overflow-hidden bg-[#111414]">
                    <NewsIllustration
                      src={featuredArticle.illustration}
                      alt={featLoc.title}
                      category={featLoc.category || featuredArticle.category}
                      priority={true}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F140D] via-[#0F140D]/40 to-transparent" />
                    
                    {/* Visual Infographic Overlay Overlay Card */}
                    {featuredArticle.id === 'news-infographic-emehmon-2026' ? (
                      <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/80 backdrop-blur-md border border-[#7A9A3C]/50 p-3 shadow-xl">
                        <div className="text-[10px] uppercase font-mono tracking-wider text-[#90B24A] font-bold mb-1.5 flex items-center justify-between">
                          <span>{currentLanguage === 'ru' ? 'ИНФОГРАФИКА: РЕГЛАМЕНТ E-MEHMON' : currentLanguage === 'fr' ? 'INFOGRAPHIE : PROCÉDURE E-MEHMON' : 'INFOGRAPHIC: E-MEHMON WORKFLOW'}</span>
                          <span className="text-white">ПКМ № 433</span>
                        </div>
                        
                        {/* 4-Step Infographic Diagram */}
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          <div className="bg-[#1C2615] rounded-lg p-1.5 border border-[#7A9A3C]/40">
                            <span className="block text-[11px] font-bold text-white">{currentLanguage === 'ru' ? 'Въезд' : currentLanguage === 'fr' ? 'Entrée' : 'Entry'}</span>
                            <span className="block text-[9px] text-[#9AA1A0]">{currentLanguage === 'ru' ? 'Штамп КПП' : currentLanguage === 'fr' ? 'Tampon frontière' : 'Border stamp'}</span>
                          </div>
                          <div className="bg-[#1C2615] rounded-lg p-1.5 border border-[#7A9A3C]/40">
                            <span className="block text-[11px] font-bold text-[#90B24A]">{currentLanguage === 'ru' ? '3 дня' : currentLanguage === 'fr' ? '3 jours' : '3 days'}</span>
                            <span className="block text-[9px] text-[#9AA1A0]">{currentLanguage === 'ru' ? 'Без воскресений' : currentLanguage === 'fr' ? 'Jours ouvrables' : 'Business days'}</span>
                          </div>
                          <div className="bg-[#1C2615] rounded-lg p-1.5 border border-[#7A9A3C]/40">
                            <span className="block text-[11px] font-bold text-white">QR-код</span>
                            <span className="block text-[9px] text-[#9AA1A0]">{currentLanguage === 'ru' ? 'В смартфоне' : currentLanguage === 'fr' ? 'Sur mobile' : 'On mobile'}</span>
                          </div>
                          <div className="bg-[#1C2615] rounded-lg p-1.5 border border-[#7A9A3C]/40">
                            <span className="block text-[11px] font-bold text-[#90B24A]">{currentLanguage === 'ru' ? '0 штрафов' : currentLanguage === 'fr' ? '0 amende' : '0 fines'}</span>
                            <span className="block text-[9px] text-[#9AA1A0]">Ст. 224 КоАП</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/80 backdrop-blur-md border border-[#7A9A3C]/50 p-3 shadow-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#90B24A] text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {currentLanguage === 'ru' ? 'НОВОСТЬ' : currentLanguage === 'fr' ? 'ACTUALITÉ' : 'NEWS'}
                          </span>
                          <span className="text-xs text-white font-bold">{featLoc.category}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#9AA1A0]">{formatPublicationDate(featuredArticle.publishedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Article Details & Key Metrics (5 cols) */}
                  <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs text-[#9AA1A0] font-mono">
                        <span className="flex items-center gap-1 text-[#90B24A]">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatPublicationDate(featuredArticle.publishedAt)}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{featuredArticle.viewsCount?.toLocaleString()}</span>
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-extrabold text-white group-hover:text-[#90B24A] transition-colors leading-snug">
                        {featLoc.title}
                      </h3>

                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                        {featLoc.summary || featLoc.body}
                      </p>

                      {/* Key Highlights Badges */}
                      {featuredArticle.id === 'news-infographic-emehmon-2026' ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="p-2 rounded-xl bg-[#171A1A] border border-[#2B3232]">
                            <span className="text-[10px] text-gray-400 block">{currentLanguage === 'ru' ? 'Безвизовых стран' : currentLanguage === 'fr' ? 'Pays sans visa' : 'Visa-free nations'}</span>
                            <span className="text-sm font-bold text-[#90B24A] font-mono">{currentLanguage === 'ru' ? '95+ стран' : currentLanguage === 'fr' ? '95+ pays' : '95+ nations'}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-[#171A1A] border border-[#2B3232]">
                            <span className="text-[10px] text-gray-400 block">{currentLanguage === 'ru' ? 'Срок оформления' : currentLanguage === 'fr' ? 'Délai d\'émission' : 'Processing time'}</span>
                            <span className="text-sm font-bold text-white font-mono">{currentLanguage === 'ru' ? '30-60 мин' : '30-60 min'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="p-2 rounded-xl bg-[#171A1A] border border-[#2B3232]">
                            <span className="text-[10px] text-gray-400 block">{currentLanguage === 'ru' ? 'Категория' : currentLanguage === 'fr' ? 'Catégorie' : 'Category'}</span>
                            <span className="text-xs font-bold text-[#90B24A] truncate block">{featLoc.category}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-[#171A1A] border border-[#2B3232]">
                            <span className="text-[10px] text-gray-400 block">{currentLanguage === 'ru' ? 'Автор / Источник' : currentLanguage === 'fr' ? 'Auteur / Source' : 'Author'}</span>
                            <span className="text-xs font-bold text-white truncate block">{featuredArticle.author || 'RegistApp'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Read Article Button */}
                    <div className="pt-2">
                      <div className="inline-flex items-center justify-between w-full rounded-xl bg-[#7A9A3C]/20 border border-[#7A9A3C]/40 px-4 py-2.5 text-xs font-bold text-[#90B24A] group-hover:bg-[#7A9A3C] group-hover:text-black transition duration-200">
                        <span>{currentLanguage === 'ru' ? 'Читать полностью и открыть инфографику' : currentLanguage === 'fr' ? 'Lire l\'article et voir l\'infographie' : 'Read Full Article & Infographic'}</span>
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* B. КАРУСЕЛЬ ИЗ ПРОШЛЫХ НОВОСТЕЙ */}
          <div id="section-news-carousel" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Compass className="h-4 w-4 text-[#90B24A]" />
                  <span>{currentLanguage === 'ru' ? 'Лента новостей и события туризма' : currentLanguage === 'fr' ? 'Actualités et événements touristiques' : 'Tourism News & Events Feed'}</span>
                </h3>
                <p className="text-xs text-[#9AA1A0] mt-0.5">
                  {currentLanguage === 'ru' 
                    ? 'Новые услуги для туристов, достопримечательности и инфраструктура в Узбекистане' 
                    : currentLanguage === 'fr'
                    ? 'Nouveaux services touristiques, sites et infrastructures en Ouzbékistan'
                    : 'New tourist services, sights and infrastructure across Uzbekistan'}
                </p>
              </div>

              {/* Carousel Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-carousel-prev"
                  onClick={prevCarousel}
                  className="p-2 rounded-xl bg-[#171A1A] border border-[#2B3232] text-gray-300 hover:text-white hover:border-[#7A9A3C] transition"
                  title={currentLanguage === 'ru' ? 'Предыдущие новости' : currentLanguage === 'fr' ? 'Précédent' : 'Previous'}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  id="btn-carousel-next"
                  onClick={nextCarousel}
                  className="p-2 rounded-xl bg-[#171A1A] border border-[#2B3232] text-gray-300 hover:text-white hover:border-[#7A9A3C] transition"
                  title={currentLanguage === 'ru' ? 'Следующие новости' : currentLanguage === 'fr' ? 'Suivant' : 'Next'}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Carousel Cards View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {carouselNews.slice(carouselIndex, carouselIndex + 2).map((item) => {
                const loc = getLocalizedNews(item, currentLanguage);
                return (
                  <div
                    key={item.id}
                    id={`card-news-carousel-${item.id}`}
                    onClick={() => openArticle(item)}
                    className="group rounded-2xl border border-[#2B3232] bg-[#171A1A] overflow-hidden hover:border-[#7A9A3C]/70 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-2xl"
                  >
                    <div>
                      {/* Image with Tag */}
                      <div className="h-40 w-full relative overflow-hidden bg-[#111414]">
                        <NewsIllustration
                          src={item.illustration}
                          alt={loc.title}
                          category={loc.category || item.category}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#171A1A] via-transparent to-black/30" />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-black/80 backdrop-blur-md text-[#90B24A] border border-[#7A9A3C]/40 px-2.5 py-0.5 rounded-full">
                            {loc.category || (currentLanguage === 'ru' ? 'Туризм' : 'Tourism')}
                          </span>
                        </div>
                        <div className="absolute bottom-2 right-2.5 text-[10px] font-mono text-gray-300 bg-black/70 px-2 py-0.5 rounded backdrop-blur-sm">
                          {formatPublicationDate(item.publishedAt)}
                        </div>
                      </div>

                      {/* Body Preview */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                          <UserIcon className="h-3 w-3 text-[#90B24A]" />
                          <span>{item.author || 'RegistApp'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{item.viewsCount || 120}</span>
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#90B24A] transition-colors leading-snug line-clamp-2">
                          {loc.title}
                        </h4>

                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {loc.summary || loc.body}
                        </p>
                      </div>
                    </div>

                    {/* Card Action Link */}
                    <div className="p-3 border-t border-[#2B3232] bg-[#111414] flex items-center justify-between text-xs font-semibold text-[#90B24A]">
                      <span>{currentLanguage === 'ru' ? 'Читать новость полностью' : currentLanguage === 'fr' ? 'Lire l\'article complet' : 'Read Full Story'}</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carousel Dots Indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {Array.from({ length: Math.ceil(carouselNews.length / 2) }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCarouselIndex(idx * 2)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    Math.floor(carouselIndex / 2) === idx 
                      ? 'w-6 bg-[#7A9A3C]' 
                      : 'w-2 bg-[#2B3232] hover:bg-[#3E4747]'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: ARCHIVE OF ALL NEWS (10 ARTICLES) */}
      {activeTab === 'archive' && (
        <div id="section-news-archive-view" className="space-y-4 animate-fade-in">
          
          {/* Search & Category Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-[#171A1A] border border-[#2B3232] space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                id="input-archive-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={currentLanguage === 'ru' ? 'Поиск новостей, достопримечательностей и правил...' : 'Search articles, sights, services...'}
                className="w-full rounded-xl border border-[#2B3232] bg-[#0E1010] pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7A9A3C] transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-gray-400 font-mono mr-1">
                {currentLanguage === 'ru' ? 'Рубрика:' : 'Category:'}
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    selectedCategory === cat
                      ? 'bg-[#7A9A3C] text-black border-[#7A9A3C] font-bold'
                      : 'bg-[#111414] text-gray-400 border-[#2B3232] hover:border-[#3E4747] hover:text-white'
                  }`}
                >
                  {cat === 'all' ? (currentLanguage === 'ru' ? `Все (${news.length})` : currentLanguage === 'fr' ? `Tous (${news.length})` : `All (${news.length})`) : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Archive Grid (Cards that open on click) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredArchiveNews.length === 0 ? (
              <div className="col-span-2 text-center py-10 text-gray-500 bg-[#171A1A] rounded-2xl border border-[#2B3232]">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p className="text-xs">{currentLanguage === 'ru' ? 'Новости по заданным критериям не найдены.' : currentLanguage === 'fr' ? 'Aucun article trouvé selon vos critères.' : 'No articles found matching criteria.'}</p>
              </div>
            ) : (
              filteredArchiveNews.map((item) => {
                const loc = getLocalizedNews(item, currentLanguage);
                return (
                  <div
                    key={item.id}
                    id={`card-archive-item-${item.id}`}
                    onClick={() => openArticle(item)}
                    className="group flex gap-3 p-3 rounded-xl border border-[#2B3232] bg-[#171A1A] hover:border-[#7A9A3C] hover:bg-[#1C2222] transition-all cursor-pointer shadow-md"
                  >
                    {/* Thumbnail */}
                    <div className="h-20 w-24 sm:h-24 sm:w-28 rounded-lg overflow-hidden shrink-0 bg-[#0E1010] relative">
                      <NewsIllustration
                        src={item.illustration}
                        alt={loc.title}
                        category={loc.category || item.category}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mb-1">
                          <span className="text-[#90B24A] font-semibold">{loc.category}</span>
                          <span>•</span>
                          <span>{formatPublicationDate(item.publishedAt)}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white group-hover:text-[#90B24A] transition-colors line-clamp-2 leading-snug">
                          {loc.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-gray-400 line-clamp-1">{item.author}</span>
                        <span className="text-[10px] text-[#90B24A] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          {currentLanguage === 'ru' ? 'Читать' : currentLanguage === 'fr' ? 'Lire' : 'Read'} →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. TAB: LEGAL RULES & 4 STEPS (Keeps compliance cards easily accessible) */}
      {activeTab === 'guide' && (
        <div id="section-legal-rules-guide" className="space-y-4 animate-fade-in">
          {/* 4 Crucial Pillars Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-[#2B3232] bg-[#171A1A] p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#90B24A]">
                <Clock className="h-4 w-4 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {currentLanguage === 'ru' ? 'Правило 3 рабочих дней' : currentLanguage === 'fr' ? 'Règle des 3 jours ouvrables' : '3 Business Days Rule'}
                </h4>
              </div>
              <p className="text-xs text-[#9AA1A0] leading-relaxed">
                {currentLanguage === 'ru'
                  ? 'ПКМ РУз № 433: регистрация оформляется в течение 3 рабочих дней со дня, следующего за въездом. Воскресенье и праздники не учитываются.'
                  : currentLanguage === 'fr'
                  ? 'Résolution n° 433 : l\'enregistrement doit être effectué dans les 3 jours ouvrables suivant l\'entrée. Dimanches et jours fériés exclus.'
                  : 'Resolution No. 433: Tourists must register within 3 business days of arrival. Sundays and holidays excluded.'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#2B3232] bg-[#171A1A] p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#90B24A]">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {currentLanguage === 'ru' ? 'Защита от ст. 224 КоАП' : currentLanguage === 'fr' ? 'Protection Art. 224' : 'Avoid Article 224 Penalties'}
                </h4>
              </div>
              <p className="text-xs text-[#9AA1A0] leading-relaxed">
                {currentLanguage === 'ru'
                  ? 'Исключает штрафы от 5 до 20 БРВ и обеспечивает беспрепятственный вылет через аэропорты Ташкента и Самарканда.'
                  : currentLanguage === 'fr'
                  ? 'Évite les sanctions migratoires lourdes (5 à 20 BCA) et garantit un départ fluide depuis les aéroports.'
                  : 'Avoids heavy migration penalties (5 to 20 BCA) and guarantees smooth departure from airports.'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#2B3232] bg-[#171A1A] p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#90B24A]">
                <FileCheck className="h-4 w-4 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {currentLanguage === 'ru' ? 'QR-справка e-mehmon' : currentLanguage === 'fr' ? 'Certificat QR e-mehmon' : 'e-mehmon QR Certificate'}
                </h4>
              </div>
              <p className="text-xs text-[#9AA1A0] leading-relaxed">
                {currentLanguage === 'ru'
                  ? 'Электронный документ с QR-кодом моментально проверяется сканерами погранслужбы прямо с экрана телефона.'
                  : currentLanguage === 'fr'
                  ? 'Document officiel avec QR code vérifié directement par les scanners de la police aux frontières.'
                  : 'Official electronic certificate with QR code recognized instantly by border control scanners.'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#2B3232] bg-[#171A1A] p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#90B24A]">
                <Scale className="h-4 w-4 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {currentLanguage === 'ru' ? 'Фиксированные тарифы' : currentLanguage === 'fr' ? 'Tarifs officiels' : 'Fixed Daily Tariffs'}
                </h4>
              </div>
              <p className="text-xs text-[#9AA1A0] leading-relaxed">
                {currentLanguage === 'ru'
                  ? '70 000 UZS / 500 RUB / 5 USD / 5 EUR за сутки. Оплата переводом на банковскую карту.'
                  : currentLanguage === 'fr'
                  ? '70 000 UZS / 500 RUB / 5 USD / 5 EUR par jour. Paiement par carte bancaire.'
                  : 'Standard rate: 70,000 UZS / 500 RUB / $5 USD / €5 EUR per day. Pay with credit/debit card.'}
              </p>
            </div>
          </div>

          {/* 4 Process Steps */}
          <div className="rounded-2xl border border-[#2B3232] bg-[#171A1A] p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#90B24A]" />
              <span>{currentLanguage === 'ru' ? 'Порядок оформления (4 шага):' : currentLanguage === 'fr' ? 'Procédure en 4 étapes :' : 'How to register (4 simple steps):'}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2 rounded-xl bg-[#111414] border border-[#2B3232]">
                <div className="font-mono text-[#90B24A] font-bold text-xs mb-0.5">01</div>
                <div className="text-white font-medium text-xs">{currentLanguage === 'ru' ? 'Вход / Заявка' : currentLanguage === 'fr' ? 'Connexion' : 'Login / Form'}</div>
                <div className="text-[10px] text-[#9AA1A0] mt-0.5">{currentLanguage === 'ru' ? 'Блок справа' : currentLanguage === 'fr' ? 'Panneau droit' : 'Right panel'}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#111414] border border-[#2B3232]">
                <div className="font-mono text-[#90B24A] font-bold text-xs mb-0.5">02</div>
                <div className="text-white font-medium text-xs">{currentLanguage === 'ru' ? 'Фото паспорта' : currentLanguage === 'fr' ? 'Photo passeport' : 'Passport photo'}</div>
                <div className="text-[10px] text-[#9AA1A0] mt-0.5">{currentLanguage === 'ru' ? 'Разворот и штамп' : currentLanguage === 'fr' ? 'Page et tampon' : 'Page & stamp'}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#111414] border border-[#2B3232]">
                <div className="font-mono text-[#90B24A] font-bold text-xs mb-0.5">03</div>
                <div className="text-white font-medium text-xs">{currentLanguage === 'ru' ? 'Оплата' : currentLanguage === 'fr' ? 'Paiement' : 'Payment'}</div>
                <div className="text-[10px] text-[#9AA1A0] mt-0.5">{currentLanguage === 'ru' ? 'Карта РУз / РФ' : currentLanguage === 'fr' ? 'Carte bancaire' : 'Bank card'}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#111414] border border-[#2B3232]">
                <div className="font-mono text-[#90B24A] font-bold text-xs mb-0.5">04</div>
                <div className="text-white font-medium text-xs">{currentLanguage === 'ru' ? 'QR-сертификат' : currentLanguage === 'fr' ? 'Certificat QR' : 'QR Certificate'}</div>
                <div className="text-[10px] text-[#9AA1A0] mt-0.5">30-60 min</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DIALOG: EXPANDED ARTICLE VIEW (CLICKS OPEN HERE) */}
      {activeArticle && (() => {
        const activeLoc = getLocalizedNews(activeArticle, currentLanguage);
        return (
          <div 
            id="modal-article-detail"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setActiveArticle(null)}
          >
            <div 
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-[#7A9A3C] bg-[#141A14] text-white shadow-2xl p-5 sm:p-7 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header Controls */}
              <div className="flex items-center justify-between border-b border-[#2B3232] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#7A9A3C] text-black">
                    {activeLoc.category || (currentLanguage === 'ru' ? 'Туризм в Узбекистане' : 'Tourism')}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {formatPublicationDate(activeArticle.publishedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(activeArticle)}
                    className="p-1.5 rounded-lg bg-[#23292A] text-gray-300 hover:text-white hover:bg-[#2B3232] transition text-xs flex items-center gap-1"
                    title={currentLanguage === 'ru' ? 'Скопировать ссылку' : currentLanguage === 'fr' ? 'Copier le lien' : 'Copy link'}
                  >
                    {copiedId === activeArticle.id ? <Check className="h-4 w-4 text-[#90B24A]" /> : <Share2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    id="btn-close-article-modal"
                    onClick={() => setActiveArticle(null)}
                    className="p-1.5 rounded-lg bg-[#23292A] text-gray-300 hover:text-white hover:bg-red-900/50 transition"
                    title={currentLanguage === 'ru' ? 'Закрыть' : currentLanguage === 'fr' ? 'Fermer' : 'Close'}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Title */}
              <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-tight">
                {activeLoc.title}
              </h2>

              {/* Illustration */}
              <div className="relative rounded-2xl overflow-hidden h-56 sm:h-72 w-full bg-[#0E1010] border border-[#2B3232]">
                <NewsIllustration
                  src={activeArticle.illustration}
                  alt={activeLoc.title}
                  category={activeLoc.category || activeArticle.category}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-3 text-[11px] font-mono text-gray-300 bg-black/70 px-2.5 py-0.5 rounded backdrop-blur-md">
                  {currentLanguage === 'ru' ? 'Автор: ' : currentLanguage === 'fr' ? 'Auteur : ' : 'Author: '}{activeArticle.author || 'RegistApp'}
                </div>
              </div>

              {/* Infographic Callout if this is the featured infographic */}
              {activeArticle.id.includes('infographic') && (
                <div className="rounded-2xl border-2 border-[#7A9A3C]/50 bg-gradient-to-r from-[#1E2519] to-[#12160F] p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#90B24A] flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>{currentLanguage === 'ru' ? 'Пошаговая инфографика оформления' : currentLanguage === 'fr' ? 'Infographie étape par étape' : 'Step-by-step registration infographic'}</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-[#171A1A] p-2.5 rounded-xl border border-[#2B3232]">
                      <span className="block font-mono text-sm font-bold text-white">01</span>
                      <span className="font-semibold text-[#90B24A]">{currentLanguage === 'ru' ? 'Пересечение КПП' : currentLanguage === 'fr' ? 'Passage frontière' : 'Border crossing'}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{currentLanguage === 'ru' ? 'Въездной штамп' : currentLanguage === 'fr' ? 'Tampon d\'entrée' : 'Entry stamp'}</span>
                    </div>
                    <div className="bg-[#171A1A] p-2.5 rounded-xl border border-[#2B3232]">
                      <span className="block font-mono text-sm font-bold text-white">02</span>
                      <span className="font-semibold text-[#90B24A]">{currentLanguage === 'ru' ? '3 рабочих дня' : currentLanguage === 'fr' ? '3 jours ouvrés' : '3 working days'}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{currentLanguage === 'ru' ? 'Без воскресений' : currentLanguage === 'fr' ? 'Sans dimanche' : 'Excluding Sunday'}</span>
                    </div>
                    <div className="bg-[#171A1A] p-2.5 rounded-xl border border-[#2B3232]">
                      <span className="block font-mono text-sm font-bold text-white">03</span>
                      <span className="font-semibold text-[#90B24A]">{currentLanguage === 'ru' ? 'Онлайн RegistApp' : currentLanguage === 'fr' ? 'En ligne RegistApp' : 'Online RegistApp'}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{currentLanguage === 'ru' ? 'База e-mehmon' : currentLanguage === 'fr' ? 'Base e-mehmon' : 'e-mehmon DB'}</span>
                    </div>
                    <div className="bg-[#171A1A] p-2.5 rounded-xl border border-[#2B3232]">
                      <span className="block font-mono text-sm font-bold text-white">04</span>
                      <span className="font-semibold text-[#90B24A]">QR-код</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{currentLanguage === 'ru' ? 'В смартфоне 24/7' : currentLanguage === 'fr' ? 'Sur mobile 24/7' : 'On mobile 24/7'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Article Content Body */}
              <div className="space-y-4 text-xs sm:text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-line border-t border-[#2B3232] pt-4">
                {activeLoc.body}
              </div>

              {/* Footer Navigation within Modal */}
              <div className="flex items-center justify-between border-t border-[#2B3232] pt-4">
                <button
                  type="button"
                  onClick={() => navigateArticle('prev')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#23292A] hover:bg-[#2B3232] text-xs font-semibold text-gray-300 hover:text-white transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>{currentLanguage === 'ru' ? 'Предыдущая' : currentLanguage === 'fr' ? 'Précédente' : 'Previous'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  className="px-4 py-2 rounded-xl bg-[#7A9A3C] hover:bg-[#5E7A2A] text-black font-bold text-xs transition shadow-lg shadow-[#7A9A3C]/20"
                >
                  {currentLanguage === 'ru' ? 'Закрыть материал' : currentLanguage === 'fr' ? 'Fermer' : 'Close Article'}
                </button>

                <button
                  type="button"
                  onClick={() => navigateArticle('next')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#23292A] hover:bg-[#2B3232] text-xs font-semibold text-gray-300 hover:text-white transition"
                >
                  <span>{currentLanguage === 'ru' ? 'Следующая' : currentLanguage === 'fr' ? 'Suivante' : 'Next'}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
