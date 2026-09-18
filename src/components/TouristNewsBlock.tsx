import React, { useState, useEffect } from 'react';
import { Newspaper, Calendar, Eye, ChevronRight, X, Search, Bookmark, ArrowLeft, ExternalLink } from 'lucide-react';
import { TouristNews, LanguageCode, getLocalizedNews } from '../types';
import { getNews } from '../db';

interface TouristNewsBlockProps {
  currentLanguage: LanguageCode;
}

export function TouristNewsBlock({ currentLanguage }: TouristNewsBlockProps) {
  const [news, setNews] = useState<TouristNews[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<TouristNews | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadNews = () => {
    const list = getNews();
    setNews(list);
  };

  useEffect(() => {
    loadNews();
    window.addEventListener('db-sync', loadNews);
    return () => {
      window.removeEventListener('db-sync', loadNews);
    };
  }, []);

  // Top 3 newest news: always sort by publication date descending so newest articles appear first
  const sortedNews = [...news].sort((a, b) => {
    const timeA = new Date(a.publishedAt).getTime() || 0;
    const timeB = new Date(b.publishedAt).getTime() || 0;
    return timeB - timeA;
  });
  const top3News = sortedNews.slice(0, 3);

  // Filtered archive news using localized text
  const filteredArchive = news.filter(item => {
    const loc = getLocalizedNews(item, currentLanguage);
    const q = searchQuery.toLowerCase();
    const matchesSearch = loc.title.toLowerCase().includes(q) ||
      loc.summary.toLowerCase().includes(q) ||
      loc.body.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory || loc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories: string[] = ['all', ...Array.from(new Set<string>(news.map(n => n.category)))];

  const getCategoryLabel = (cat: string) => {
    if (cat === 'all') {
      return currentLanguage === 'ru' ? 'Все категории' : currentLanguage === 'fr' ? 'Toutes' : 'All Categories';
    }
    return cat;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const locale = currentLanguage === 'ru' ? 'ru-RU' : currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="tourist-news-section" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2B3232] pb-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-[#7A9A3C]/10 border border-[#7A9A3C]/30 flex items-center justify-center text-[#7A9A3C] shrink-0">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{currentLanguage === 'ru' ? 'Туристические новости' : currentLanguage === 'fr' ? 'Actualités Touristiques' : 'Uzbekistan Tourism News'}</span>
              <span className="text-[10px] font-mono uppercase bg-[#7A9A3C]/15 text-[#90B24A] border border-[#7A9A3C]/30 px-2 py-0.5 rounded-full font-semibold">
                {currentLanguage === 'ru' ? 'Официально' : 'Official'}
              </span>
            </h3>
            <p className="text-xs text-[#9AA1A0] mt-0.5">
              {currentLanguage === 'ru' 
                ? 'Регламенты пребывания, визовые коридоры и важные события для путешественников' 
                : currentLanguage === 'fr'
                ? 'Réglementations, corridors de visas et informations officielles'
                : 'Regulations, visa corridors, and official travel announcements'}
            </p>
          </div>
        </div>

        <button
          id="btn-open-news-archive"
          type="button"
          onClick={() => setShowArchive(true)}
          className="inline-flex items-center space-x-2 self-start sm:self-auto rounded-xl border border-[#3E4747] bg-[#23292A] px-3.5 py-2 text-xs font-semibold text-[#E5E5E5] hover:border-[#7A9A3C] hover:text-[#90B24A] transition-all cursor-pointer"
        >
          <Bookmark className="h-3.5 w-3.5 text-[#7A9A3C]" />
          <span>{currentLanguage === 'ru' ? 'Архив новостей' : currentLanguage === 'fr' ? 'Archives complètes' : 'News Archive'}</span>
          <span className="text-[10px] font-mono bg-[#171A1A] px-1.5 py-0.5 rounded text-[#9AA1A0]">
            {news.length}
          </span>
        </button>
      </div>

      {/* Top 3 Main News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3News.map((article, idx) => {
          const loc = getLocalizedNews(article, currentLanguage);
          return (
            <article
              key={article.id}
              id={`news-card-top-${article.id}`}
              onClick={() => setSelectedArticle(article)}
              className="group relative flex flex-col justify-between rounded-2xl border border-[#2B3232] bg-[#23292A]/80 hover:bg-[#23292A] hover:border-[#7A9A3C]/60 transition-all duration-300 overflow-hidden cursor-pointer shadow-sm hover:shadow-md"
            >
              {/* Illustration */}
              <div className="relative h-44 w-full overflow-hidden bg-[#171A1A]">
                <img
                  src={article.illustration}
                  alt={loc.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback photo
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#23292A] via-transparent to-black/30" />
                
                {/* Category Badge & Top Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="rounded-full bg-[#171A1A]/80 backdrop-blur-md border border-[#3E4747] px-2.5 py-1 text-[10px] font-semibold text-[#90B24A]">
                    {loc.category}
                  </span>
                  {idx === 0 && (
                    <span className="rounded-full bg-[#7A9A3C] px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                      {currentLanguage === 'ru' ? 'Главная' : currentLanguage === 'fr' ? 'À la une' : 'Top'}
                    </span>
                  )}
                </div>

                {/* Views */}
                {article.viewsCount && (
                  <div className="absolute top-3 right-3 flex items-center space-x-1 rounded-full bg-[#171A1A]/70 backdrop-blur-sm px-2 py-0.5 text-[10px] text-[#9AA1A0]">
                    <Eye className="h-3 w-3" />
                    <span>{article.viewsCount}</span>
                  </div>
                )}
              </div>

              {/* Content Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[11px] text-[#9AA1A0] mb-2 font-mono">
                    <Calendar className="h-3 w-3 text-[#7A9A3C]" />
                    <span>{formatDate(article.publishedAt)}</span>
                    {article.author && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[130px]">{article.author}</span>
                      </>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-[#90B24A] transition-colors line-clamp-2 leading-snug mb-2">
                    {loc.title}
                  </h4>

                  <p className="text-xs text-[#9AA1A0] line-clamp-2 leading-relaxed">
                    {loc.summary}
                  </p>
                </div>

                {/* Action Link */}
                <div className="mt-4 pt-3 border-t border-[#2B3232] flex items-center justify-between text-xs font-semibold text-[#7A9A3C] group-hover:text-[#90B24A]">
                  <span>{currentLanguage === 'ru' ? 'Читать новость' : currentLanguage === 'fr' ? 'Lire l\'article' : 'Read Article'}</span>
                  <ChevronRight className="h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Full Article Reading Modal */}
      {selectedArticle && (() => {
        const loc = getLocalizedNews(selectedArticle, currentLanguage);
        return (
          <div 
            id="modal-article-view" 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
            onClick={() => setSelectedArticle(null)}
          >
            <div 
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[#3E4747] bg-[#1E2222] overflow-hidden shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Hero Image */}
              <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-[#171A1A] shrink-0">
                <img
                  src={selectedArticle.illustration}
                  alt={loc.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E2222] via-[#1E2222]/40 to-transparent" />

                {/* Close Button */}
                <button
                  id="btn-close-article-modal"
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 h-9 w-9 rounded-full bg-[#171A1A]/80 hover:bg-[#171A1A] text-white flex items-center justify-center border border-[#3E4747] transition-all cursor-pointer"
                  title={currentLanguage === 'ru' ? 'Закрыть' : currentLanguage === 'fr' ? 'Fermer' : 'Close'}
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Category & Meta Overlays */}
                <div className="absolute bottom-4 left-6 right-6">
                  <span className="inline-block rounded-full bg-[#7A9A3C] px-3 py-1 text-[11px] font-bold text-white mb-2 shadow-sm">
                    {loc.category}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                    {loc.title}
                  </h2>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed text-[#E5E5E5]">
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#9AA1A0] border-b border-[#2B3232] pb-3">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-[#7A9A3C]" />
                    {formatDate(selectedArticle.publishedAt)}
                  </span>
                  {selectedArticle.author && (
                    <span>
                      {currentLanguage === 'ru' ? 'Источник: ' : currentLanguage === 'fr' ? 'Source : ' : 'Source: '}
                      <strong className="text-white">{selectedArticle.author}</strong>
                    </span>
                  )}
                  {selectedArticle.viewsCount && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-[#9AA1A0]" />
                      {selectedArticle.viewsCount} {currentLanguage === 'ru' ? 'просмотров' : currentLanguage === 'fr' ? 'vues' : 'views'}
                    </span>
                  )}
                </div>

                {/* Summary lead paragraph */}
                <p className="text-sm font-medium text-[#90B24A] bg-[#7A9A3C]/10 border-l-4 border-[#7A9A3C] p-3 rounded-r-xl">
                  {loc.summary}
                </p>

                {/* Body text with formatting */}
                <div className="space-y-3 whitespace-pre-line text-[#E5E5E5] text-xs sm:text-sm font-sans leading-relaxed">
                  {loc.body}
                </div>

                {/* Footer notice */}
                <div className="mt-6 pt-4 border-t border-[#2B3232] flex items-center justify-between text-xs text-[#9AA1A0]">
                  <span>{currentLanguage === 'ru' ? 'RegistApp Официальный Информационный Портал' : currentLanguage === 'fr' ? 'Portail Officiel RegistApp' : 'RegistApp Official Information Portal'}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(null)}
                    className="rounded-xl bg-[#7A9A3C] px-4 py-2 text-xs font-bold text-white hover:bg-[#5E7A2A] transition-all cursor-pointer"
                  >
                    {currentLanguage === 'ru' ? 'Понятно' : currentLanguage === 'fr' ? 'Compris' : 'Understood'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* News Archive Modal */}
      {showArchive && (
        <div 
          id="modal-news-archive" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
          onClick={() => setShowArchive(false)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[#3E4747] bg-[#1E2222] overflow-hidden shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[#2B3232] flex items-center justify-between bg-[#171A1A]/80">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-[#7A9A3C]/10 border border-[#7A9A3C]/30 flex items-center justify-center text-[#7A9A3C]">
                  <Bookmark className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {currentLanguage === 'ru' ? 'Архив туристических новостей' : currentLanguage === 'fr' ? 'Archives des actualités' : 'Tourist News Archive'}
                  </h3>
                  <p className="text-xs text-[#9AA1A0]">
                    {currentLanguage === 'ru' ? 'Полная база официальных публикаций и миграционных регламентов' : 'All official announcements and travel guides'}
                  </p>
                </div>
              </div>

              <button
                id="btn-close-archive-modal"
                type="button"
                onClick={() => setShowArchive(false)}
                className="h-8 w-8 rounded-full bg-[#23292A] hover:bg-[#2B3232] text-white flex items-center justify-center border border-[#3E4747] transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-[#2B3232] bg-[#23292A]/50 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA1A0]" />
                  <input
                    id="input-archive-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={currentLanguage === 'ru' ? 'Поиск по заголовкам и ключевым словам...' : 'Search news...'}
                    className="w-full rounded-xl border border-[#3E4747] bg-[#171A1A] pl-9 pr-4 py-2 text-xs text-white placeholder-[#9AA1A0] outline-none focus:border-[#7A9A3C]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9AA1A0] hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#7A9A3C] text-white'
                          : 'bg-[#171A1A] text-[#9AA1A0] border border-[#3E4747] hover:border-[#7A9A3C]'
                      }`}
                    >
                      {getCategoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Archive List */}
            <div className="p-4 overflow-y-auto space-y-3 max-h-[60vh]">
              {filteredArchive.length === 0 ? (
                <div className="text-center py-12 text-[#9AA1A0]">
                  <Newspaper className="mx-auto h-10 w-10 text-[#3E4747] mb-2" />
                  <p className="text-xs">
                    {currentLanguage === 'ru' ? 'Ничего не найдено по вашему запросу' : currentLanguage === 'fr' ? 'Aucun article trouvé' : 'No news found matching your query'}
                  </p>
                </div>
              ) : (
                filteredArchive.map((item) => {
                  const loc = getLocalizedNews(item, currentLanguage);
                  return (
                    <div
                      key={item.id}
                      id={`archive-item-${item.id}`}
                      onClick={() => setSelectedArticle(item)}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#2B3232] bg-[#23292A] p-3.5 hover:border-[#7A9A3C]/60 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                        <img
                          src={item.illustration}
                          alt={loc.title}
                          referrerPolicy="no-referrer"
                          className="h-16 w-20 sm:h-20 sm:w-28 rounded-lg object-cover bg-[#171A1A] shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="rounded bg-[#7A9A3C]/15 border border-[#7A9A3C]/30 px-2 py-0.5 text-[9px] font-bold text-[#90B24A]">
                              {loc.category}
                            </span>
                            <span className="text-[10px] text-[#9AA1A0] font-mono">
                              {formatDate(item.publishedAt)}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#90B24A] transition-colors line-clamp-1">
                            {loc.title}
                          </h4>
                          <p className="text-[11px] text-[#9AA1A0] line-clamp-2 mt-0.5 leading-relaxed">
                            {loc.summary}
                          </p>
                        </div>
                      </div>

                      <div className="self-end sm:self-center shrink-0">
                        <span className="inline-flex items-center space-x-1 text-xs font-semibold text-[#7A9A3C] group-hover:text-[#90B24A]">
                          <span>{currentLanguage === 'ru' ? 'Читать' : currentLanguage === 'fr' ? 'Lire' : 'Read'}</span>
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Archive Footer */}
            <div className="p-3 bg-[#171A1A] border-t border-[#2B3232] text-right">
              <button
                type="button"
                onClick={() => setShowArchive(false)}
                className="rounded-xl border border-[#3E4747] px-4 py-2 text-xs font-bold text-[#E5E5E5] hover:border-[#7A9A3C] transition cursor-pointer"
              >
                {currentLanguage === 'ru' ? 'Закрыть архив' : currentLanguage === 'fr' ? 'Fermer' : 'Close Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TouristNewsBlock;
