document.addEventListener("DOMContentLoaded", () => {
  const flightInput = document.getElementById("flight-input");
  const dateInput = document.getElementById("date-input");
  const searchBtn = document.getElementById("search-btn");
  const flightInfo = document.getElementById("flight-info");
  const baggageInfo = document.getElementById("baggage-info");
  const resultSection = document.getElementById("result-section");
  const loading = document.getElementById("loading");

  // --- 扫码相关元素 ---
  const qrBtn = document.getElementById("scan-btn"); // 扫码按钮
  const scannerSection = document.getElementById("scanner-section"); // 扫码区域
  const closeScanBtn = document.getElementById("close-scan"); // 关闭扫码按钮
  // --------------------

  // 页面初始隐藏 loading 提示
  loading.style.display = "none";

  // --- 自动设置今天日期 ---
  // 修复了日期输入框默认为空的问题
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  // --------------------

  // 更新时间显示
  setInterval(() => {
    const now = new Date();
    document.getElementById("current-time").innerText = now.toLocaleString("zh-CN");
  }, 1000);

  // 点击查询按钮事件
  searchBtn.addEventListener("click", async () => {
    const flightNumber = flightInput.value.trim().toUpperCase();
    
    // --- ⬇️ 【核心修改 1：获取并验证日期】 ⬇️ ---
    const date = dateInput.value; // date会是 "2025-11-04" 这样的字符串

    if (!flightNumber) {
      alert("请输入航班号");
      return;
    }
    
    // 验证日期
    if (!date) {
      alert("请输入日期");
      return;
    }
    // --- ⬆️ 核心修改 1 结束 ⬆️ ---

    loading.style.display = "block";
    resultSection.style.display = "none";

    try {
      const res = await fetch("database.json");
      const data = await res.json();

      // --- ⬇️ 【核心修改 2：同时匹配航班号和日期】 ⬇️ ---
      let foundFlight = data.data.find(f => {
        // 1. 匹配航班号 (你的原始逻辑)
        const flightMatchesNumber = 
            f.flight.iata === flightNumber ||
            f.flight.iata.replace(/[A-Z]+/, "") === flightNumber;
        
        // 2. 匹配日期
        // "f.flight.scheduled" 是 "2025-11-04T18:30:00"
        // 我们要把它转换成 "2025-11-04" 来进行比较
        const flightDate = new Date(f.flight.scheduled).toISOString().split('T')[0];
        
        // 3. 必须两者都为 true
        return flightMatchesNumber && (flightDate === date);
      });
      // --- ⬆️ 核心修改 2 结束 ⬆️ ---

      loading.style.display = "none";

      if (foundFlight) {
        resultSection.style.display = "block";

        const depTime = new Date(foundFlight.flight.scheduled).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit"
        });
        
        // --- ⬇️ 【完整代码 1：你省略的部分】 ⬇️ ---
        flightInfo.innerHTML = `
          <p><strong>航班号：</strong>${foundFlight.flight.iata}</p>
          <p><strong>出发地：</strong>${foundFlight.flight.departure}</p>
          <p><strong>目的地：</strong>${foundFlight.flight.arrival}</p>
          <p><strong>计划时间：</strong>${depTime}</p>
          <p><strong>航班状态：</strong>${foundFlight.status}</p>
        `;

        baggageInfo.innerHTML = `
          <p><strong>行李状态：</strong>${foundFlight.baggage}</p>
        `;
        // --- ⬆️ 完整代码 1 结束 ⬆️ ---

      } else {
        alert("未找到该日期下的相关航班，请确认航班号或日期是否正确。");
      }
    } catch (error) {
      loading.style.display = "none";
      alert("数据加载失败，请检查 database.json 文件是否存在。");
      console.error(error);
    }
  });

  // --- ⬇️ 【核心修改 3：替换为“真实扫码”逻辑】 ⬇️ ---

  // 1. 初始化扫码器对象
  const html5QrCode = new Html5Qrcode("reader");

  // 2. 当用户点击“扫码”按钮时
  qrBtn.addEventListener("click", () => {
    // (1) 把扫码区域显示出来
    scannerSection.style.display = "block";
    // (2) 请求打开摄像头
    html5QrCode.start(
      { facingMode: "environment" }, // 优先使用后置摄像头
      {
        fps: 10, // 扫描帧率
        qrbox: { width: 250, height: 250 } // 扫描框的大小
      },
      onScanSuccess, // 扫描成功时，调用这个函数
      onScanFailure  // 扫描失败时，调用这个函数
    ).catch(err => {
      alert(`无法启动摄像头，请确认已授权，并使用 https 访问：${err}`);
    });
  });

  // 3. 当扫描成功时
  function onScanSuccess(decodedText, decodedResult) {
    // decodedText 就是二维码里的文字 (比如 "MU5126")
    
    // (1) 把文字填入输入框
    flightInput.value = decodedText;
    
    // (2) 停止摄像头并隐藏扫码区
    stopScanning();
    
    // (3) (可选) 自动点击“查询”按钮
    // searchBtn.click(); // 建议：先不自动点击，让用户自己点查询
  }

  // 4. 当扫描失败时 (比如没对准，这个会一直触发)
  function onScanFailure(error) {
    // 我们可以选择什么都不做，让用户继续尝试
  }

  // 5. 当用户点击“关闭扫码”按钮时
  closeScanBtn.addEventListener("click", () => {
    stopScanning();
  });

  // 6. 封装一个“停止扫描”的函数
  function stopScanning() {
    html5QrCode.stop().then(ignore => {
      // 摄像头已停止
      scannerSection.style.display = "none"; // 隐藏扫码区域
    }).catch(err => {
      // 停止失败 (一般不会)
    });
  }
  // --- ⬆️ 核心修改 3 结束 ⬆️ ---
});