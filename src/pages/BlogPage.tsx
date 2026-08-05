import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Clock, Eye, ArrowRight, TrendingUp, Sparkles, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  fetchPublishedArticles, fetchCategories, fetchPopularArticles,
  type BlogArticle, type BlogCategory,
} from '../lib/blog';
import { AdSlot } from '../components/ui/AdSlot';
import { NewsletterSignup } from '../components/NewsletterSignup';
import { Skeleton } from '../components/ui/Skeleton';

interface Props {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

const ARTICLES_PER_PAGE = 9;

export function BlogPage({ onNavigate }: Props) {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [featured, setFeatured] = useState<BlogArticle[]>([]);
  const [popular, setPopular] = useState<BlogArticle[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cats, featuredArticles, popularArticles] = await Promise.all([
        fetchCategories(),
        fetchPublishedArticles({ featuredOnly: true, limit: 5 }),
        fetchPopularArticles(5),
      ]);
      setCategories(cats);
      setFeatured(featuredArticles.articles);
      setPopular(popularArticles);
      setLoading(false);
    })();
  }, []);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    const { articles: arts } = await fetchPublishedArticles({
      categorySlug: activeCategory !== 'all' ? activeCategory : undefined,
      search: search || undefined,
      limit: 100,
    });
    setArticles(arts);
    setCurrentPage(1);
    setLoading(false);
  }, [activeCategory, search]);

  useEffect(() => {
    const timer = setTimeout(loadArticles, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadArticles, search]);

  const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = useMemo(
    () => articles.slice((currentPage - 1) * ARTICLES_PER_PAGE, currentPage * ARTICLES_PER_PAGE),
    [articles, currentPage],
  );

  const currentFeatured = featured[featuredIndex];

  const openArticle = (slug: string) => onNavigate('blog-article', { slug });

  return (
    <div className="pt-16 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-950">
        <div className="absolute inset-0 hero-grid opacity-20" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-gold-300 text-xs font-semibold tracking-wide uppercase mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Career Resources
            </span>
            <h1 className="font-display font-bold text-4xl md:text-5xl text-white mb-4 leading-tight">
              Your Guide to a <span className="text-gradient-gold">Cruise Ship Career</span>
            </h1>
            <p className="text-lg text-ocean-200 mb-8">
              Expert tips, guides, and resources to help you land your dream job at sea with Ocean Goers.
            </p>
            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/95 backdrop-blur-sm text-ocean-900 placeholder-slate-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                aria-label="Search articles"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Featured Article Slider */}
        {!loading && currentFeatured && (
          <section className="-mt-8 mb-12 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-ocean-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-500" /> Featured Articles
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setFeaturedIndex((i) => (i - 1 + featured.length) % featured.length)}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-ocean-50 transition-colors"
                  aria-label="Previous featured article"
                >
                  <ChevronLeft className="w-4 h-4 text-ocean-700" />
                </button>
                <button
                  onClick={() => setFeaturedIndex((i) => (i + 1) % featured.length)}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-ocean-50 transition-colors"
                  aria-label="Next featured article"
                >
                  <ChevronRight className="w-4 h-4 text-ocean-700" />
                </button>
              </div>
            </div>
            <div
              onClick={() => openArticle(currentFeatured.slug)}
              className="group cursor-pointer relative overflow-hidden rounded-3xl bg-white shadow-glass-lg border border-slate-100 animate-fade-in"
              key={currentFeatured.id}
            >
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative h-64 md:h-80 bg-gradient-to-br from-ocean-600 to-ocean-900 overflow-hidden">
                  {currentFeatured.featured_image ? (
                    <img src={currentFeatured.featured_image} alt={currentFeatured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img src="/og-image.png" alt={currentFeatured.title} className="w-32 h-32 object-contain opacity-80" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 rounded-full bg-gold-400 text-ocean-900 text-xs font-bold uppercase tracking-wide">
                      Featured
                    </span>
                  </div>
                </div>
                <div className="p-8 md:p-10 flex flex-col justify-center">
                  {currentFeatured.category && (
                    <span className="inline-flex w-fit px-3 py-1 rounded-full bg-ocean-100 text-ocean-700 text-xs font-semibold mb-3">
                      {currentFeatured.category.name}
                    </span>
                  )}
                  <h3 className="font-display font-bold text-2xl text-ocean-900 mb-3 group-hover:text-ocean-600 transition-colors">
                    {currentFeatured.title}
                  </h3>
                  <p className="text-slate-600 mb-4 line-clamp-3">{currentFeatured.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-5">
                    <span className="font-medium text-ocean-700">{currentFeatured.author_name}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {currentFeatured.reading_time_minutes} min</span>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {currentFeatured.views}</span>
                  </div>
                  <button className="inline-flex items-center gap-2 text-ocean-600 font-semibold text-sm group-hover:gap-3 transition-all">
                    Read More <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Category Filters */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-ocean-600 text-white shadow-sm'
                  : 'bg-white text-ocean-700 border border-slate-200 hover:border-ocean-300'
              }`}
            >
              All Articles
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.slug
                    ? 'bg-ocean-600 text-white shadow-sm'
                    : 'bg-white text-ocean-700 border border-slate-200 hover:border-ocean-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <h2 className="font-display font-bold text-xl text-ocean-900 mb-5">
              {activeCategory === 'all' ? 'Latest Articles' : `${categories.find((c) => c.slug === activeCategory)?.name ?? 'Articles'}`}
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-48 w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : paginatedArticles.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No articles found. Try a different search or category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedArticles.map((article, i) => (
                  <div key={article.id}>
                    <ArticleCard article={article} onClick={() => openArticle(article.slug)} />
                    {/* Inline ad after every 4th article */}
                    {(i + 1) % 4 === 0 && i < paginatedArticles.length - 1 && (
                      <div className="mt-6">
                        <AdSlot format="leaderboard" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-ocean-700 disabled:opacity-40 hover:bg-ocean-50 transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === i + 1
                        ? 'bg-ocean-600 text-white'
                        : 'bg-white border border-slate-200 text-ocean-700 hover:bg-ocean-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-ocean-700 disabled:opacity-40 hover:bg-ocean-50 transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Sidebar Ad */}
            <AdSlot format="sidebar" />

            {/* Popular Posts */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <h3 className="font-display font-semibold text-ocean-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gold-500" /> Popular Posts
              </h3>
              <div className="space-y-3">
                {popular.map((article, i) => (
                  <button
                    key={article.id}
                    onClick={() => openArticle(article.slug)}
                    className="flex items-start gap-3 w-full text-left group"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-ocean-100 text-ocean-700 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ocean-900 group-hover:text-ocean-600 transition-colors line-clamp-2">
                        {article.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {article.views}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <NewsletterSignup variant="card" />
          </aside>
        </div>

        {/* Bottom Newsletter Banner */}
        <section className="mt-16">
          <NewsletterSignup variant="banner" />
        </section>
      </div>
    </div>
  );
}

// ===== Article Card =====
function ArticleCard({ article, onClick }: { article: BlogArticle; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-glass hover:border-ocean-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
    >
      <div className="relative h-48 bg-gradient-to-br from-ocean-500 to-ocean-800 overflow-hidden">
        {article.featured_image ? (
          <img src={article.featured_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img src="/og-image.png" alt="" className="w-24 h-24 object-contain opacity-60" />
          </div>
        )}
        {article.category && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-ocean-700 text-xs font-semibold">
            {article.category.name}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display font-bold text-lg text-ocean-900 mb-2 group-hover:text-ocean-600 transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{article.excerpt}</p>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-ocean-700">{article.author_name}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.reading_time_minutes} min</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {article.views}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          </span>
          <span className="inline-flex items-center gap-1 text-ocean-600 text-sm font-semibold group-hover:gap-2 transition-all">
            Read More <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
