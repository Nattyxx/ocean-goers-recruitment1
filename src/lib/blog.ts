import { supabase } from './supabase';

// ===== Types =====
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
}

export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  gallery: string[] | null;
  category_id: string | null;
  author_name: string;
  author_avatar: string | null;
  status: string;
  published_at: string | null;
  reading_time_minutes: number;
  views: number;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  created_at: string;
  updated_at: string;
  category?: BlogCategory | null;
  tags?: BlogTag[];
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogSubscriber {
  id: string;
  name: string | null;
  email: string;
  subscribed_at: string;
  is_active: boolean;
}

// ===== Slug Helpers =====
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function readingTime(content: string): number {
  const words = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function excerptFromContent(content: string, maxLen = 160): string {
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen).trim() + '...' : text;
}

// ===== Query Helpers =====
export async function fetchCategories(): Promise<BlogCategory[]> {
  const { data, error } = await supabase
    .from('blog_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return [];
  return data as BlogCategory[];
}

export async function fetchPublishedArticles(opts?: {
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
  limit?: number;
  offset?: number;
  featuredOnly?: boolean;
}): Promise<{ articles: BlogArticle[]; total: number }> {
  let query = supabase
    .from('blog_articles')
    .select('*, category:blog_categories(*)', { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (opts?.featuredOnly) query = query.eq('is_featured', true);
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 10) - 1);

  const { data, error, count } = await query;
  if (error || !data) return { articles: [], total: 0 };

  let articles = data as unknown as BlogArticle[];

  if (opts?.categorySlug) {
    articles = articles.filter((a) => a.category?.slug === opts.categorySlug);
  }
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    articles = articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.excerpt ?? '').toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q),
    );
  }

  return { articles, total: count ?? articles.length };
}

export async function fetchArticleBySlug(slug: string): Promise<BlogArticle | null> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('*, category:blog_categories(*)')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as BlogArticle;
}

export async function fetchArticleById(id: string): Promise<BlogArticle | null> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('*, category:blog_categories(*)')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as BlogArticle;
}

export async function fetchArticlesForAdmin(): Promise<BlogArticle[]> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('*, category:blog_categories(*)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as unknown as BlogArticle[];
}

export async function fetchRelatedArticles(article: BlogArticle, limit = 3): Promise<BlogArticle[]> {
  let query = supabase
    .from('blog_articles')
    .select('*, category:blog_categories(*)')
    .eq('status', 'published')
    .neq('id', article.id)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  if (article.category_id) {
    query = query.eq('category_id', article.category_id);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as BlogArticle[];
}

export async function fetchPopularArticles(limit = 5): Promise<BlogArticle[]> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('*, category:blog_categories(*)')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('views', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as BlogArticle[];
}

export async function fetchPrevNextArticles(currentId: string): Promise<{ prev: BlogArticle | null; next: BlogArticle | null }> {
  const { data: newer } = await supabase
    .from('blog_articles')
    .select('id, title, slug')
    .eq('status', 'published')
    .gt('published_at', new Date().toISOString())
    .neq('id', currentId)
    .order('published_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: older } = await supabase
    .from('blog_articles')
    .select('id, title, slug')
    .eq('status', 'published')
    .lt('published_at', new Date().toISOString())
    .neq('id', currentId)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { prev: older as BlogArticle | null, next: newer as BlogArticle | null };
}

export async function fetchTags(): Promise<BlogTag[]> {
  const { data, error } = await supabase.from('blog_tags').select('*').order('name');
  if (error) return [];
  return data as BlogTag[];
}

export async function fetchTagsForArticle(articleId: string): Promise<BlogTag[]> {
  const { data, error } = await supabase
    .from('blog_article_tags')
    .select('tag:blog_tags(*)')
    .eq('article_id', articleId);
  if (error || !data) return [];
  return data.map((row: any) => row.tag).filter(Boolean) as BlogTag[];
}

// ===== View Tracking =====
export async function incrementArticleView(articleId: string): Promise<void> {
  await supabase.from('blog_views').insert({ article_id: articleId });
  await supabase.rpc('increment_blog_article_views', { article_id: articleId });
}

// ===== Newsletter =====
export async function subscribeToNewsletter(name: string, email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('blog_subscribers').upsert(
    { name: name || null, email, is_active: true },
    { onConflict: 'email' },
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ===== Admin CRUD =====
export async function createArticle(data: {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  gallery?: string[];
  category_id?: string;
  author_name?: string;
  status?: string;
  published_at?: string;
  is_featured?: boolean;
  seo_title?: string;
  seo_description?: string;
  og_image?: string;
}): Promise<BlogArticle | null> {
  const slug = data.slug || slugify(data.title);
  const insert: Record<string, unknown> = {
    title: data.title,
    slug,
    excerpt: data.excerpt || excerptFromContent(data.content),
    content: data.content,
    featured_image: data.featured_image || null,
    gallery: data.gallery || [],
    category_id: data.category_id || null,
    author_name: data.author_name || 'Ocean Goers Team',
    status: data.status || 'draft',
    published_at: data.published_at || (data.status === 'published' ? new Date().toISOString() : null),
    reading_time_minutes: readingTime(data.content),
    is_featured: data.is_featured ?? false,
    seo_title: data.seo_title || data.title,
    seo_description: data.seo_description || excerptFromContent(data.content),
    og_image: data.og_image || data.featured_image || null,
  };

  const { data: result, error } = await supabase.from('blog_articles').insert(insert).select('*, category:blog_categories(*)').single();
  if (error) return null;
  return result as unknown as BlogArticle;
}

export async function updateArticle(id: string, data: Partial<{
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  gallery: string[];
  category_id: string;
  author_name: string;
  status: string;
  published_at: string;
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
  og_image: string;
}>): Promise<boolean> {
  const update: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
  if (data.content) update.reading_time_minutes = readingTime(data.content);
  if (data.title && !data.slug) update.slug = slugify(data.title);

  const { error } = await supabase.from('blog_articles').update(update).eq('id', id);
  return !error;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const { error } = await supabase.from('blog_articles').delete().eq('id', id);
  return !error;
}

export async function fetchSubscriberCount(): Promise<number> {
  const { count } = await supabase.from('blog_subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true);
  return count ?? 0;
}

// ===== SEO Helpers =====
export function buildArticleJsonLd(article: BlogArticle): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.seo_title || article.title,
    description: article.seo_description || article.excerpt || '',
    image: article.featured_image || article.og_image || '',
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at,
    author: {
      '@type': 'Organization',
      name: article.author_name || 'Ocean Goers',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ocean Goers',
      logo: {
        '@type': 'ImageObject',
        url: '/og-image.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://oceangoers.org/blog/${article.slug}`,
    },
  };
}

export function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const regex = /<h([23])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    const id = slugify(text);
    headings.push({ id, text, level });
  }
  return headings;
}

export function injectHeadingIds(html: string): string {
  return html.replace(/<h([23])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, content) => {
    const text = content.replace(/<[^>]+>/g, '').trim();
    const id = slugify(text);
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
  });
}
