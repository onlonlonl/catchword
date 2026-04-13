const { useState, useEffect, useRef, useCallback } = React;

// ── Constants ──
const CHARS_PER_PAGE_DEFAULT = 800;
const ICONS = { lamp: "🪔", book: "📖", glasses: "👓" };
const ICON_KEYS = ["lamp", "book", "glasses"];

// ── Helpers ──
function getBaseUrl() {
  var h = window.location.hash.replace("#", "");
  return h || "";
}
function setBaseUrl(url) {
  window.location.hash = url;
}
function api(path, opts) {
  var base = getBaseUrl();
  if (!base) return Promise.reject(new Error("No Supabase URL"));
  var url = base + "/functions/v1/catchword/" + path;
  return fetch(url, Object.assign({
    headers: { "Content-Type": "application/json" }
  }, opts || {})).then(function(r) { return r.json(); });
}

function detectEncoding(buffer) {
  var bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return "utf-8";
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return "utf-8";
  } catch(e) {
    return "gbk";
  }
}

function splitPages(text, size) {
  var paragraphs = text.split(/\n+/);
  var pages = [];
  var current = "";
  for (var i = 0; i < paragraphs.length; i++) {
    var p = paragraphs[i];
    if (current.length + p.length + 1 > size && current.length > 0) {
      pages.push(current.trim());
      current = p + "\n";
    } else {
      current += p + "\n";
    }
  }
  if (current.trim()) pages.push(current.trim());
  return pages;
}

function hashColor(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var hue = Math.abs(hash) % 360;
  return "hsl(" + hue + ", 35%, 72%)";
}

function timeAgo(dateStr) {
  var d = new Date(dateStr);
  return d.toLocaleDateString("zh-TW", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

// ── Setup Page ──
function SetupPage(props) {
  var inputRef = useRef(null);
  var _s = useState("");
  var urlVal = _s[0], setUrlVal = _s[1];
  var _e = useState("");
  var err = _e[0], setErr = _e[1];
  var _l = useState(false);
  var loading = _l[0], setLoading = _l[1];

  function handleConnect() {
    var val = urlVal.trim().replace(/\/+$/, "");
    if (!val.includes("supabase")) {
      setErr("請輸入有效的 Supabase URL");
      return;
    }
    setLoading(true);
    setErr("");
    setBaseUrl(val);
    api("books").then(function() {
      props.onConnect();
    }).catch(function(e) {
      setErr("連接失敗，請確認 URL 和 Edge Function");
      setLoading(false);
    });
  }

  return (
    React.createElement("div", { className: "setup-page" },
      React.createElement("div", { className: "setup-card" },
        React.createElement("div", { className: "setup-icon" }, "🪔"),
        React.createElement("h1", { className: "pixel-title setup-title" }, "CATCHWORD"),
        React.createElement("p", { className: "pixel-text setup-sub" }, "首次設定 First-time Setup"),
        React.createElement("p", { className: "setup-label" }, "輸入你的 Supabase Project URL："),
        React.createElement("p", { className: "setup-hint" }, "例如 https://abcdefg.supabase.co"),
        React.createElement("input", {
          ref: inputRef,
          className: "setup-input",
          placeholder: "https://xxxxx.supabase.co",
          value: urlVal,
          onChange: function(e) { setUrlVal(e.target.value); }
        }),
        err ? React.createElement("p", { className: "setup-err" }, err) : null,
        React.createElement("button", {
          className: "btn-primary",
          onClick: handleConnect,
          disabled: loading
        }, loading ? "連接中..." : "連接 Connect"),
        React.createElement("p", { className: "setup-footer" }, "需要先完成 Supabase 部署")
      )
    )
  );
}

// ── Settings Panel ──
function SettingsPanel(props) {
  var _n1 = useState(props.settings.name1 || "");
  var name1 = _n1[0], setName1 = _n1[1];
  var _n2 = useState(props.settings.name2 || "");
  var name2 = _n2[0], setName2 = _n2[1];
  var _fs = useState(props.settings.fontSize || 16);
  var fontSize = _fs[0], setFontSize = _fs[1];
  var _pp = useState(props.settings.charsPerPage || CHARS_PER_PAGE_DEFAULT);
  var charsPerPage = _pp[0], setCharsPerPage = _pp[1];

  function handleSave() {
    props.onSave({
      name1: name1 || "Moon",
      name2: name2 || "Lux",
      fontSize: fontSize,
      charsPerPage: charsPerPage,
      icon: props.settings.icon
    });
  }

  return (
    React.createElement("div", { className: "settings-overlay", onClick: function(e) { if (e.target.className === "settings-overlay") props.onClose(); } },
      React.createElement("div", { className: "settings-card" },
        React.createElement("h2", { className: "pixel-text settings-title" }, "⚙ SETTINGS 設定"),

        React.createElement("div", { className: "settings-row" },
          React.createElement("span", { className: "settings-label" }, "LEFT 左側"),
          React.createElement("div", { className: "settings-name-row" },
            React.createElement("span", { className: "settings-emoji" }, "🌙"),
            React.createElement("input", { className: "settings-input", value: name1, onChange: function(e) { setName1(e.target.value); } })
          )
        ),

        React.createElement("div", { className: "settings-row" },
          React.createElement("span", { className: "settings-label" }, "RIGHT 右側"),
          React.createElement("div", { className: "settings-name-row" },
            React.createElement("span", { className: "settings-emoji" }, "💡"),
            React.createElement("input", { className: "settings-input", value: name2, onChange: function(e) { setName2(e.target.value); } })
          )
        ),

        React.createElement("div", { className: "settings-row" },
          React.createElement("span", { className: "settings-label" }, "字體大小 Font Size"),
          React.createElement("div", { className: "settings-btn-group" },
            [14, 16, 18, 20].map(function(s) {
              return React.createElement("button", {
                key: s,
                className: "tag-btn" + (fontSize === s ? " tag-active" : ""),
                onClick: function() { setFontSize(s); }
              }, s);
            })
          )
        ),

        React.createElement("div", { className: "settings-row" },
          React.createElement("span", { className: "settings-label" }, "每頁字數 Chars/Page"),
          React.createElement("div", { className: "settings-btn-group" },
            [600, 800, 1000, 1200].map(function(s) {
              return React.createElement("button", {
                key: s,
                className: "tag-btn" + (charsPerPage === s ? " tag-active" : ""),
                onClick: function() { setCharsPerPage(s); }
              }, s);
            })
          )
        ),

        React.createElement("div", { className: "settings-row" },
          React.createElement("span", { className: "settings-label" }, "更換 Supabase URL"),
          React.createElement("button", {
            className: "tag-btn",
            onClick: function() { setBaseUrl(""); window.location.reload(); }
          }, "🔄 重設")
        ),

        React.createElement("button", { className: "btn-primary settings-done", onClick: handleSave }, "完成 Done")
      )
    )
  );
}

// ── Book Cover ──
function BookCover(props) {
  var book = props.book;
  if (book.cover_url) {
    return React.createElement("div", { className: "book-cover" },
      React.createElement("img", { src: book.cover_url, alt: book.title, className: "book-cover-img" })
    );
  }
  // Generated pixel cover
  var bg = hashColor(book.title);
  return (
    React.createElement("div", { className: "book-cover book-cover-gen", style: { background: bg } },
      React.createElement("div", { className: "book-cover-dots" }),
      React.createElement("p", { className: "pixel-text book-cover-title" }, book.title),
      book.author ? React.createElement("p", { className: "book-cover-author" }, book.author) : null
    )
  );
}

// ── Bookshelf Page ──
function BookshelfPage(props) {
  var _b = useState([]);
  var books = _b[0], setBooks = _b[1];
  var _l = useState(true);
  var loading = _l[0], setLoading = _l[1];
  var _u = useState(false);
  var uploading = _u[0], setUploading = _u[1];
  var fileRef = useRef(null);

  useEffect(function() {
    loadBooks();
  }, []);

  function loadBooks() {
    setLoading(true);
    api("books").then(function(data) {
      if (Array.isArray(data)) setBooks(data);
      setLoading(false);
    }).catch(function(e) { setLoading(false); });
  }

  function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    file.arrayBuffer().then(function(buffer) {
      var encoding = detectEncoding(buffer);
      var text = new TextDecoder(encoding).decode(buffer);
      var pages = splitPages(text, props.settings.charsPerPage || CHARS_PER_PAGE_DEFAULT);
      var title = file.name.replace(/\.\w+$/, "");

      return api("books", {
        method: "POST",
        body: JSON.stringify({ title: title, author: "", total_pages: pages.length })
      }).then(function(book) {
        var pageRows = pages.map(function(content, i) {
          return { book_id: book.id, page_number: i, content: content };
        });
        // Batch insert in chunks of 50
        var chunks = [];
        for (var i = 0; i < pageRows.length; i += 50) {
          chunks.push(pageRows.slice(i, i + 50));
        }
        return chunks.reduce(function(prev, chunk) {
          return prev.then(function() {
            return api("pages", { method: "POST", body: JSON.stringify({ pages: chunk }) });
          });
        }, Promise.resolve()).then(function() {
          setUploading(false);
          loadBooks();
        });
      });
    }).catch(function(e) {
      alert("上傳失敗: " + e.message);
      setUploading(false);
    });
  }

  return (
    React.createElement("div", { className: "bookshelf-page" },
      React.createElement("div", { className: "page-header" },
        React.createElement("div", null),
        React.createElement("div", { className: "header-center" },
          React.createElement("div", { className: "main-icon" }, ICONS[props.settings.icon || "lamp"]),
          React.createElement("h1", { className: "pixel-title" }, "CATCHWORD")
        ),
        React.createElement("button", { className: "icon-btn settings-btn", onClick: props.onOpenSettings, title: "Settings" }, "🪔")
      ),
      React.createElement("div", { className: "shelf-divider" }),

      React.createElement("div", { className: "shelf-actions" },
        React.createElement("button", {
          className: "btn-primary upload-btn",
          onClick: function() { fileRef.current && fileRef.current.click(); },
          disabled: uploading
        }, uploading ? "上傳中..." : "＋ 上傳書籍 Upload"),
        React.createElement("input", {
          ref: fileRef,
          type: "file",
          accept: ".txt,.md,.text",
          style: { display: "none" },
          onChange: function(e) { handleUpload(e.target.files[0]); }
        }),
        React.createElement("div", { className: "icon-switch" },
          ICON_KEYS.map(function(k) {
            return React.createElement("button", {
              key: k,
              className: "icon-option" + ((props.settings.icon || "lamp") === k ? " icon-active" : ""),
              onClick: function() { props.onUpdateSettings(Object.assign({}, props.settings, { icon: k })); }
            }, ICONS[k]);
          })
        )
      ),

      loading
        ? React.createElement("p", { className: "loading-text pixel-text" }, "載入中...")
        : books.length === 0
          ? React.createElement("div", { className: "empty-shelf" },
              React.createElement("p", { className: "pixel-text" }, "書架空空的"),
              React.createElement("p", null, "上傳一本 .txt 開始閱讀吧")
            )
          : React.createElement("div", { className: "book-grid" },
              books.map(function(book) {
                return React.createElement("div", {
                  key: book.id,
                  className: "book-card",
                  onClick: function() { props.onSelectBook(book); }
                },
                  React.createElement(BookCover, { book: book }),
                  React.createElement("h3", { className: "book-card-title" }, book.title),
                  book.author ? React.createElement("p", { className: "book-card-author" }, book.author) : null,
                  React.createElement("p", { className: "book-card-pages pixel-text" }, book.total_pages + " pages")
                );
              })
            )
    )
  );
}

// ── Annotation Component ──
function AnnotationItem(props) {
  var a = props.annotation;
  var replies = props.replies || [];
  var _r = useState(false);
  var showReply = _r[0], setShowReply = _r[1];
  var _t = useState("");
  var replyText = _t[0], setReplyText = _t[1];

  var isMoon = a.author === "moon";
  var authorName = isMoon ? (props.settings.name1 || "Moon") : (props.settings.name2 || "Lux");
  var authorEmoji = isMoon ? "🌙" : "💡";

  function submitReply() {
    if (!replyText.trim()) return;
    props.onReply(a.id, replyText.trim());
    setReplyText("");
    setShowReply(false);
  }

  return (
    React.createElement("div", { className: "annotation " + (isMoon ? "ann-moon" : "ann-bulb") },
      React.createElement("div", { className: "ann-header" },
        React.createElement("span", { className: "ann-author" }, authorEmoji + " " + authorName),
        React.createElement("span", { className: "ann-time" }, timeAgo(a.created_at))
      ),
      React.createElement("p", { className: "ann-content" }, a.content),
      React.createElement("div", { className: "ann-actions" },
        !showReply && a.depth === 0
          ? React.createElement("button", { className: "ann-reply-btn", onClick: function() { setShowReply(true); } }, "↩ 回覆")
          : null
      ),
      replies.map(function(r) {
        return React.createElement(AnnotationItem, { key: r.id, annotation: r, replies: [], settings: props.settings, onReply: props.onReply });
      }),
      showReply ? React.createElement("div", { className: "ann-reply-box" },
        React.createElement("div", { className: "ann-reply-author-toggle" },
          React.createElement("button", {
            className: "tag-btn" + (props.replyAuthor === "moon" ? " tag-active" : ""),
            onClick: function() { props.setReplyAuthor("moon"); }
          }, "🌙"),
          React.createElement("button", {
            className: "tag-btn" + (props.replyAuthor === "bulb" ? " tag-active-bulb" : ""),
            onClick: function() { props.setReplyAuthor("bulb"); }
          }, "💡")
        ),
        React.createElement("input", {
          className: "ann-reply-input",
          value: replyText,
          onChange: function(e) { setReplyText(e.target.value); },
          onKeyDown: function(e) { if (e.key === "Enter") submitReply(); },
          placeholder: "回覆..."
        }),
        React.createElement("button", { className: "ann-reply-send", onClick: submitReply }, "↵")
      ) : null
    )
  );
}

// ── Reader Page ──
function ReaderPage(props) {
  var book = props.book;
  var _p = useState(0);
  var page = _p[0], setPage = _p[1];
  var _c = useState("");
  var content = _c[0], setContent = _c[1];
  var _pid = useState(null);
  var pageId = _pid[0], setPageId = _pid[1];
  var _a = useState([]);
  var annotations = _a[0], setAnnotations = _a[1];
  var _na = useState("");
  var newAnn = _na[0], setNewAnn = _na[1];
  var _author = useState("moon");
  var annAuthor = _author[0], setAnnAuthor = _author[1];
  var _ra = useState("moon");
  var replyAuthor = _ra[0], setReplyAuthor = _ra[1];
  var _sel = useState(-1);
  var selPara = _sel[0], setSelPara = _sel[1];
  var _loading = useState(true);
  var loading = _loading[0], setLoading = _loading[1];
  var contentRef = useRef(null);

  useEffect(function() {
    // Load saved progress
    api("progress?book_id=" + book.id).then(function(data) {
      if (data && data.current_page) setPage(data.current_page);
    }).catch(function(e) {});
  }, [book.id]);

  useEffect(function() {
    loadPage(page);
  }, [page, book.id]);

  function loadPage(p) {
    setLoading(true);
    api("pages?book_id=" + book.id + "&page=" + p).then(function(data) {
      setContent(data.content || "");
      setPageId(data.id || null);
      setLoading(false);
      // Save progress
      api("progress", { method: "POST", body: JSON.stringify({ book_id: book.id, current_page: p }) }).catch(function(e) {});
      // Load annotations
      if (data.id) {
        api("annotations?page_id=" + data.id).then(function(anns) {
          if (Array.isArray(anns)) setAnnotations(anns);
        }).catch(function(e) {});
      }
    }).catch(function(e) { setLoading(false); });
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }

  function submitAnnotation() {
    if (!newAnn.trim() || !pageId) return;
    api("annotations", {
      method: "POST",
      body: JSON.stringify({
        page_id: pageId,
        book_id: book.id,
        paragraph_index: selPara >= 0 ? selPara : 0,
        author: annAuthor,
        content: newAnn.trim()
      })
    }).then(function(data) {
      setAnnotations(function(prev) { return prev.concat([data]); });
      setNewAnn("");
      setSelPara(-1);
    }).catch(function(e) {});
  }

  function submitReply(parentId, text) {
    if (!text.trim() || !pageId) return;
    api("annotations", {
      method: "POST",
      body: JSON.stringify({
        page_id: pageId,
        book_id: book.id,
        paragraph_index: 0,
        author: replyAuthor,
        content: text,
        parent_id: parentId
      })
    }).then(function(data) {
      setAnnotations(function(prev) { return prev.concat([data]); });
    }).catch(function(e) {});
  }

  var paragraphs = content ? content.split("\n") : [];
  var topAnnotations = annotations.filter(function(a) { return !a.parent_id; });
  var progress = book.total_pages > 0 ? ((page + 1) / book.total_pages * 100) : 0;

  return (
    React.createElement("div", { className: "reader-page" },
      // Header
      React.createElement("div", { className: "reader-header" },
        React.createElement("button", { className: "icon-btn", onClick: props.onBack }, "←"),
        React.createElement("div", { className: "reader-title-area" },
          React.createElement("h2", { className: "reader-book-title" }, book.title),
          React.createElement("span", { className: "pixel-text reader-page-info" },
            (page + 1) + " / " + book.total_pages
          )
        ),
        React.createElement("button", { className: "icon-btn", onClick: function() { loadPage(page); } }, "↻")
      ),
      // Progress
      React.createElement("div", { className: "progress-track" },
        React.createElement("div", { className: "progress-bar", style: { width: progress + "%" } })
      ),

      // Content
      React.createElement("div", { className: "reader-content", ref: contentRef },
        loading
          ? React.createElement("p", { className: "loading-text pixel-text" }, "載入中...")
          : React.createElement("div", { className: "page-text" },
              paragraphs.map(function(line, i) {
                return React.createElement("p", {
                  key: i,
                  className: "paragraph" + (selPara === i ? " para-selected" : ""),
                  style: { fontSize: (props.settings.fontSize || 16) + "px" },
                  onClick: function() { setSelPara(selPara === i ? -1 : i); }
                }, line || "\u00A0");
              })
            ),

        // Annotations
        topAnnotations.length > 0
          ? React.createElement("div", { className: "annotations-section" },
              React.createElement("div", { className: "ann-divider" },
                React.createElement("span", { className: "pixel-text ann-divider-text" }, "ANNOTATIONS 批註")
              ),
              topAnnotations.map(function(a) {
                var replies = annotations.filter(function(r) { return r.parent_id === a.id; });
                return React.createElement(AnnotationItem, {
                  key: a.id,
                  annotation: a,
                  replies: replies,
                  settings: props.settings,
                  onReply: submitReply,
                  replyAuthor: replyAuthor,
                  setReplyAuthor: setReplyAuthor
                });
              })
            )
          : null
      ),

      // Input area
      React.createElement("div", { className: "reader-input-area" },
        React.createElement("div", { className: "ann-author-toggle" },
          React.createElement("button", {
            className: "tag-btn" + (annAuthor === "moon" ? " tag-active" : ""),
            onClick: function() { setAnnAuthor("moon"); }
          }, "🌙 " + (props.settings.name1 || "Moon")),
          React.createElement("button", {
            className: "tag-btn" + (annAuthor === "bulb" ? " tag-active-bulb" : ""),
            onClick: function() { setAnnAuthor("bulb"); }
          }, "💡 " + (props.settings.name2 || "Lux")),
          selPara >= 0
            ? React.createElement("span", { className: "sel-indicator pixel-text" }, "¶" + (selPara + 1))
            : null
        ),
        React.createElement("div", { className: "input-row" },
          React.createElement("input", {
            className: "ann-input",
            value: newAnn,
            onChange: function(e) { setNewAnn(e.target.value); },
            onKeyDown: function(e) { if (e.key === "Enter") submitAnnotation(); },
            placeholder: "留言..."
          }),
          React.createElement("button", {
            className: "send-btn",
            onClick: submitAnnotation,
            style: { opacity: newAnn.trim() ? 1 : 0.4 }
          }, "↵")
        )
      ),

      // Navigation
      React.createElement("div", { className: "reader-nav" },
        React.createElement("button", {
          className: "nav-btn",
          onClick: function() { if (page > 0) setPage(page - 1); },
          disabled: page <= 0
        }, "← 上一頁"),
        React.createElement("span", { className: "pixel-text nav-page" }, (page + 1) + " / " + book.total_pages),
        React.createElement("button", {
          className: "nav-btn",
          onClick: function() { if (page < book.total_pages - 1) setPage(page + 1); },
          disabled: page >= book.total_pages - 1
        }, "下一頁 →")
      )
    )
  );
}

// ── App ──
function App() {
  var _v = useState("loading");
  var view = _v[0], setView = _v[1];
  var _book = useState(null);
  var selBook = _book[0], setSelBook = _book[1];
  var _show = useState(false);
  var showSettings = _show[0], setShowSettings = _show[1];
  var _s = useState({
    name1: "Moon",
    name2: "Lux",
    fontSize: 16,
    charsPerPage: CHARS_PER_PAGE_DEFAULT,
    icon: "lamp"
  });
  var settings = _s[0], setSettings = _s[1];

  useEffect(function() {
    // Load settings from localStorage
    try {
      var saved = localStorage.getItem("catchword_settings");
      if (saved) setSettings(JSON.parse(saved));
    } catch(e) {}

    // Check if has Supabase URL
    var base = getBaseUrl();
    if (!base) {
      setView("setup");
    } else {
      // Test connection
      api("books").then(function() {
        setView("shelf");
      }).catch(function(e) {
        setView("setup");
      });
    }
  }, []);

  function saveSettings(s) {
    setSettings(s);
    try { localStorage.setItem("catchword_settings", JSON.stringify(s)); } catch(e) {}
    setShowSettings(false);
  }

  if (view === "loading") {
    return React.createElement("div", { className: "app loading-screen" },
      React.createElement("div", { className: "main-icon" }, "🪔"),
      React.createElement("p", { className: "pixel-text" }, "CATCHWORD")
    );
  }

  if (view === "setup") {
    return React.createElement("div", { className: "app" },
      React.createElement(SetupPage, { onConnect: function() { setView("shelf"); } })
    );
  }

  if (view === "reader" && selBook) {
    return React.createElement("div", { className: "app" },
      React.createElement(ReaderPage, {
        book: selBook,
        settings: settings,
        onBack: function() { setView("shelf"); setSelBook(null); }
      }),
      showSettings ? React.createElement(SettingsPanel, {
        settings: settings,
        onSave: saveSettings,
        onClose: function() { setShowSettings(false); }
      }) : null
    );
  }

  return React.createElement("div", { className: "app" },
    React.createElement(BookshelfPage, {
      settings: settings,
      onSelectBook: function(b) { setSelBook(b); setView("reader"); },
      onOpenSettings: function() { setShowSettings(true); },
      onUpdateSettings: saveSettings
    }),
    showSettings ? React.createElement(SettingsPanel, {
      settings: settings,
      onSave: saveSettings,
      onClose: function() { setShowSettings(false); }
    }) : null
  );
}

ReactDOM.render(React.createElement(App), document.getElementById("root"));
