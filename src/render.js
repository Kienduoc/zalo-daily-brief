// render.js — Dung bang "nguon du lieu" tuong tac va bao trang HTML bao cao.
// Bang nhom: loc, sap xep, danh dau da ra soat, canh bao nhom co viec quan trong,
// click ten nhom -> xo cac viec lien quan. Thanh tien do "Da xu ly x/y" co dinh tren cung.

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const p2 = (n) => String(n).padStart(2, "0");

// Bang liet ke hoi thoai: ten, loai, so tin, tin moi nhat. Script trong pageHtml se gan
// badge quan trong + o ra soat + loc/sap xep.
export function sourceActivityHtml(messages) {
  const conv = {};
  for (const m of messages) {
    const c = (conv[m.groupName] ||= { count: 0, latest: 0 });
    c.count++;
    if (m.ts > c.latest) c.latest = m.ts;
  }
  const rows = Object.entries(conv)
    .map(([name, c]) => {
      const isDm = name.startsWith("[Ca nhan]");
      return { name: name.replace(/^\[Ca nhan\]\s*/, ""), type: isDm ? "u" : "g", ...c };
    })
    .sort((a, b) => b.count - a.count);

  const groups = rows.filter((r) => r.type === "g").length;
  const dms = rows.length - groups;

  const tr = (r) => {
    const t = new Date(r.latest);
    const timeLabel = `${p2(t.getHours())}:${p2(t.getMinutes())} ${p2(t.getDate())}/${p2(t.getMonth() + 1)}`;
    return `<tr class="zrow" data-name="${escapeHtml(r.name)}" data-count="${r.count}" data-latest="${r.latest}" data-type="${r.type}">
<td class="zc-check"><input type="checkbox" title="Đã rà soát nhóm này"></td>
<td class="zc-name"><a href="javascript:void(0)" class="zname">${escapeHtml(r.name)}</a><button class="zcopy" title="Copy tên để tìm trên Zalo (Ctrl+K)">⧉</button></td>
<td class="zc-type">${r.type === "g" ? "Nhóm" : "Cá nhân"}</td>
<td class="zc-count">${r.count}</td>
<td class="zc-latest">${timeLabel}</td>
<td class="zc-flag">—</td>
</tr>`;
  };

  return `<h3>Nguồn dữ liệu: ${messages.length} tin — ${groups} nhóm, ${dms} hội thoại cá nhân</h3>
<div class="ztoolbar">
  <input id="zsearch" placeholder="Tìm tên nhóm..." autocomplete="off">
  <button class="zfilter on" data-f="all">Tất cả</button>
  <button class="zfilter" data-f="hot">⚠ Có việc cần chú ý</button>
  <button class="zfilter" data-f="todo">Chưa rà soát</button>
</div>
<div class="ztwrap"><table id="zsrc">
<thead><tr>
  <th title="Đã rà soát">✓</th>
  <th class="zsort" data-k="name">Nhóm / Người</th>
  <th class="zsort" data-k="type">Loại</th>
  <th class="zsort on" data-k="count">Số tin ▾</th>
  <th class="zsort" data-k="latest">Tin mới nhất</th>
  <th>Mức độ</th>
</tr></thead>
<tbody>${rows.map(tr).join("")}</tbody>
</table></div>
<p class="zhint">Click tên nhóm để xem các việc liên quan trong báo cáo. Nút ⧉ copy tên nhóm — dán vào ô tìm kiếm Zalo (Ctrl+K) để mở nhóm.</p>`;
}

export function pageHtml(title, subtitle, bodyHtml) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>
<style>
  body { font-family:Arial,sans-serif; max-width:820px; margin:76px auto 24px; line-height:1.5; color:#222; padding:0 16px; }
  /* Thanh tien do co dinh, mau dam, khong bi che */
  #zprog { position:fixed; top:0; left:0; right:0; z-index:1000; background:#4e9430; color:#fff; font-weight:700; font-size:15px; padding:10px 18px; box-shadow:0 2px 8px rgba(0,0,0,.25); display:none; }
  #zprog .zbar { position:absolute; left:0; top:0; bottom:0; background:#6CB545; z-index:-1; transition:width .3s; }
  /* O tick tung viec */
  .zli input[type=checkbox] { margin-right:8px; transform:scale(1.25); accent-color:#6CB545; cursor:pointer; vertical-align:middle; }
  .zli.done { color:#9aa79a; text-decoration:line-through; }
  .zli.done::after { content:" ✓ đã xử lý"; color:#2c7a10; font-weight:700; font-size:12px; text-decoration:none; display:inline-block; margin-left:6px; }
  .zli.zflash { background:#fff3c4; transition:background 1.5s; }
  /* Bang nguon du lieu */
  .ztoolbar { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0; }
  .ztoolbar input { flex:1; min-width:160px; padding:8px 12px; border:1.5px solid #d7e0d2; border-radius:8px; font-size:14px; }
  .zfilter { border:1.5px solid #d7e0d2; background:#fff; border-radius:8px; padding:8px 12px; font-size:13px; cursor:pointer; }
  .zfilter.on { background:#6CB545; color:#fff; border-color:#6CB545; font-weight:700; }
  .ztwrap { overflow-x:auto; }
  #zsrc { width:100%; border-collapse:collapse; font-size:14px; }
  #zsrc th { background:#f2f7ee; text-align:left; padding:8px; border-bottom:2px solid #6CB545; white-space:nowrap; }
  #zsrc th.zsort { cursor:pointer; user-select:none; }
  #zsrc th.zsort.on { color:#2c7a10; }
  #zsrc td { padding:7px 8px; border-bottom:1px solid #edf1ea; vertical-align:top; }
  #zsrc tr.zdone td { background:#f6faf3; color:#9aa79a; }
  #zsrc tr.zhot td.zc-name { font-weight:700; }
  .zc-check input { transform:scale(1.2); accent-color:#6CB545; cursor:pointer; }
  .zname { color:#2c7a10; font-weight:600; text-decoration:none; cursor:pointer; }
  .zname:hover { text-decoration:underline; }
  .zcopy { border:0; background:none; cursor:pointer; font-size:13px; color:#8aa07f; margin-left:4px; }
  .zc-count, .zc-flag { text-align:center; white-space:nowrap; }
  .zbadge { background:#e74c3c; color:#fff; border-radius:8px; padding:2px 8px; font-size:12px; font-weight:700; white-space:nowrap; }
  .zbadge.mid { background:#f39c12; }
  .zrel td { background:#fbfdf9; font-size:13.5px; padding:4px 12px 10px 40px; color:#444; }
  .zrel li { margin:4px 0; cursor:pointer; }
  .zrel li:hover { color:#2c7a10; }
</style>
<body>
<div id="zprog"><div class="zbar" id="zbar"></div><span id="zprogtext"></span></div>
<h2 style="color:#6CB545;margin:0 0 4px">${escapeHtml(title)}</h2>
${subtitle ? `<p style="color:#666;margin:0 0 16px">${escapeHtml(subtitle)}</p>` : ""}
${bodyHtml}
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<p style="color:#999;font-size:12px">Tạo tự động bởi Thư ký AI Zalo (chế độ chỉ đọc). Tick ô vuông để đánh dấu đã xử lý — máy tự ghi nhớ.</p>
<p style="color:#999;font-size:12px">© 2026 Nguyễn Đức Kiên — 0981689892. Nghiêm cấm sao chép dưới mọi hình thức.</p>
<script>
(function () {
  var norm = function (s) { return s.toLowerCase().replace(/\\s+/g, " ").trim(); };

  // ===== 1) O tick tung viec + thanh tien do co dinh =====
  var KEY = "zbrief-done:" + location.pathname;
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  var items = []; // {li, section: 1..4}
  document.querySelectorAll("h3").forEach(function (h) {
    var m = h.textContent.trim().match(/^([1-4])[.\\s]/);
    if (!m) return;
    var sec = Number(m[1]);
    var ul = h.nextElementSibling;
    while (ul && ul.tagName !== "UL") ul = ul.nextElementSibling;
    if (!ul) return;
    ul.querySelectorAll("li").forEach(function (li) {
      if (/^Không có/.test(li.textContent.trim())) return;
      items.push({ li: li, sec: sec });
    });
  });
  var prog = document.getElementById("zprog"), zbar = document.getElementById("zbar"), ztext = document.getElementById("zprogtext");
  function updateProg() {
    if (!items.length) return;
    var done = items.filter(function (it) { return it.li.classList.contains("done"); }).length;
    prog.style.display = "block";
    zbar.style.width = Math.round((done / items.length) * 100) + "%";
    ztext.textContent = "ĐÃ XỬ LÝ " + done + "/" + items.length + " VIỆC" + (done === items.length ? " — XONG HẾT ✓" : "");
  }
  items.forEach(function (it, i) {
    it.li.classList.add("zli");
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(saved[i]);
    if (cb.checked) it.li.classList.add("done");
    cb.addEventListener("change", function () {
      it.li.classList.toggle("done", cb.checked);
      saved[i] = cb.checked;
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
      updateProg();
    });
    it.li.insertBefore(cb, it.li.firstChild);
  });
  updateProg();

  // ===== 2) Bang nguon du lieu: badge quan trong, ra soat, loc, sap xep, viec lien quan =====
  var table = document.getElementById("zsrc");
  if (!table) return;
  var GKEY = "zbrief-group:" + location.pathname;
  var gsaved = {};
  try { gsaved = JSON.parse(localStorage.getItem(GKEY) || "{}"); } catch (e) {}
  var rows = Array.prototype.slice.call(table.querySelectorAll("tbody tr.zrow"));

  // Tim viec lien quan theo ten nhom (muc 1-3 = quan trong, muc 4 = thong tin)
  rows.forEach(function (row) {
    var name = norm(row.dataset.name);
    var rel = items.filter(function (it) { return norm(it.li.textContent).indexOf(name) !== -1; });
    var hot = rel.filter(function (it) { return it.sec <= 3; }).length;
    row._rel = rel;
    var flag = row.querySelector(".zc-flag");
    if (hot) { flag.innerHTML = '<span class="zbadge">⚠ ' + hot + ' việc quan trọng</span>'; row.classList.add("zhot"); row.dataset.hot = "1"; }
    else if (rel.length) { flag.innerHTML = '<span class="zbadge mid">' + rel.length + ' việc</span>'; }
    // O da ra soat
    var cb = row.querySelector(".zc-check input");
    cb.checked = Boolean(gsaved[row.dataset.name]);
    row.classList.toggle("zdone", cb.checked);
    cb.addEventListener("change", function () {
      gsaved[row.dataset.name] = cb.checked;
      row.classList.toggle("zdone", cb.checked);
      try { localStorage.setItem(GKEY, JSON.stringify(gsaved)); } catch (e) {}
    });
    // Copy ten nhom
    row.querySelector(".zcopy").addEventListener("click", function () {
      navigator.clipboard && navigator.clipboard.writeText(row.dataset.name);
      this.textContent = "✓"; var b = this; setTimeout(function () { b.textContent = "⧉"; }, 1200);
    });
    // Click ten -> xo viec lien quan
    row.querySelector(".zname").addEventListener("click", function () {
      var next = row.nextElementSibling;
      if (next && next.classList.contains("zrel")) { next.remove(); return; }
      document.querySelectorAll("tr.zrel").forEach(function (x) { x.remove(); });
      var tr = document.createElement("tr");
      tr.className = "zrel";
      var td = document.createElement("td");
      td.colSpan = 6;
      if (!row._rel.length) { td.textContent = "Không có việc nào trong báo cáo nhắc tới nhóm này (chỉ có tin trao đổi thường)."; }
      else {
        var ul = document.createElement("ul");
        row._rel.forEach(function (it) {
          var li = document.createElement("li");
          li.textContent = (it.sec <= 3 ? "⚠ " : "• ") + it.li.textContent.replace(/\\s*✓ đã xử lý\\s*$/, "").trim();
          li.title = "Bấm để nhảy tới việc này";
          li.addEventListener("click", function () {
            it.li.scrollIntoView({ behavior: "smooth", block: "center" });
            it.li.classList.add("zflash");
            setTimeout(function () { it.li.classList.remove("zflash"); }, 1600);
          });
          ul.appendChild(li);
        });
        td.appendChild(ul);
      }
      tr.appendChild(td);
      row.parentNode.insertBefore(tr, row.nextSibling);
    });
  });

  // Loc + tim kiem
  var filter = "all";
  function applyFilter() {
    var q = norm(document.getElementById("zsearch").value || "");
    rows.forEach(function (row) {
      var okQ = !q || norm(row.dataset.name).indexOf(q) !== -1;
      var okF = filter === "all" || (filter === "hot" && row.dataset.hot === "1") || (filter === "todo" && !row.querySelector(".zc-check input").checked);
      row.style.display = okQ && okF ? "" : "none";
      var next = row.nextElementSibling;
      if (next && next.classList.contains("zrel")) next.style.display = row.style.display;
    });
  }
  document.getElementById("zsearch").addEventListener("input", applyFilter);
  document.querySelectorAll(".zfilter").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".zfilter").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      filter = b.dataset.f;
      applyFilter();
    });
  });

  // Sap xep theo cot
  var sortKey = "count", sortAsc = false;
  function applySort() {
    var tbody = table.querySelector("tbody");
    document.querySelectorAll("tr.zrel").forEach(function (x) { x.remove(); });
    rows.sort(function (a, b) {
      var va, vb;
      if (sortKey === "name" || sortKey === "type") { va = a.dataset[sortKey]; vb = b.dataset[sortKey]; return sortAsc ? va.localeCompare(vb, "vi") : vb.localeCompare(va, "vi"); }
      va = Number(a.dataset[sortKey]); vb = Number(b.dataset[sortKey]);
      return sortAsc ? va - vb : vb - va;
    });
    rows.forEach(function (r) { tbody.appendChild(r); });
  }
  document.querySelectorAll("th.zsort").forEach(function (th) {
    th.addEventListener("click", function () {
      var k = th.dataset.k;
      if (sortKey === k) sortAsc = !sortAsc; else { sortKey = k; sortAsc = (k === "name" || k === "type"); }
      document.querySelectorAll("th.zsort").forEach(function (x) { x.classList.remove("on"); x.textContent = x.textContent.replace(/ [▾▴]$/, ""); });
      th.classList.add("on");
      th.textContent = th.textContent.replace(/ [▾▴]$/, "") + (sortAsc ? " ▴" : " ▾");
      applySort();
    });
  });
})();
</script>
</body>`;
}
