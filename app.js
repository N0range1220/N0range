(function () {
  "use strict";

  var data = (typeof LINKS_DATA !== "undefined") ? LINKS_DATA : [];
  var sectionTips = (typeof SECTION_TIPS !== "undefined") ? SECTION_TIPS : {};
  var currentCategory = "全部";
  var currentKeyword = "";
  var PAGE_SIZE = 48; // 每页显示数量
  var currentPage = 1;

  var els = {
    search: document.getElementById("search"),
    categoryList: document.getElementById("category-list"),
    totalCount: document.getElementById("total-count"),
    currentCat: document.getElementById("current-cat"),
    shownCount: document.getElementById("shown-count"),
    cards: document.getElementById("cards"),
    empty: document.getElementById("empty"),
    pagination: document.getElementById("pagination"),
  };

  function esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 把文本里的 url 转成可点击链接（用于备注中含链接的情况）
  function linkify(str) {
    var s = esc(str);
    return s.replace(/(https?:\/\/[^\s，。、]+)/g, function (m) {
      return '<a class="inline-link" href="' + m + '" target="_blank" rel="noopener noreferrer">' + m + "</a>";
    });
  }

  function domain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (e) {
      return url;
    }
  }

  // 按分类统计
  function buildCategories() {
    var counts = {};
    data.forEach(function (item) {
      var c = item.category || "未分类";
      counts[c] = (counts[c] || 0) + 1;
    });
    var list = Object.keys(counts).map(function (k) {
      return { name: k, count: counts[k] };
    });
    list.sort(function (a, b) { return b.count - a.count; });
    return [{ name: "全部", count: data.length }].concat(list);
  }

  function renderCategories() {
    var cats = buildCategories();
    els.categoryList.innerHTML = cats.map(function (c) {
      var active = c.name === currentCategory ? " active" : "";
      return (
        '<div class="cat-item' + active + '" data-cat="' + esc(c.name) + '">' +
          '<span class="cat-name">' + esc(c.name) + "</span>" +
          '<span class="cat-count">' + c.count + "</span>" +
        "</div>"
      );
    }).join("");
    els.totalCount.textContent = data.length;
  }

  function renderCards() {
    var kw = currentKeyword.trim().toLowerCase();
    var filtered = data.filter(function (item) {
      if (currentCategory !== "全部" && (item.category || "未分类") !== currentCategory) {
        return false;
      }
      if (!kw) return true;
      var hay = [
        item.title || "",
        item.category || "",
        item.source || "",
        item.url || "",
        item.note || "",
        item.section || "",
      ].join(" ").toLowerCase();
      return hay.indexOf(kw) !== -1;
    });

    els.currentCat.textContent = currentCategory;
    els.shownCount.textContent = filtered.length;

    if (filtered.length === 0) {
      els.cards.innerHTML = "";
      els.empty.hidden = false;
      els.pagination.innerHTML = "";
      return;
    }
    els.empty.hidden = true;

    // 排序：按分节分组（有分节的在前并按分节聚拢），无分节的按原顺序
    var withIdx = filtered.map(function (it, i) { return { it: it, i: i }; });
    withIdx.sort(function (a, b) {
      var sa = a.it.section || "";
      var sb = b.it.section || "";
      if (sa !== sb) {
        if (sa === "") return 1;
        if (sb === "") return -1;
        return sa < sb ? -1 : 1;
      }
      return a.i - b.i;
    });

    // 分页
    var totalPages = Math.max(1, Math.ceil(withIdx.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    var start = (currentPage - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, withIdx.length);
    var pageItems = withIdx.slice(start, end);

    var html = [];
    var lastSection = null;

    pageItems.forEach(function (entry) {
      var item = entry.it;
      var cat = item.category || "未分类";

      // 分节标题：当分节变化且非空时插入
      var sec = item.section || "";
      if (sec && sec !== lastSection) {
        var tipKey = cat + "|" + sec;
        var tip = sectionTips[tipKey];
        html.push(
          '<div class="section-divider">' +
            '<span class="section-bar"></span>' +
            '<span class="section-name">' + esc(sec) + "</span>" +
            (tip ? '<span class="section-tip">' + linkify(tip) + "</span>" : "") +
          "</div>"
        );
        lastSection = sec;
      } else if (!sec) {
        lastSection = null;
      }

      var srcTag = item.source
        ? '<span class="tag tag-src">' + esc(item.source) + "</span>"
        : "";
      var codeTag = item.code
        ? '<span class="tag tag-code" title="提取码">提取码 ' + esc(item.code) + "</span>"
        : "";
      var noteHtml = item.note
        ? '<div class="card-note">' + linkify(item.note) + "</div>"
        : "";

      // 漫画链接按钮（部分动漫条目有）
      var mangaTag = "";
      if (item.mangaUrl) {
        var mTitle = item.mangaTitle || "漫画";
        mangaTag =
          '<a class="card-manga" href="' + esc(item.mangaUrl) + '" target="_blank" rel="noopener noreferrer" title="漫画链接">' +
            esc(mTitle) + " →</a>";
      }

      html.push(
        '<div class="card">' +
          '<a class="card-link" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(item.title || "未命名") + '"></a>' +
          '<div class="card-title">' + esc(item.title || "未命名") + "</div>" +
          '<div class="card-meta">' +
            '<span class="tag tag-cat">' + esc(cat) + "</span>" +
            srcTag +
            codeTag +
          "</div>" +
          noteHtml +
          '<div class="card-foot">' +
            '<span class="card-url">' + esc(domain(item.url)) + "</span>" +
            mangaTag +
            '<span class="card-go">访问 →</span>' +
          "</div>" +
        "</div>"
      );
    });

    els.cards.innerHTML = html.join("");

    renderPagination(currentPage, totalPages, start, end, withIdx.length);
  }

  // 生成分页控件
  function renderPagination(page, totalPages, start, end, total) {
    if (totalPages <= 1) {
      els.pagination.innerHTML =
        '<div class="page-info">共 ' + total + ' 条</div>';
      return;
    }

    // 生成页码按钮，最多显示 7 个，当前页附近 + 首尾 + 省略号
    var pages = [];
    var add = function (n) { pages.push(n); };
    add(1);
    var left = Math.max(2, page - 2);
    var right = Math.min(totalPages - 1, page + 2);
    if (left > 2) add("...");
    for (var i = left; i <= right; i++) add(i);
    if (right < totalPages - 1) add("...");
    if (totalPages > 1) add(totalPages);

    var html = '';
    html += '<button class="page-btn page-nav' + (page === 1 ? " disabled" : "") + '" data-page="' + (page - 1) + '" ' + (page === 1 ? "disabled" : "") + '>‹ 上一页</button>';
    pages.forEach(function (n) {
      if (n === "...") {
        html += '<span class="page-ellipsis">…</span>';
      } else {
        html += '<button class="page-btn' + (n === page ? " active" : "") + '" data-page="' + n + '">' + n + '</button>';
      }
    });
    html += '<button class="page-btn page-nav' + (page === totalPages ? " disabled" : "") + '" data-page="' + (page + 1) + '" ' + (page === totalPages ? "disabled" : "") + '>下一页 ›</button>';
    html += '<div class="page-info">' + (start + 1) + '-' + end + ' / 共 ' + total + ' 条 · 第 ' + page + '/' + totalPages + ' 页</div>';

    els.pagination.innerHTML = html;
  }

  function render() {
    renderCategories();
    renderCards();
  }

  els.search.addEventListener("input", function (e) {
    currentKeyword = e.target.value;
    currentPage = 1;
    renderCards();
  });

  els.categoryList.addEventListener("click", function (e) {
    var target = e.target.closest(".cat-item");
    if (!target) return;
    currentCategory = target.getAttribute("data-cat");
    currentPage = 1;
    render();
  });

  // 分页点击
  els.pagination.addEventListener("click", function (e) {
    var btn = e.target.closest(".page-btn");
    if (!btn || btn.disabled) return;
    var p = parseInt(btn.getAttribute("data-page"), 10);
    if (isNaN(p)) return;
    currentPage = p;
    renderCards();
    // 滚回内容顶部
    var head = document.querySelector(".content-head");
    if (head) head.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // 横幅关闭
  var banner = document.getElementById("notice-banner");
  if (banner) {
    var closeBtn = banner.querySelector(".banner-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        banner.style.display = "none";
        try { localStorage.setItem("notice_closed", "1"); } catch (e) {}
      });
    }
    try {
      if (localStorage.getItem("notice_closed") === "1") {
        banner.style.display = "none";
      }
    } catch (e) {}
  }

  // 快捷键：按 / 聚焦搜索框
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== els.search) {
      e.preventDefault();
      els.search.focus();
    }
  });

  render();
})();
