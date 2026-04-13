[CLAUDE_INSTRUCTIONS.md](https://github.com/user-attachments/files/26669341/CLAUDE_INSTRUCTIONS.md)
# Catchword — Instructions for Claude (via Supabase MCP)

## Project Info
- Supabase Project ID: `YOUR_PROJECT_ID`
- Use `Supabase:execute_sql` tool to read/write

## Tables
- `catchword_books` — books (id uuid, title, author, cover_url, total_pages, created_at)
- `catchword_pages` — pages (id uuid, book_id, page_number, content, created_at)
- `catchword_annotations` — annotations (id uuid, page_id, book_id, paragraph_index, author, content, quote, parent_id, depth, created_at)
- `catchword_progress` — reading progress (id uuid, book_id unique, current_page, updated_at)
- `catchword_settings` — settings (id=1, moon_icon, moon_name, bulb_icon, bulb_name, lamp_type, updated_at)

## Author Values
- `moon` — the user (🌙)
- `bulb` — Claude (💡)

## The `quote` Field
Each annotation can include a `quote` — the specific sentence the user selected when annotating. This tells you exactly which part of the paragraph the annotation refers to, so you don't need to read the entire paragraph to understand context.

## Operations

### View all books
```sql
SELECT id, title, author, total_pages FROM catchword_books ORDER BY created_at DESC;
```

### Read a specific page
```sql
SELECT content FROM catchword_pages WHERE book_id = '<book_id>' AND page_number = <n>;
```

### View annotations on a page (with quotes for context)
```sql
SELECT a.paragraph_index, a.quote, a.author, a.content, a.id, a.parent_id
FROM catchword_annotations a
JOIN catchword_pages p ON a.page_id = p.id
WHERE a.book_id = '<book_id>' AND p.page_number = <n>
ORDER BY a.paragraph_index, a.created_at;
```

### Leave an annotation on a paragraph (with quote)
```sql
INSERT INTO catchword_annotations (page_id, book_id, paragraph_index, author, content, quote)
SELECT id, book_id, <paragraph_index>, 'bulb', 'Your annotation text', 'The exact sentence you are responding to'
FROM catchword_pages
WHERE book_id = '<book_id>' AND page_number = <page_number>;
```

### Leave an annotation without quoting a specific sentence
```sql
INSERT INTO catchword_annotations (page_id, book_id, paragraph_index, author, content)
SELECT id, book_id, <paragraph_index>, 'bulb', 'Your annotation text'
FROM catchword_pages
WHERE book_id = '<book_id>' AND page_number = <page_number>;
```

### Reply to an annotation
```sql
INSERT INTO catchword_annotations (page_id, book_id, paragraph_index, author, content, parent_id, depth)
VALUES ('<page_id>', '<book_id>', <paragraph_index>, 'bulb', 'Your reply', '<parent_annotation_id>', 1);
```

### View all annotations for a book (efficient overview)
```sql
SELECT a.content, a.quote, a.author, a.paragraph_index, p.page_number, a.parent_id, a.created_at
FROM catchword_annotations a
JOIN catchword_pages p ON a.page_id = p.id
WHERE a.book_id = '<book_id>'
ORDER BY p.page_number, a.paragraph_index, a.created_at;
```

### Check reading progress
```sql
SELECT current_page FROM catchword_progress WHERE book_id = '<book_id>';
```

## Flow
1. User uploads a book via the web page → content splits into pages in `catchword_pages`
2. User reads, selects a sentence, and leaves an annotation → data writes to `catchword_annotations` with `quote` field
3. User tells you "check page X" → you read annotations (the `quote` field shows exactly which sentence they annotated)
4. You leave your own annotations or reply → write to `catchword_annotations` with `author = 'bulb'`
5. User refreshes (↻) → sees your annotations

## Tips for Saving Tokens
- Check `quote` fields first — they tell you exactly what the user is commenting on without reading the full page
- Only read the full page content if you need broader context
- Paragraph index starts at 0, counting non-empty paragraphs on the page
- Replies have `depth = 1` and reference `parent_id` — only one level of nesting
- When annotating, include a `quote` so the user can see which sentence you're referring to
