import { useState, useEffect, useMemo } from 'react';
import {
  Clock, Eye, Calendar, ArrowLeft, ArrowRight, Share2, Facebook,
  Twitter, Linkedin, Link2, ChevronDown, Ship, CheckCircle2,
} from 'lucide-react';
import {
  fetchArticleBySlug, fetchRelatedArticles, fetchPrevNextArticles,
  incrementArticleView, injectHeadingIds, extractHeadings,
  buildArticleJsonLd, type BlogArticle,
} from '../lib/blog';
import { AdSlot } from '../components/ui/AdSlot';
import { NewsletterSignup } from '../components/NewsletterSignup';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../lib/toast';

interface Props {
  slug: string;
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function BlogArticlePage({ slug, onNavigate }: Props) {
  const { toast } = useToast();
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [related, setRelated] = useState<BlogArticle[]>([]);
  const [prevNext, setPrevNext] = useState<{ prev: BlogArticle | null; next: BlogArticle | null }>({ prev: null, next: null });
  const [loading, setLoading] = useState(true);
  const [activeHeading, setActiveHeading] = useState<string>('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const art = await fetchArticleBySlug(slug);
      if (!art) { setLoading(false); return; }

      setArticle(art);
      const [rel, pn] = await Promise.all([
        fetchRelatedArticles(art, 3),
        fetchPrevNextArticles(art.id),
      ]);
      setRelated(rel);
      setPrevNext(pn);
      setLoading(false);

      // Increment view count
      incrementArticleView(art.id);
    })();
  }, [slug]);

  const processedContent = useMemo(() => (article ? injectHeadingIds(article.content) : ''), [article]);
  const headings = useMemo(() => (article ? extractHeadings(article.content) : []), [article]);
  const jsonLd = useMemo(() => (article ? buildArticleJsonLd(article) : null), [article]);

  // Update document head for SEO
  useEffect(() => {
    if (!article) return;
    const seoTitle = article.seo_title || article.title;
    const seoDesc = article.seo_description || article.excerpt || '';

    document.title = `${seoTitle} | Ocean Goers`;

    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    setMeta('description', seoDesc);
    setMeta('og:title', seoTitle, 'property');
    setMeta('og:description', seoDesc, 'property');
    setMeta('og:type', 'article', 'property');
    setMeta('og:url', `https://oceangoers.org/blog/${article.slug}`, 'property');
    if (article.featured_image || article.og_image) {
      setMeta('og:image', article.featured_image || article.og_image || '', 'property');
    }
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', seoTitle);
    setMeta('twitter:description', seoDesc);
    if (article.featured_image || article.og_image) {
      setMeta('twitter:image', article.featured_image || article.og_image || '');
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', `https://oceangoers.org/blog/${article.slug}`);

    // JSON-LD structured data
    if (jsonLd) {
      let script = document.getElementById('article-jsonld');
      if (!script) { script = document.createElement('script'); script.id = 'article-jsonld'; script.setAttribute('type', 'application/ld+json'); document.head.appendChild(script); }
      script.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      document.title = 'Ocean Goers | Cruise Ship Recruitment';
    };
  }, [article, jsonLd]);

  // Track active heading on scroll
  useEffect(() => {
    if (headings.length === 0) return;
    const onScroll = () => {
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top < 200) {
            setActiveHeading(h.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  const handleShare = (platform: string) => {
    const url = `https://oceangoers.org/blog/${article?.slug ?? ''}`;
    const title = article?.title ?? '';
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast('Link copied to clipboard!', 'success');
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
    }
  };

  const openArticle = (s: string) => onNavigate('blog-article', { slug: s });

  if (loading) {
    return (
      <div className="pt-20 pb-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-24 mb-4" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-64 w-full rounded-2xl mb-6" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="pt-20 pb-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="font-display font-bold text-2xl text-ocean-900 mb-3">Article Not Found</h1>
        <p className="text-slate-600 mb-6">The article you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <button onClick={() => onNavigate('blog')} className="btn-ocean">Back to Career Resources</button>
      </div>
    );
  }

  // Split content for mid-article ad
  const contentParts = processedContent.split(/(?=<h2)/i);
  const midPoint = Math.floor(contentParts.length / 2);
  const firstHalf = contentParts.slice(0, midPoint).join('');
  const secondHalf = contentParts.slice(midPoint).join('');

  return (
    <div className="pt-16 pb-12">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <button onClick={() => onNavigate('blog')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ocean-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Career Resources
        </button>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        {article.category && (
          <span className="inline-flex px-3 py-1 rounded-full bg-ocean-100 text-ocean-700 text-xs font-semibold mb-4">
            {article.category.name}
          </span>
        )}
        <h1 className="font-display font-bold text-3xl md:text-4xl text-ocean-900 mb-4 leading-tight">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
          <span className="font-medium text-ocean-700">{article.author_name}</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
          </span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {article.reading_time_minutes} min read</span>
          <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {article.views} views</span>
        </div>

        {/* Featured Image */}
        {article.featured_image && (
          <div className="relative h-64 md:h-96 rounded-3xl overflow-hidden mb-8 shadow-glass">
            <img src={article.featured_image} alt={article.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Ad below title */}
        <div className="mb-8">
          <AdSlot format="leaderboard" />
        </div>

        {/* Social Sharing */}
        <div className="flex items-center gap-2 mb-8 pb-6 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-600 mr-2 flex items-center gap-1.5">
            <Share2 className="w-4 h-4" /> Share:
          </span>
          {[
            { icon: Facebook, platform: 'facebook', label: 'Facebook', color: 'hover:bg-blue-600 hover:text-white' },
            { icon: Twitter, platform: 'twitter', label: 'Twitter', color: 'hover:bg-sky-500 hover:text-white' },
            { icon: Linkedin, platform: 'linkedin', label: 'LinkedIn', color: 'hover:bg-blue-700 hover:text-white' },
            { icon: Link2, platform: 'copy', label: 'Copy Link', color: 'hover:bg-ocean-600 hover:text-white' },
          ].map((s) => (
            <button
              key={s.platform}
              onClick={() => handleShare(s.platform)}
              aria-label={`Share on ${s.label}`}
              className={`w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center transition-colors ${s.color}`}
            >
              <s.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Table of Contents (for long articles) */}
        {headings.length > 3 && (
          <details className="mb-8 rounded-2xl bg-ocean-50 border border-ocean-100 p-5 group" open>
            <summary className="font-display font-semibold text-ocean-800 cursor-pointer flex items-center justify-between">
              Table of Contents
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </summary>
            <nav className="mt-3 space-y-1.5">
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setActiveHeading(h.id);
                  }}
                  className={`block text-sm transition-colors ${
                    activeHeading === h.id ? 'text-ocean-700 font-semibold' : 'text-slate-600 hover:text-ocean-600'
                  } ${h.level === 3 ? 'ml-4' : ''}`}
                >
                  {h.text}
                </a>
              ))}
            </nav>
          </details>
        )}

        {/* Article Content */}
        <div
          className="prose-content text-ocean-900 leading-relaxed space-y-4 [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-2xl [&_h2]:text-ocean-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:font-semibold [&_h3]:text-xl [&_h3]:text-ocean-800 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-slate-700 [&_p]:text-base [&_p]:leading-relaxed [&_strong]:text-ocean-800 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:text-slate-700 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:text-slate-700 [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: firstHalf }}
        />

        {/* Mid-article ad */}
        {contentParts.length > 2 && (
          <div className="my-8">
            <AdSlot format="leaderboard" />
          </div>
        )}

        <div
          className="prose-content text-ocean-900 leading-relaxed space-y-4 [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-2xl [&_h2]:text-ocean-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:font-semibold [&_h3]:text-xl [&_h3]:text-ocean-800 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-slate-700 [&_p]:text-base [&_p]:leading-relaxed [&_strong]:text-ocean-800 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:text-slate-700 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:text-slate-700 [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: secondHalf }}
        />

        {/* End-of-article ad */}
        <div className="mt-8">
          <AdSlot format="rectangle" />
        </div>

        {/* CTA */}
        <div className="mt-10 relative overflow-hidden rounded-3xl bg-gradient-to-br from-ocean-800 to-ocean-950 p-8 md:p-10 text-center">
          <div className="absolute inset-0 hero-grid opacity-20" />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-400 mb-4">
              <Ship className="w-7 h-7 text-ocean-900" />
            </div>
            <h3 className="font-display font-bold text-2xl text-white mb-3">
              Ready to Start Your Cruise Ship Career?
            </h3>
            <p className="text-ocean-200 mb-6 max-w-lg mx-auto">
              Apply now with Ocean Goers and take the first step toward your dream job at sea.
            </p>
            <button
              onClick={() => onNavigate('home')}
              className="btn-gold inline-flex items-center gap-2"
            >
              Apply Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </article>

      {/* Prev/Next Navigation */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prevNext.prev && (
            <button
              onClick={() => openArticle(prevNext.prev!.slug)}
              className="group flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 hover:border-ocean-300 hover:shadow-sm transition-all text-left"
            >
              <ArrowLeft className="w-5 h-5 text-ocean-600 flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Previous</p>
                <p className="text-sm font-medium text-ocean-900 truncate">{prevNext.prev.title}</p>
              </div>
            </button>
          )}
          {prevNext.next && (
            <button
              onClick={() => openArticle(prevNext.next!.slug)}
              className="group flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 hover:border-ocean-300 hover:shadow-sm transition-all text-right sm:justify-end"
            >
              <div className="min-w-0">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Next</p>
                <p className="text-sm font-medium text-ocean-900 truncate">{prevNext.next.title}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-ocean-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <h2 className="font-display font-bold text-xl text-ocean-900 mb-5">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {related.map((rel) => (
              <article
                key={rel.id}
                onClick={() => openArticle(rel.slug)}
                className="group cursor-pointer bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-glass hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className="relative h-36 bg-gradient-to-br from-ocean-500 to-ocean-800 overflow-hidden">
                  {rel.featured_image ? (
                    <img src={rel.featured_image} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img src="/og-image.png" alt="" className="w-16 h-16 object-contain opacity-60" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {rel.category && (
                    <span className="text-xs text-ocean-600 font-semibold mb-1 block">{rel.category.name}</span>
                  )}
                  <h3 className="font-display font-semibold text-sm text-ocean-900 group-hover:text-ocean-600 transition-colors line-clamp-2">
                    {rel.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {rel.reading_time_minutes} min
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <NewsletterSignup variant="banner" />
      </section>
    </div>
  );
}
