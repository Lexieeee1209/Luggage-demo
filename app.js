document.addEventListener("DOMContentLoaded", () => {
  const flightInput = document.getElementById("flight-input");
  const dateInput = document.getElementById("date-input");
  const searchBtn = document.getElementById("search-btn");
  const flightInfo = document.getElementById("flight-info");
  const baggageInfo = document.getElementById("baggage-info");
  const resultSection = document.getElementById("result-section");
  const loading = document.getElementById("loading");
  const message = document.getElementById("message");
  const scanBtn = document.getElementById("scan-btn");
  const scanSection = document.getElementById("scanner-section");
  const closeScanBtn = document.getElementById("close-scan");

  // 更新时间显示
  setInterval(() => {
    const now = new Date();
    document.getElementById("current-time").innerText = now.toLocaleString("zh-CN");
  }, 1000);

  // 主查询函数
  async function searchFlight(flightNumber) {
    if (!flightNumber) {
      showMessage("请输入航班号");
      return;
    }

    loading.style.display = "block";
    resultSection.style.display = "none";
    message.innerText = "";

    try {
      const res = await fetch("database.json");
      const data = await res.json();
      const foundFlight = data.data.find(f =>
        f.flight.iata === flightNumber ||
        f.flight.iata.replace(/[A-Z]+/, "") === flightNumber
      );

      loading.style.display = "none";

      if (foundFlight) {
        resultSection.style.display = "block";

        const depTime = new Date(foundFlight.flight.scheduled).toLocaleTimeString(
          "zh-CN",
          { hour: "2-digit", minute: "2-digit" }
        );

        flightInfo.innerHTML = `
          <p><strong>航班号：</strong>${foundFlight.flight.iata}</p>
          <p><strong>出发地：</strong>${foundFlight.flight.departure}</p>
          <p><strong>目的地：</strong>${foundFlight.flight.arrival}</p>
          <p><strong>计划起飞时间：</strong>${depTime}</p>
          <p><strong>航班状态：</strong>${foundFlight.status}</p>
        `;

        baggageInfo.innerHTML = `
          <p><strong>行李状态：</strong>${foundFlight.baggage}</p>
        `;
      } else {
        showMessage("未找到相关航班，请确认航班号是否正确。");
      }
    } catch (error) {
      loading.style.display = "none";
      showMessage("数据加载失败，请检查 database.json 文件是否存在。");
      console.error(error);
    }
  }

  // 显示错误或提示信息
  function showMessage(text) {
    message.innerText = text;
  }

  // 查询按钮事件
  searchBtn.addEventListener("click", () => {
    const flightNumber = flightInput.value.trim().toUpperCase();
    searchFlight(flightNumber);
  });

  // 支持按回车查询
  flightInput.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      const flightNumber = flightInput.value.trim().toUpperCase();
      searchFlight(flightNumber);
    }
  });

  // 扫码功能
  scanBtn.addEventListener("click", () => {
    scanSection.style.display = "block";
    const html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 200 },
      decodedText => {
        html5QrCode.stop();
        scanSection.style.display = "none";
        flightInput.value = decodedText;
        searchFlight(decodedText.toUpperCase());
      },
      errorMessage => {}
    );
  });

  closeScanBtn.addEventListener("click", () => {
    scanSection.style.display = "none";
  });
});
