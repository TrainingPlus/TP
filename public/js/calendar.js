// =========================================================
// Tiny month calendar. Renders into a container div and calls
// onSelect(yyyy-mm-dd) when a day is clicked.
// =========================================================
const DOWS = ["S","M","T","W","T","F","S"];

export function renderMiniCalendar(container, selectedISO, onSelect){
  let view = selectedISO ? new Date(selectedISO) : new Date();
  view.setDate(1);

  function draw(){
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = view.toLocaleString(undefined, { month: "long", year: "numeric" });

    let cells = "";
    for (let i = 0; i < startDow; i++) cells += `<div class="day muted"></div>`;
    for (let d = 1; d <= daysInMonth; d++){
      const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const sel = iso === selectedISO ? "sel" : "";
      cells += `<div class="day ${sel}" data-iso="${iso}">${d}</div>`;
    }

    container.innerHTML = `
      <div class="cal-head">
        <button class="icon-btn btn-sm" id="cal-prev" style="background:var(--bg);color:var(--text);">‹</button>
        <span>${monthName}</span>
        <button class="icon-btn btn-sm" id="cal-next" style="background:var(--bg);color:var(--text);">›</button>
      </div>
      <div class="mini-cal">
        ${DOWS.map(d => `<div class="dow">${d}</div>`).join("")}
        ${cells}
      </div>`;

    container.querySelector("#cal-prev").onclick = () => { view.setMonth(view.getMonth() - 1); draw(); };
    container.querySelector("#cal-next").onclick = () => { view.setMonth(view.getMonth() + 1); draw(); };
    container.querySelectorAll(".day[data-iso]").forEach(el => {
      el.addEventListener("click", () => {
        selectedISO = el.dataset.iso;
        onSelect(selectedISO);
        draw();
      });
    });
  }
  draw();
}
