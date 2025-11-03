document.addEventListener("DOMContentLoaded", () => {
  const flightInput = document.getElementById("flight-input");
  const dateInput = document.getElementById("date-input");
  const searchBtn = document.getElementById("search-btn");
  const scanBtn = document.getElementById("scan-btn");
  const flightInfo = document.getElementById("flight-info");
  const baggageInfo = document.getElementById("baggage-info");
  const resultSection = document.getElementById("result-section");
  const loading = document.getElementById("loading");
  const scanner = document.getElementById("scanner");

  // 更新时间显示
  setInterval(() => {
    const now = new Date();
    document.getElementById("current-time").innerText =
      now.toLocaleString("zh-CN");
  }, 1000);

  // 主查询函数
  async function queryFlight(flightNumber) {
    if (!flightNumber) {
      alert("请输入航班号或扫码查询");
      return;
    }
    loading.style.display = "block";
    resultSection.style.display = "none";

    try {
      const res = await fetch("database.json");
      const data = await res.json();
      const foundFlight = data.data.find(
        f =>
          f.flight.iata === flightNumber.toUpperCase() ||
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
        alert("未找到相关航班，请确认航班号是否正确。");
      }
    } catch (error) {
      loading.style.display = "none";
      alert("数据加载失败，请检查 database.json 文件是否存在。");
      console.error(error);
    }
  }

  // 点击查询按钮事件
  searchBtn.addEventListener("click", () => {
    queryFlight(flightInput.value.trim().toUpperCase());
  });

  // 扫码登机牌按钮事件
  scanBtn.addEventListener("click", () => {
    scanner.style.display = "block";
    const html5QrCode = new Html5Qrcode("scanner");

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      decodedText => {
        html5QrCode.stop();
        scanner.style.display = "none";
        // 模拟登机牌二维码包含航班号信息，如 "MU5126"
        alert(`识别到登机牌二维码：${decodedText}`);
        queryFlight(decodedText);
      },
      errorMessage => {
        console.log("扫码中...", errorMessage);
      }
    ).catch(err => {
      alert("无法启动摄像头，请检查权限或设备支持情况。");
      console.error(err);
    });
  });
});
