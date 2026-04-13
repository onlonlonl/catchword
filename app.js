var h = React.createElement;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;

var CHARS_PER_PAGE_DEFAULT = 800;
var ICON_DATA = {
  lamp: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAzUlEQVR4nO2ZMQ6CUBBExVNwE0obD0CLVt7AysbaxoobUCEtB7Cx9CbeAnoxTH5GMmwyr9/wX3Y22f/JNiTvthyY+uLYZ0z9lileAxZQk5y/z+tMZR6R7+qkM4XvgAXUwLwtnXkEmonwHbCAmkm+1JlHfM9E+A5YQI0F1FhADdyF2DsvC7ozh++ABdRQbzK/uHbP2Zm5Vfu/fjN8ByygxgJqLKDGAmosoMYCaiyght7N0f6PYO8H4TtgATXJ+Tvcm0XfiR6Xk/8ThyK8wAiQoCBZkE/p4QAAAABJRU5ErkJggg==",
  book: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAt0lEQVR4nO3Zuw2DMBRGYUCsQZFZYAhIlyXSpE2aLEEHS7BLCgYhbeTC1pWxfls5X8njiiMDBVQV8N/q0AGPdTssA1/T4J159rzGMixHBKi17gb3Hn2OvXGk/x6Pnec+E8WvAAFq5oA6IPX50QG5IUCNADUC1AhQI0CNADUC1AhQI0DNHHAEpD4/OiA3BKid/n/gs+/e/Zeus4zj/0D2ig8wf4t0Xd+z+d39a7nfoq6h+BUgAIDWF8QtXQRout8UAAAAAElFTkSuQmCC",
  glasses: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAr0lEQVR4nO3XQQ7CIBCFYTDcTA+h3XkJN7rUjZdwZz2Enm1cMyZMCE0G7P/t2jSvfQFKCAEAAGC9or5xnt/SEng77LLMpfO0TUt4DyjgLek5et1vqwIur092Pd0fxTlfmx9C/n16TQw/AhTwlqwHYozF/7BeQ8/TsbgPWHkiUrVvDD8CFPBGAW8U8GYWEEPtC5fO+/8R6N3wBdLvmbPtDGvR5wcLZ+LeDV8AAABgzb5vmGVwYWrR5wAAAABJRU5ErkJggg=="
};
var ICON_KEYS = ["lamp", "book", "glasses"];

function getBaseUrl() { return (window.location.hash || "").replace("#", ""); }
function setBaseUrl(u) { window.location.hash = u; }
function api(path, opts) {
  var base = getBaseUrl();
  if (!base) return Promise.reject(new Error("No URL"));
  return fetch(base + "/functions/v1/catchword/" + path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts || {})).then(function(r) { return r.json(); });
}

function detectEncoding(buf) {
  var b = new Uint8Array(buf);
  if (b[0]===0xEF && b[1]===0xBB && b[2]===0xBF) return "utf-8";
  try { new TextDecoder("utf-8",{fatal:true}).decode(buf); return "utf-8"; } catch(e) { return "gbk"; }
}

function splitPages(text, size) {
  var ps = text.split(/\n+/), pages = [], cur = "";
  for (var i=0; i<ps.length; i++) {
    if (cur.length + ps[i].length + 1 > size && cur.length > 0) { pages.push(cur.trim()); cur = ps[i]+"\n"; }
    else { cur += ps[i]+"\n"; }
  }
  if (cur.trim()) pages.push(cur.trim());
  return pages;
}

function hashColor(s) { var h=0; for(var i=0;i<s.length;i++) h=s.charCodeAt(i)+((h<<5)-h); return "hsl("+Math.abs(h)%360+",35%,72%)"; }
function fmtTime(d) { var dt=new Date(d); return dt.toLocaleDateString("zh-TW",{month:"short",day:"numeric"})+" "+dt.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"}); }

// EPUB parsing
function parseEpub(arrayBuffer) {
  return JSZip.loadAsync(arrayBuffer).then(function(zip) {
    return zip.file("META-INF/container.xml").async("string").then(function(containerXml) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(containerXml, "text/xml");
      var rootfile = doc.querySelector("rootfile");
      var opfPath = rootfile.getAttribute("full-path");
      var opfDir = opfPath.replace(/[^/]*$/, "");
      return zip.file(opfPath).async("string").then(function(opfXml) {
        var opfDoc = parser.parseFromString(opfXml, "text/xml");
        var spine = opfDoc.querySelectorAll("spine itemref");
        var manifest = opfDoc.querySelectorAll("manifest item");
        var manifestMap = {};
        for (var i=0; i<manifest.length; i++) {
          manifestMap[manifest[i].getAttribute("id")] = manifest[i].getAttribute("href");
        }
        var contentFiles = [];
        for (var j=0; j<spine.length; j++) {
          var idref = spine[j].getAttribute("idref");
          if (manifestMap[idref]) contentFiles.push(opfDir + manifestMap[idref]);
        }
        return Promise.all(contentFiles.map(function(f) {
          var zf = zip.file(f);
          if (!zf) return "";
          return zf.async("string");
        }));
      });
    });
  }).then(function(htmlContents) {
    var allText = "";
    var parser = new DOMParser();
    for (var i=0; i<htmlContents.length; i++) {
      if (!htmlContents[i]) continue;
      var doc = parser.parseFromString(htmlContents[i], "text/html");
      var body = doc.querySelector("body");
      if (body) allText += body.textContent.trim() + "\n\n";
    }
    return allText;
  });
}

function readFile(file) {
  var ext = file.name.split(".").pop().toLowerCase();
  if (ext === "epub") {
    return file.arrayBuffer().then(function(buf) { return parseEpub(buf); });
  }
  return file.arrayBuffer().then(function(buf) {
    var enc = detectEncoding(buf);
    return new TextDecoder(enc).decode(buf);
  });
}

// ── Setup Page ──
function SetupPage(props) {
  var _u=useState(""), url=_u[0], setUrl=_u[1];
  var _e=useState(""), err=_e[0], setErr=_e[1];
  var _l=useState(false), loading=_l[0], setLoading=_l[1];
  function connect() {
    var v = url.trim().replace(/\/+$/,"");
    if (!v.includes("supabase")) { setErr("請輸入有效的 Supabase URL"); return; }
    setLoading(true); setErr("");
    setBaseUrl(v);
    api("books").then(function() { props.onConnect(); }).catch(function(e) { setErr("連接失敗"); setLoading(false); });
  }
  return h("div",{className:"wrap"},
    h("div",{className:"setup-page"},
      h("div",{className:"setup-card"},
        h("div",{className:"setup-icon"}, h("img",{src:ICON_DATA.lamp})),
        h("h1",{className:"setup-title"},"CATCHWORD"),
        h("p",{className:"setup-sub"},"首次設定 First-time Setup"),
        h("p",{className:"setup-label"},"輸入你的 Supabase Project URL："),
        h("p",{className:"setup-hint"},"例如 https://abcdefg.supabase.co"),
        h("input",{className:"input",placeholder:"https://xxxxx.supabase.co",value:url,onChange:function(e){setUrl(e.target.value)}}),
        err ? h("p",{className:"setup-err"},err) : null,
        h("button",{className:"submit-btn",onClick:connect,disabled:loading}, loading?"連接中...":"連接 Connect"),
        h("p",{className:"setup-footer"},"需要先完成 Supabase 部署")
      )
    )
  );
}

// ── Settings ──
function Settings(props) {
  var s = props.settings;
  var _n1=useState(s.name1||""), n1=_n1[0], sn1=_n1[1];
  var _n2=useState(s.name2||""), n2=_n2[0], sn2=_n2[1];
  var _fs=useState(s.fontSize||16), fs=_fs[0], sfs=_fs[1];
  var _cp=useState(s.charsPerPage||CHARS_PER_PAGE_DEFAULT), cp=_cp[0], scp=_cp[1];
  function save() { props.onSave({name1:n1||"Moon",name2:n2||"Lux",fontSize:fs,charsPerPage:cp,icon:s.icon}); }
  return h("div",{className:"overlay",onClick:function(e){if(e.target.className==="overlay")props.onClose();}},
    h("div",{className:"modal"},
      h("div",{className:"modal-title"},"⚙ SETTINGS 設定"),
      h("div",{className:"setting-row"},
        h("span",{className:"setting-label"},"LEFT 左側"),
        h("div",{className:"setting-name-row"}, h("span",{className:"setting-emoji"},"🌙"), h("input",{className:"setting-input",value:n1,onChange:function(e){sn1(e.target.value);}}))
      ),
      h("div",{className:"setting-row"},
        h("span",{className:"setting-label"},"RIGHT 右側"),
        h("div",{className:"setting-name-row"}, h("span",{className:"setting-emoji"},"💡"), h("input",{className:"setting-input",value:n2,onChange:function(e){sn2(e.target.value);}}))
      ),
      h("div",{className:"setting-row"},
        h("span",{className:"setting-label"},"字體大小 Font Size"),
        h("div",{className:"setting-btn-group"}, [14,16,18,20].map(function(v){ return h("button",{key:v,className:"tag-btn"+(fs===v?" tag-active":""),onClick:function(){sfs(v);}},v); }))
      ),
      h("div",{className:"setting-row"},
        h("span",{className:"setting-label"},"每頁字數 Chars/Page"),
        h("div",{className:"setting-btn-group"}, [600,800,1000,1200].map(function(v){ return h("button",{key:v,className:"tag-btn"+(cp===v?" tag-active":""),onClick:function(){scp(v);}},v); }))
      ),
      h("div",{className:"setting-row"},
        h("span",{className:"setting-label"},"更換 Supabase URL"),
        h("button",{className:"tag-btn",onClick:function(){setBaseUrl("");window.location.reload();}},"🔄 重設 Reset")
      ),
      h("button",{className:"submit-btn",onClick:save},"完成 Done")
    )
  );
}

// ── Book Cover ──
function BookCover(props) {
  var b = props.book;
  if (b.cover_url) return h("div",{className:"book-cover"}, h("img",{src:b.cover_url,className:"book-cover-img"}));
  return h("div",{className:"book-cover book-cover-gen",style:{background:hashColor(b.title)}},
    h("div",{className:"book-cover-dots"}),
    h("p",{className:"book-cover-title"},b.title),
    b.author ? h("p",{className:"book-cover-author"},b.author) : null
  );
}

// ── Bookshelf ──
function Bookshelf(props) {
  var _b=useState([]), books=_b[0], setBooks=_b[1];
  var _l=useState(true), loading=_l[0], setLoading=_l[1];
  var _u=useState(false), uploading=_u[0], setUploading=_u[1];
  var fileRef = useRef(null);
  var s = props.settings;

  useEffect(function() { load(); }, []);
  function load() {
    setLoading(true);
    api("books").then(function(d){ if(Array.isArray(d)) setBooks(d); setLoading(false); }).catch(function(e){ setLoading(false); });
  }

  function upload(file) {
    if (!file) return;
    setUploading(true);
    readFile(file).then(function(text) {
      var pages = splitPages(text, s.charsPerPage || CHARS_PER_PAGE_DEFAULT);
      var title = file.name.replace(/\.\w+$/, "");
      return api("books",{method:"POST",body:JSON.stringify({title:title,total_pages:pages.length})}).then(function(book) {
        var rows = pages.map(function(c,i){ return {book_id:book.id,page_number:i,content:c}; });
        var chunks = [];
        for (var i=0;i<rows.length;i+=50) chunks.push(rows.slice(i,i+50));
        return chunks.reduce(function(p,chunk){ return p.then(function(){ return api("pages",{method:"POST",body:JSON.stringify({pages:chunk})}); }); }, Promise.resolve()).then(function(){ setUploading(false); load(); });
      });
    }).catch(function(e){ alert("上傳失敗: "+e.message); setUploading(false); });
  }

  function deleteBook(e, bookId) {
    e.stopPropagation();
    if (!confirm("確定刪除這本書？")) return;
    api("books/"+bookId, {method:"DELETE"}).then(function(){ load(); }).catch(function(e){});
  }

  return h("div",{className:"wrap"},
    h("div",{className:"header"},
      h("div",{style:{marginBottom:4}}, h("img",{src:ICON_DATA[s.icon||"lamp"],style:{width:36,height:36,imageRendering:"pixelated"}})),
      h("h1",null,"CATCHWORD"),
      h("div",{className:"gear",onClick:props.onOpenSettings},
        h("img",{className:"gear-img",src:ICON_DATA.lamp}),
        "設定"
      )
    ),
    h("div",{className:"shelf-actions"},
      h("button",{className:"btn"+(uploading?" active":""),onClick:function(){fileRef.current&&fileRef.current.click();},disabled:uploading},
        uploading ? "上傳中..." : "＋ 上傳 Upload"
      ),
      h("input",{ref:fileRef,type:"file",accept:".txt,.md,.text,.epub",style:{display:"none"},onChange:function(e){upload(e.target.files[0]);}}),
      h("div",{className:"icon-switch"},
        ICON_KEYS.map(function(k){ return h("button",{key:k,className:"icon-option"+((s.icon||"lamp")===k?" active":""),onClick:function(){props.onUpdateSettings(Object.assign({},s,{icon:k}));}}, h("img",{src:ICON_DATA[k]})); })
      )
    ),
    loading ? h("p",{className:"loading-text"},"載入中...")
    : books.length===0 ? h("div",{className:"empty-shelf"}, h("p",null,"書架空空的"), h("p",null,"上傳 .txt 或 .epub 開始閱讀吧"))
    : h("div",{className:"book-grid"},
        books.map(function(b){ return h("div",{key:b.id,className:"book-card",onClick:function(){props.onSelect(b);}},
          h(BookCover,{book:b}),
          h("h3",{className:"book-card-title"},b.title),
          b.author ? h("p",{className:"book-card-author"},b.author) : null,
          h("p",{className:"book-card-pages"},b.total_pages+" pages")
        ); })
      ),
    h("div",{className:"footer"},"CATCHWORD · 🪔")
  );
}

// ── Annotation Item ──
function AnnItem(props) {
  var a=props.annotation, replies=props.replies||[];
  var _r=useState(false), show=_r[0], setShow=_r[1];
  var _t=useState(""), txt=_t[0], setTxt=_t[1];
  var isMoon = a.author==="moon";
  var name = isMoon ? (props.settings.name1||"Moon") : (props.settings.name2||"Lux");
  var emoji = isMoon ? "🌙" : "💡";
  function submit() { if(!txt.trim()) return; props.onReply(a.id,txt.trim()); setTxt(""); setShow(false); }

  return h("div",{className:"annotation "+(isMoon?"ann-moon":"ann-bulb")},
    h("div",{className:"ann-header"},
      h("span",{className:"ann-author"},emoji+" "+name),
      h("span",{className:"ann-time"},fmtTime(a.created_at))
    ),
    h("p",{className:"ann-content"},a.content),
    !show && a.depth===0 ? h("button",{className:"ann-reply-btn",onClick:function(){setShow(true);}},"↩ 回覆") : null,
    replies.map(function(r){ return h(AnnItem,{key:r.id,annotation:r,replies:[],settings:props.settings,onReply:props.onReply,replyAuthor:props.replyAuthor,setReplyAuthor:props.setReplyAuthor}); }),
    show ? h("div",{className:"ann-reply-box"},
      h("div",{style:{display:"flex",gap:4}},
        h("button",{className:"tag-btn"+(props.replyAuthor==="moon"?" tag-active":""),onClick:function(){props.setReplyAuthor("moon");}},"🌙"),
        h("button",{className:"tag-btn"+(props.replyAuthor==="bulb"?" tag-active-bulb":""),onClick:function(){props.setReplyAuthor("bulb");}},"💡")
      ),
      h("input",{className:"ann-reply-input",value:txt,onChange:function(e){setTxt(e.target.value);},onKeyDown:function(e){if(e.key==="Enter")submit();},placeholder:"回覆..."}),
      h("button",{className:"ann-reply-send",onClick:submit},"↵")
    ) : null
  );
}

// ── Reader ──
function Reader(props) {
  var book=props.book, s=props.settings;
  var _p=useState(0), page=_p[0], setPage=_p[1];
  var _c=useState(""), content=_c[0], setContent=_c[1];
  var _pid=useState(null), pageId=_pid[0], setPageId=_pid[1];
  var _a=useState([]), anns=_a[0], setAnns=_a[1];
  var _na=useState(""), newAnn=_na[0], setNewAnn=_na[1];
  var _au=useState("moon"), author=_au[0], setAuthor=_au[1];
  var _ra=useState("moon"), rAuthor=_ra[0], setRAuthor=_ra[1];
  var _sel=useState(-1), selP=_sel[0], setSelP=_sel[1];
  var _ld=useState(true), ld=_ld[0], setLd=_ld[1];
  var ref = useRef(null);

  useEffect(function() {
    api("progress?book_id="+book.id).then(function(d){ if(d&&d.current_page) setPage(d.current_page); }).catch(function(e){});
  }, [book.id]);

  useEffect(function() { loadPage(page); }, [page,book.id]);

  function loadPage(p) {
    setLd(true);
    api("pages?book_id="+book.id+"&page="+p).then(function(d) {
      setContent(d.content||""); setPageId(d.id||null); setLd(false);
      api("progress",{method:"POST",body:JSON.stringify({book_id:book.id,current_page:p})}).catch(function(e){});
      if(d.id) api("annotations?page_id="+d.id).then(function(a){if(Array.isArray(a))setAnns(a);}).catch(function(e){});
    }).catch(function(e){setLd(false);});
    if(ref.current) ref.current.scrollTop=0;
  }

  function submitAnn() {
    if(!newAnn.trim()||!pageId) return;
    api("annotations",{method:"POST",body:JSON.stringify({page_id:pageId,book_id:book.id,paragraph_index:selP>=0?selP:0,author:author,content:newAnn.trim()})})
    .then(function(d){setAnns(function(p){return p.concat([d]);}); setNewAnn(""); setSelP(-1);}).catch(function(e){});
  }
  function submitReply(parentId,text) {
    if(!text.trim()||!pageId) return;
    api("annotations",{method:"POST",body:JSON.stringify({page_id:pageId,book_id:book.id,paragraph_index:0,author:rAuthor,content:text,parent_id:parentId})})
    .then(function(d){setAnns(function(p){return p.concat([d]);});}).catch(function(e){});
  }

  var paras = content ? content.split("\n") : [];
  var tops = anns.filter(function(a){return !a.parent_id;});
  var pct = book.total_pages>0 ? (page+1)/book.total_pages*100 : 0;

  return h("div",{className:"wrap"},
    h("div",{className:"reader-page"},
      h("div",{className:"reader-header"},
        h("button",{className:"icon-btn",onClick:props.onBack},"←"),
        h("div",{className:"reader-title-area"},
          h("div",{className:"reader-book-title"},book.title),
          h("span",{className:"reader-page-info"},(page+1)+" / "+book.total_pages)
        ),
        h("button",{className:"icon-btn",onClick:function(){loadPage(page);}},"↻")
      ),
      h("div",{className:"progress-track"}, h("div",{className:"progress-bar",style:{width:pct+"%"}})),
      h("div",{className:"reader-content",ref:ref},
        ld ? h("p",{className:"loading-text"},"載入中...")
        : h("div",null,
            paras.map(function(line,i){
              return h("p",{key:i,className:"paragraph"+(selP===i?" para-selected":""),style:{fontSize:(s.fontSize||16)+"px"},onClick:function(){setSelP(selP===i?-1:i);}},line||"\u00A0");
            }),
            tops.length>0 ? h("div",{className:"ann-section"},
              h("div",{className:"ann-section-title"},"ANNOTATIONS 批註"),
              tops.map(function(a){
                var replies=anns.filter(function(r){return r.parent_id===a.id;});
                return h(AnnItem,{key:a.id,annotation:a,replies:replies,settings:s,onReply:submitReply,replyAuthor:rAuthor,setReplyAuthor:setRAuthor});
              })
            ) : null
          )
      ),
      h("div",{className:"reader-input-area"},
        h("div",{className:"ann-author-toggle"},
          h("button",{className:"tag-btn"+(author==="moon"?" tag-active":""),onClick:function(){setAuthor("moon");}},"🌙 "+(s.name1||"Moon")),
          h("button",{className:"tag-btn"+(author==="bulb"?" tag-active-bulb":""),onClick:function(){setAuthor("bulb");}},"💡 "+(s.name2||"Lux")),
          selP>=0 ? h("span",{className:"sel-indicator"},"¶"+(selP+1)) : null
        ),
        h("div",{className:"input-row"},
          h("input",{className:"ann-input",value:newAnn,onChange:function(e){setNewAnn(e.target.value);},onKeyDown:function(e){if(e.key==="Enter")submitAnn();},placeholder:"留言..."}),
          h("button",{className:"send-btn",onClick:submitAnn,style:{opacity:newAnn.trim()?1:0.4}},"↵")
        )
      ),
      h("div",{className:"reader-nav"},
        h("button",{className:"nav-btn",onClick:function(){if(page>0)setPage(page-1);},disabled:page<=0},"← 上一頁"),
        h("span",{className:"nav-page" },(page+1)+" / "+book.total_pages),
        h("button",{className:"nav-btn",onClick:function(){if(page<book.total_pages-1)setPage(page+1);},disabled:page>=book.total_pages-1},"下一頁 →")
      )
    )
  );
}

// ── App ──
function App() {
  var _v=useState("loading"), view=_v[0], setView=_v[1];
  var _bk=useState(null), book=_bk[0], setBook=_bk[1];
  var _ss=useState(false), showS=_ss[0], setShowS=_ss[1];
  var _s=useState({name1:"Moon",name2:"Lux",fontSize:16,charsPerPage:CHARS_PER_PAGE_DEFAULT,icon:"lamp"});
  var settings=_s[0], setSettings=_s[1];

  useEffect(function() {
    try { var sv=localStorage.getItem("catchword_settings"); if(sv) setSettings(JSON.parse(sv)); } catch(e){}
    if(!getBaseUrl()) { setView("setup"); return; }
    api("books").then(function(){setView("shelf");}).catch(function(e){setView("setup");});
  }, []);

  function saveSettings(s) { setSettings(s); try{localStorage.setItem("catchword_settings",JSON.stringify(s));}catch(e){} setShowS(false); }

  if (view==="loading") return h("div",{className:"wrap"}, h("div",{className:"loading-screen"}, h("img",{src:ICON_DATA.lamp,style:{imageRendering:"pixelated"}}), h("p",null,"CATCHWORD")));
  if (view==="setup") return h(SetupPage,{onConnect:function(){setView("shelf");}});
  if (view==="reader"&&book) return h("div",null,
    h(Reader,{book:book,settings:settings,onBack:function(){setView("shelf");setBook(null);}}),
    showS ? h(Settings,{settings:settings,onSave:saveSettings,onClose:function(){setShowS(false);}}) : null
  );
  return h("div",null,
    h(Bookshelf,{settings:settings,onSelect:function(b){setBook(b);setView("reader");},onOpenSettings:function(){setShowS(true);},onUpdateSettings:saveSettings}),
    showS ? h(Settings,{settings:settings,onSave:saveSettings,onClose:function(){setShowS(false);}}) : null
  );
}

ReactDOM.render(h(App), document.getElementById("root"));
