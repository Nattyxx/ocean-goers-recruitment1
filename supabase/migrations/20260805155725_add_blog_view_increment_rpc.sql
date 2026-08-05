/*
# Add increment_blog_article_views RPC function

## Summary
Creates a SECURITY DEFINER function to atomically increment the view count
on a blog article. This avoids race conditions when multiple users view an
article simultaneously.

## Changes
- CREATE FUNCTION increment_blog_article_views(article_id uuid) — atomically
  increments the views column by 1 for the given article.
- Grants EXECUTE to anon and authenticated roles so public visitors can
  trigger view increments.
*/

CREATE OR REPLACE FUNCTION increment_blog_article_views(article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE blog_articles SET views = views + 1 WHERE id = article_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_blog_article_views TO anon, authenticated;
