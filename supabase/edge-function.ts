import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/catchword\/?/, "");
  const segments = path.split("/").filter(Boolean);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    // === SEARCH (Google Books) ===
    if (segments[0] === "search" && req.method === "GET") {
      const q = url.searchParams.get("q") || "";
      if (!q) return json({ error: "Missing q" }, 400);
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5`
      );
      const data = await res.json();
      const results = (data.items || []).map((item: any) => {
        const v = item.volumeInfo || {};
        return {
          title: v.title || "",
          author: (v.authors || []).join(", "),
          cover:
            v.imageLinks?.thumbnail?.replace("http://", "https://") || "",
          pages: v.pageCount || 0,
          description: v.description?.slice(0, 200) || "",
        };
      });
      return json(results);
    }

    // === SETTINGS ===
    if (segments[0] === "settings") {
      if (req.method === "GET") {
        const { data, error } = await sb
          .from("catchword_settings")
          .select("*")
          .eq("id", 1)
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (req.method === "PATCH") {
        const body = await req.json();
        const { data, error } = await sb
          .from("catchword_settings")
          .update(body)
          .eq("id", 1)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
    }

    // === BOOKS ===
    if (segments[0] === "books") {
      if (req.method === "GET" && segments.length === 1) {
        const { data, error } = await sb
          .from("catchword_books")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (req.method === "GET" && segments.length === 2) {
        const { data, error } = await sb
          .from("catchword_books")
          .select("*")
          .eq("id", segments[1])
          .single();
        if (error) return json({ error: error.message }, 404);
        return json(data);
      }
      if (req.method === "POST" && segments.length === 1) {
        const body = await req.json();
        const { data, error } = await sb
          .from("catchword_books")
          .insert({
            title: body.title,
            author: body.author || "",
            cover_url: body.cover_url || "",
            total_pages: body.total_pages || 0,
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (req.method === "PATCH" && segments.length === 2) {
        const body = await req.json();
        const { data, error } = await sb
          .from("catchword_books")
          .update(body)
          .eq("id", segments[1])
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (req.method === "DELETE" && segments.length === 2) {
        const { error } = await sb
          .from("catchword_books")
          .delete()
          .eq("id", segments[1]);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }
    }

    // === PAGES ===
    if (segments[0] === "pages") {
      if (req.method === "GET" && segments.length === 1) {
        const bookId = url.searchParams.get("book_id");
        const pageNum = url.searchParams.get("page");
        if (bookId && pageNum) {
          const { data, error } = await sb
            .from("catchword_pages")
            .select("*")
            .eq("book_id", bookId)
            .eq("page_number", parseInt(pageNum))
            .single();
          if (error) return json({ error: error.message }, 404);
          return json(data);
        }
        if (bookId) {
          const { data, error } = await sb
            .from("catchword_pages")
            .select("id, book_id, page_number")
            .eq("book_id", bookId)
            .order("page_number");
          if (error) return json({ error: error.message }, 500);
          return json(data);
        }
      }
      if (req.method === "POST") {
        const body = await req.json();
        const { data, error } = await sb
          .from("catchword_pages")
          .insert(body.pages)
          .select();
        if (error) return json({ error: error.message }, 500);
        return json({ count: data.length });
      }
    }

    // === ANNOTATIONS ===
    if (segments[0] === "annotations") {
      if (req.method === "GET" && segments.length === 1) {
        const pageId = url.searchParams.get("page_id");
        const bookId = url.searchParams.get("book_id");
        let query = sb
          .from("catchword_annotations")
          .select("*")
          .order("created_at", { ascending: true });
        if (pageId) query = query.eq("page_id", pageId);
        if (bookId) query = query.eq("book_id", bookId);
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (req.method === "POST" && segments.length === 1) {
        const body = await req.json();
        const insert: Record<string, unknown> = {
          page_id: body.page_id,
          book_id: body.book_id,
          paragraph_index: body.paragraph_index ?? 0,
          author: body.author,
          content: body.content,
          quote: body.quote || "",
        };
        if (body.parent_id) {
          insert.parent_id = body.parent_id;
          insert.depth = 1;
        }
        const { data, error } = await sb
          .from("catchword_annotations")
          .insert(insert)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (req.method === "DELETE" && segments.length === 2) {
        const { error } = await sb
          .from("catchword_annotations")
          .delete()
          .eq("id", segments[1]);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }
    }

    // === PROGRESS ===
    if (segments[0] === "progress") {
      if (req.method === "GET") {
        const bookId = url.searchParams.get("book_id");
        const { data, error } = await sb
          .from("catchword_progress")
          .select("*")
          .eq("book_id", bookId)
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        return json(data || { current_page: 0 });
      }
      if (req.method === "POST") {
        const body = await req.json();
        const { data, error } = await sb
          .from("catchword_progress")
          .upsert(
            {
              book_id: body.book_id,
              current_page: body.current_page,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "book_id" }
          )
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});
