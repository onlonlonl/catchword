-- Catchword: Shared Reading & Annotation System
-- Run this in your Supabase SQL Editor to set up the database

-- Books
CREATE TABLE catchword_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text DEFAULT '',
  cover_url text DEFAULT '',
  total_pages int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Pages (book content split into pages)
CREATE TABLE catchword_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES catchword_books(id) ON DELETE CASCADE,
  page_number int NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Annotations (on paragraphs, with sentence-level quotes and one level of replies)
CREATE TABLE catchword_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES catchword_pages(id) ON DELETE CASCADE,
  book_id uuid REFERENCES catchword_books(id) ON DELETE CASCADE,
  paragraph_index int DEFAULT 0,
  author text NOT NULL CHECK (author IN ('moon', 'bulb')),
  content text NOT NULL,
  quote text DEFAULT '',
  parent_id uuid REFERENCES catchword_annotations(id) ON DELETE CASCADE,
  depth int DEFAULT 0 CHECK (depth <= 1),
  created_at timestamptz DEFAULT now()
);

-- Reading progress
CREATE TABLE catchword_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid UNIQUE REFERENCES catchword_books(id) ON DELETE CASCADE,
  current_page int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Settings (single row)
CREATE TABLE catchword_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  moon_icon text DEFAULT '🌙',
  moon_name text DEFAULT 'Moon',
  bulb_icon text DEFAULT '💡',
  bulb_name text DEFAULT 'Bulb',
  lamp_type text DEFAULT 'desk',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO catchword_settings (id) VALUES (1);

-- Row Level Security
ALTER TABLE catchword_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE catchword_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE catchword_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE catchword_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE catchword_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON catchword_books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON catchword_pages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON catchword_annotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON catchword_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON catchword_settings FOR ALL USING (true) WITH CHECK (true);
