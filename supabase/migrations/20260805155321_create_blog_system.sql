/*
# Career Resources & Blog System

## Summary
Creates a complete blog/CMS system for Ocean Goers with categories, tags,
articles, subscribers, and view tracking. Designed for SEO optimization
and Google AdSense qualification.

## New Tables

1. blog_categories
   - id (uuid, PK)
   - name (text, unique, not null)
   - slug (text, unique, not null) — URL-friendly identifier
   - description (text, nullable)
   - color (text, nullable) — accent color for badges
   - sort_order (int, default 0)
   - created_at (timestamptz)

2. blog_articles
   - id (uuid, PK)
   - title (text, not null)
   - slug (text, unique, not null) — clean URL like /blog/how-to-get-cruise-ship-job
   - excerpt (text, nullable) — short summary for cards
   - content (text, not null) — full article HTML
   - featured_image (text, nullable) — image URL
   - gallery (jsonb, nullable) — array of image URLs
   - category_id (uuid, FK -> blog_categories, nullable)
   - author_name (text, default 'Ocean Goers Team')
   - author_avatar (text, nullable)
   - status (text, default 'draft') — draft | published | scheduled
   - published_at (timestamptz, nullable) — when to go live
   - reading_time_minutes (int, default 5)
   - views (int, default 0) — denormalized view count
   - is_featured (boolean, default false)
   - seo_title (text, nullable)
   - seo_description (text, nullable)
   - og_image (text, nullable)
   - created_at (timestamptz)
   - updated_at (timestamptz)

3. blog_tags
   - id (uuid, PK)
   - name (text, unique, not null)
   - slug (text, unique, not null)
   - created_at (timestamptz)

4. blog_article_tags
   - article_id (uuid, FK -> blog_articles ON DELETE CASCADE)
   - tag_id (uuid, FK -> blog_tags ON DELETE CASCADE)
   - PRIMARY KEY (article_id, tag_id)

5. blog_subscribers
   - id (uuid, PK)
   - name (text, nullable)
   - email (text, unique, not null)
   - subscribed_at (timestamptz)
   - is_active (boolean, default true)

6. blog_views
   - id (uuid, PK)
   - article_id (uuid, FK -> blog_articles ON DELETE CASCADE)
   - viewed_at (timestamptz, default now())
   - viewer_ip (text, nullable) — for dedup

## Security (RLS)
- blog_categories: public read (anon + authenticated), admin-only writes
- blog_articles: public read for published, admin-only writes; drafts/scheduled hidden from public
- blog_tags: public read, admin-only writes
- blog_article_tags: public read, admin-only writes
- blog_subscribers: public insert (anyone can subscribe), admin-only read
- blog_views: public insert (anyone can increment views), admin-only read

## Important Notes
1. This app HAS a sign-in screen (admin dashboard), so admin write policies
   are scoped TO authenticated. Public read policies use TO anon, authenticated
   so blog content is visible to all visitors.
2. Blog articles SELECT policy filters by status: published articles are
   visible to everyone; drafts and scheduled articles are only visible to
   authenticated admins.
3. blog_subscribers allows public INSERT so visitors can subscribe without
   logging in. Only admins can read the subscriber list.
4. blog_views allows public INSERT for view tracking. An index on article_id
   supports fast view-count queries.
*/

-- ===== CATEGORIES =====
CREATE TABLE IF NOT EXISTS blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  color text DEFAULT 'ocean',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_blog_categories" ON blog_categories;
CREATE POLICY "public_read_blog_categories" ON blog_categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_blog_categories" ON blog_categories;
CREATE POLICY "admin_insert_blog_categories" ON blog_categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_blog_categories" ON blog_categories;
CREATE POLICY "admin_update_blog_categories" ON blog_categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_blog_categories" ON blog_categories;
CREATE POLICY "admin_delete_blog_categories" ON blog_categories FOR DELETE
  TO authenticated USING (true);

-- ===== ARTICLES =====
CREATE TABLE IF NOT EXISTS blog_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text NOT NULL,
  featured_image text,
  gallery jsonb DEFAULT '[]'::jsonb,
  category_id uuid REFERENCES blog_categories(id) ON DELETE SET NULL,
  author_name text DEFAULT 'Ocean Goers Team',
  author_avatar text,
  status text DEFAULT 'draft',
  published_at timestamptz,
  reading_time_minutes int DEFAULT 5,
  views int DEFAULT 0,
  is_featured boolean DEFAULT false,
  seo_title text,
  seo_description text,
  og_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles; authenticated can read all (admin)
DROP POLICY IF EXISTS "public_read_published_articles" ON blog_articles;
CREATE POLICY "public_read_published_articles" ON blog_articles FOR SELECT
  TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "admin_read_all_articles" ON blog_articles;
CREATE POLICY "admin_read_all_articles" ON blog_articles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_articles" ON blog_articles;
CREATE POLICY "admin_insert_articles" ON blog_articles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_articles" ON blog_articles;
CREATE POLICY "admin_update_articles" ON blog_articles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_articles" ON blog_articles;
CREATE POLICY "admin_delete_articles" ON blog_articles FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_blog_articles_status ON blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_blog_articles_published_at ON blog_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON blog_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);

-- ===== TAGS =====
CREATE TABLE IF NOT EXISTS blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_blog_tags" ON blog_tags;
CREATE POLICY "public_read_blog_tags" ON blog_tags FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_blog_tags" ON blog_tags;
CREATE POLICY "admin_insert_blog_tags" ON blog_tags FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_blog_tags" ON blog_tags;
CREATE POLICY "admin_update_blog_tags" ON blog_tags FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_blog_tags" ON blog_tags;
CREATE POLICY "admin_delete_blog_tags" ON blog_tags FOR DELETE
  TO authenticated USING (true);

-- ===== ARTICLE TAGS =====
CREATE TABLE IF NOT EXISTS blog_article_tags (
  article_id uuid NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);
ALTER TABLE blog_article_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_article_tags" ON blog_article_tags;
CREATE POLICY "public_read_article_tags" ON blog_article_tags FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_article_tags" ON blog_article_tags;
CREATE POLICY "admin_insert_article_tags" ON blog_article_tags FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_article_tags" ON blog_article_tags;
CREATE POLICY "admin_delete_article_tags" ON blog_article_tags FOR DELETE
  TO authenticated USING (true);

-- ===== SUBSCRIBERS =====
CREATE TABLE IF NOT EXISTS blog_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text UNIQUE NOT NULL,
  subscribed_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);
ALTER TABLE blog_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_subscribers" ON blog_subscribers;
CREATE POLICY "public_insert_subscribers" ON blog_subscribers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_subscribers" ON blog_subscribers;
CREATE POLICY "admin_read_subscribers" ON blog_subscribers FOR SELECT
  TO authenticated USING (true);

-- ===== VIEWS =====
CREATE TABLE IF NOT EXISTS blog_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  viewer_ip text
);
ALTER TABLE blog_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_views" ON blog_views;
CREATE POLICY "public_insert_views" ON blog_views FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_views" ON blog_views;
CREATE POLICY "admin_read_views" ON blog_views FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_blog_views_article ON blog_views(article_id);

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION blog_articles_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blog_articles_updated ON blog_articles;
CREATE TRIGGER trg_blog_articles_updated
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW EXECUTE FUNCTION blog_articles_set_updated_at();
