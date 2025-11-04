document.addEventListener("DOMContentLoaded", () => {
  const flightInput = document.getElementById("flight-input");
  const dateInput = document.getElementById("date-input");
  const searchBtn = document.getElementById("search-btn");
  const flightInfo = document.getElementById("flight-info");
  const baggageInfo = document.getElementById("baggage-info");
  const resultSection = document.getElementById("result-section");
  const loading = document.getElementById("loading");
  const messageBox = document.getElementById("message");

  const scanBtn = document.getElementById("scan-btn");
  const scannerSection = document.getElementById("scanner-section");
  const closeScanBtn = document.getElementById("close-scan");
  const readerElementId = "reader";

  // 初始状态
  loading.style.display = "none";
  messageBox.style.display = "none";
  resultSection.style.display = "none";
  scannerSection.style.display = "none";

  // 自动填今天日期，用户可修改
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;

  // 时钟显示
  setInterval(() => {
    const now = new Date();
    document.getElementById("current-time").innerText = now.toLocaleString("zh-CN");
  }, 1000);

  // 显示临时消息
  function showMessage(text, timeout=3000) {
    messageBox.style.display = "block";
    messageBox.innerText = text;
    if (timeout>0) {
      setTimeout(()=> { messageBox.style.display = "none"; }, timeout);
    }
  }

  // 主查询函数（按 航班号 + 日期 精确匹配）
  async function queryFlight(flightNumber, dateStr) {
    if (!flightNumber) {
      showMessage("请输入航班号");
      return;
    }
    if (!dateStr) {
      showMessage("请选择日期");
      return;
    }

    loading.style.display = "block";
    resultSection.style.display = "none";

    try {
      const res = await fetch("database.json", {cache: "no-store"});
      if (!res.ok) throw new Error("无法加载数据文件");
      const json = await res.json();
      // 标准化：输入可能是 "5126" 或 "MU5126"
      const normInput = flightNumber.trim().toUpperCase();

      const found = json.data.find(item => {
        // 日期匹配：直接从 scheduled 字符串取日期部分（格式 "YYYY-MM-DD"）
        const sched = item.flight.scheduled; // e.g. "2025-11-04T18:30:00+08:00"
        const flightDate = sched.slice(0,10); // safe because JSON stores ISO-like string
        // 航班号匹配：完整 iata 或去掉字母后匹配
        const iata = item.flight.iata.toUpperCase();
        const iataShort = iata.replace(/^[A-Z]+/, "");
        const matchNumber = (iata === normInput) || (iataShort === normInput);
        return matchNumber && (flightDate === dateStr);
      });

      loading.style.display = "none";

      if (found) {
        resultSection.style.display = "block";
        // 使用 scheduled 的本地时间显示起飞时间/到达时间（取时分）
        const depTime = new Date(found.flight.scheduled).toLocaleTimeString("zh-CN", {hour:"2-digit", minute:"2-digit"});
        const arrTime = new Date(found.flight.arrival_scheduled ? found.flight.arrival_scheduled : found.flight.scheduled).toLocaleTimeString("zh-CN", {hour:"2-digit", minute:"2-digit"});
        flightInfo.innerHTML = `
          <p><strong>航班号：</strong>${found.flight.iata}</p>
          <p><strong>出发地：</strong>${found.flight.departure}</p>
          <p><strong>目的地：</strong>${found.flight.arrival}</p>
          <p><strong>计划起飞时间：</strong>${depTime}</p>
          <p><strong>计划到达时间：</strong>${arrTime}</p>
          <p><strong>航班状态：</strong>${found.status}</p>
        `;
        baggageInfo.innerHTML = `
          <p><strong>行李状态：</strong>${found.baggage}</p>
        `;
      } else {
        showMessage("未找到该日期下的相关航班，请确认航班号或日期是否正确。", 4000);
      }
    } catch (err) {
      loading.style.display = "none";
      console.error(err);
      showMessage("数据加载失败，请检查 database.json 是否存在或网络连接。", 5000);
    }
  }

  // 绑定查询事件（按钮与回车）
  searchBtn.addEventListener("click", () => {
    const f = flightInput.value.trim().toUpperCase();
    const d = dateInput.value;
    queryFlight(f, d);
  });
  flightInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const f = flightInput.value.trim().toUpperCase();
      const d = dateInput.value;
      queryFlight(f, d);
    }
  });

  // ========== 扫码部分（使用 html5-qrcode） ==========
  // We'll create Html5Qrcode instance when user clicks scan
  let html5QrCode = null;
  let scanning = false;

  function startScanner() {
    if (scanning) return;
    // show scanner UI
    scannerSection.style.display = "block";
    // create instance
    html5QrCode = new Html5Qrcode(readerElementId, { verbose: false });
    const config = { fps: 10, qrbox: 250 };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText, decodedResult) => {
        // on success
        flightInput.value = decodedText.trim();
        showMessage("已识别二维码：" + decodedText, 2000);
        stopScanner();
        // do NOT auto query by default; user can press 查询
        // if you prefer auto query: uncomment next line:
        // queryFlight(decodedText.trim().toUpperCase(), dateInput.value);
      },
      (errorMessage) => {
        // scan failure; ignore
      }
    ).then(() => {
      scanning = true;
    }).catch(err => {
      // cannot start camera
      scannerSection.style.display = "none";
      console.error("无法启动摄像头：", err);
      showMessage("无法启动摄像头，请确认已授权并在 HTTPS 环境下访问。", 5000);
    });
  }

  function stopScanner() {
    if (!html5QrCode) {
      scannerSection.style.display = "none";
      scanning = false;
      return;
    }
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      scannerSection.style.display = "none";
      scanning = false;
      html5QrCode = null;
    }).catch(err => {
      console.warn("停止摄像头失败：", err);
      scannerSection.style.display = "none";
      scanning = false;
      html5QrCode = null;
    });
  }

  scanBtn.addEventListener("click", () => {
    startScanner();
  });

  closeScanBtn.addEventListener("click", () => {
    stopScanner();
  });

  // 停止扫描并清理（离开页面时）
  window.addEventListener("beforeunload", () => {
    if (scanning && html5QrCode) {
      try { html5QrCode.stop(); } catch(e) {}
    }
  });
});
