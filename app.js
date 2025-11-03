document.addEventListener("DOMContentLoaded", () => {
  const flightInput = document.getElementById("flight-input");
  const dateInput = document.getElementById("date-input");
  const searchBtn = document.getElementById("search-btn");
  const flightInfo = document.getElementById("flight-info");
  const baggageInfo = document.getElementById("baggage-info");
  const resultSection = document.getElementById("result-section");
  const loading = document.getElementById("loading");
  const qrBtn = document.getElementById("scan-btn"); // 扫码按钮

  // ✅ 页面初始隐藏 loading 提示
  loading.style.display = "none";

  // 更新时间显示
  setInterval(() => {
    const now = new Date();
    document.getElementById("current-time").innerText = now.toLocaleString("zh-CN");
  }, 1000);

  // 点击查询按钮事件
  searchBtn.addEventListener("click", async () => {
    const flightNumber = flightInput.value.trim().toUpperCase();
    const date = dateInput.value;

    if (!flightNumber) {
      alert("请输入航班号");
      return;
    }

    loading.style.display = "block";
    resultSection.style.display = "none";

    try {
      const res = await fetch("database.json");
      const data = await res.json();
      let foundFlight = data.data.find(
        f =>
          f.flight.iata === flightNumber ||
          f.flight.iata.replace(/[A-Z]+/, "") === flightNumber
      );

      loading.style.display = "none";

      if (foundFlight) {
        resultSection.style.display = "block";

        const depTime = new Date(foundFlight.flight.scheduled).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit"
        });

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
  });

  // ✅ 扫码功能（简化版）
  qrBtn.addEventListener("click", () => {
    alert("扫码功能模拟：假设扫描登机牌成功，航班号为 MU5126。");
    flightInput.value = "MU5126";
  });
});
