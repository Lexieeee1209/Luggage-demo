// app.js - 更新版
document.addEventListener("DOMContentLoaded", () => {
  const flightInput = document.getElementById("flight-input");
  const dateInput = document.getElementById("date-input");
  const searchBtn = document.getElementById("search-btn");
  const scanBtn = document.getElementById("scan-btn");
  const flightInfo = document.getElementById("flight-info");
  const baggageInfo = document.getElementById("baggage-info");
  const resultSection = document.getElementById("result-section");
  const loading = document.getElementById("loading");
  const messageBox = document.getElementById("message");

  const scannerOverlay = document.getElementById("scanner-overlay");
  const scannerClose = document.getElementById("scanner-close");
  const readerId = "reader";

  // 页面初始状态
  loading.style.display = "none";
  messageBox.style.display = "none";
  resultSection.style.display = "none";

  // 自动填今天日期（浏览器本地时间）
  const todayStr = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  dateInput.value = todayStr;

  // 显示当前时间（浏览器本地时间）
  setInterval(() => {
    const now = new Date();
    document.getElementById("current-time").innerText = now.toLocaleString("zh-CN");
  }, 1000);

  function showMessage(text, timeout=3000) {
    messageBox.style.display = "block";
    messageBox.innerText = text;
    if (timeout>0) setTimeout(()=> messageBox.style.display = "none", timeout);
  }

  // Parse scheduled time "HH:mm" into Date object on given date (local time)
  function scheduledToDate(dateStr, timeStr) {
    // timeStr can be "HH:mm" or "HH:mm:ss"
    const [h, m, s] = (timeStr || "00:00").split(":").map(v=>parseInt(v,10) || 0);
    const parts = dateStr.split("-");
    const year = parseInt(parts[0],10);
    const month = parseInt(parts[1],10) - 1;
    const day = parseInt(parts[2],10);
    return new Date(year, month, day, h, m, s);
  }

  // Query function: match by flight number + date; then compute real-time status override
  async function queryFlightByNumberAndDate(inputNumber, dateStr) {
    loading.style.display = "block";
    resultSection.style.display = "none";

    try {
      const res = await fetch("database.json", {cache: "no-store"});
      if (!res.ok) throw new Error("无法加载 database.json");
      const json = await res.json();

      const normInput = (inputNumber||"").trim().toUpperCase();
      // find record with exact date match and matching iata or short number
      const found = json.data.find(item => {
        const iata = (item.flight && item.flight.iata || "").toUpperCase();
        const iataShort = iata.replace(/^[A-Z]+/, "");
        const dateMatch = (item.flight && item.flight.date) === dateStr;
        const numberMatch = (iata === normInput) || (iataShort === normInput);
        return dateMatch && numberMatch;
      });

      loading.style.display = "none";

      if (!found) {
        showMessage("未找到该日期下的相关航班，请确认航班号和日期是否正确。", 4000);
        return null;
      }

      // compute dynamic status:
      // rule: if flight.date < today => 到达
      // if flight.date == today and scheduledTime <= now => 到达
      // else leave original status or set to "计划中"
      const now = new Date();
      const recDate = found.flight.date; // "YYYY-MM-DD"
      const schedTime = found.flight.scheduled || "00:00"; // "HH:mm"
      const scheduledDateTime = scheduledToDate(recDate, schedTime);

      let dynamicStatus = found.status || "";
      // compare date part
      const today = new Date();
      const todayYMD = today.toISOString().slice(0,10);

      if (recDate < todayYMD) {
        dynamicStatus = "到达";
      } else if (recDate === todayYMD) {
        if (scheduledDateTime <= now) {
          dynamicStatus = "到达";
        } else {
          dynamicStatus = "计划中";
        }
      } else {
        dynamicStatus = "计划中";
      }

      // fill UI
      resultSection.style.display = "block";
      const dep = found.flight.departure || "";
      const arr = found.flight.arrival || "";
      const sched = found.flight.scheduled || "";
      const arrTime = found.flight.arrival_scheduled || "";

      flightInfo.innerHTML = `
        <p><strong>航班号：</strong>${found.flight.iata}</p>
        <p><strong>日期：</strong>${found.flight.date}</p>
        <p><strong>出发地：</strong>${dep}</p>
        <p><strong>目的地：</strong>${arr}</p>
        <p><strong>计划起飞时间：</strong>${sched}</p>
        ${arrTime ? `<p><strong>计划到达时间：</strong>${arrTime}</p>` : ""}
        <p><strong>航班状态：</strong>${dynamicStatus}</p>
      `;

      baggageInfo.innerHTML = `
        <p><strong>行李状态：</strong>${found.baggage || "暂无"}</p>
        <p><strong>行李转盘：</strong>${found.baggage_claim || "暂无"}</p>
      `;

      return found;

    } catch (err) {
      loading.style.display = "none";
      console.error(err);
      showMessage("数据加载失败，请检查 database.json 是否可用。", 5000);
      return null;
    }
  }

  // attach search handlers
  searchBtn.addEventListener("click", () => {
    const num = flightInput.value.trim().toUpperCase();
    const date = dateInput.value;
    if (!num || !date) {
      alert("请输入航班号并选择日期");
      return;
    }
    queryFlightByNumberAndDate(num, date);
  });

  flightInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const num = flightInput.value.trim().toUpperCase();
      const date = dateInput.value;
      if (!num || !date) {
        alert("请输入航班号并选择日期");
        return;
      }
      queryFlightByNumberAndDate(num, date);
    }
  });

  // ------------------ Scanner using html5-qrcode ------------------
  let html5QrCode = null;
  let scanning = false;

  function startScanner() {
    if (scanning) return;
    scannerOverlay.style.display = "flex";
    const qrboxSize = Math.min(320, Math.floor(window.innerWidth * 0.8));
    html5QrCode = new Html5Qrcode(readerId, { verbose: false });
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: qrboxSize, height: qrboxSize } },
      (decodedText, decodedResult) => {
        // success
        flightInput.value = decodedText.trim();
        showMessage("二维码识别成功：" + decodedText, 2500);
        stopScanner();
        // do not auto query by default
      },
      (errorMessage) => {
        // ignore continuous failure messages
      }
    ).then(() => {
      scanning = true;
    }).catch(err => {
      console.error("扫码启动失败：", err);
      showMessage("无法启动摄像头，请在系统浏览器中打开并允许摄像头权限。", 5000);
      scannerOverlay.style.display = "none";
      scanning = false;
    });
  }

  function stopScanner() {
    if (!html5QrCode) {
      scannerOverlay.style.display = "none";
      scanning = false;
      return;
    }
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
      scanning = false;
      scannerOverlay.style.display = "none";
    }).catch(err => {
      console.warn("停止扫码失败：", err);
      scannerOverlay.style.display = "none";
      scanning = false;
      html5QrCode = null;
    });
  }

  scanBtn.addEventListener("click", startScanner);
  scannerClose.addEventListener("click", stopScanner);

  // ensure scanner closed on navigation
  window.addEventListener("beforeunload", () => {
    if (scanning && html5QrCode) {
      try { html5QrCode.stop(); } catch(e) {}
    }
  });
});
