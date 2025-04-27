// static/js/board.js 

// index của ô “vào tù” (data-index trên ô THĂM TÙ)
const jailIndex = 10;
// index của ô "lễ hội" (data-index trên ô LỄ HỘI)
const festivalIndex = 20;
// index của ô "sân bay" (data-index trên ô SÂN BAY)
const airportIndex = 30;

// Chỉ số các ô địa danh
const validLandmarkTiles = [1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23, 24, 25, 26, 27, 29, 31, 32, 33, 34, 35, 37, 38, 39]; 

let currentPosition = 0;
let boardTiles = [];
let isMoving = false; // Biến trạng thái để kiểm tra người chơi có đang di chuyển không

import { quizData } from './data/quizData.js';
import { provinces }  from './data/provinces.js';


window.onload = async () => {
  // Chỉ số các ô địa danh
  const validLandmarkTiles = [1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23, 24, 25, 26, 27, 29, 31, 32, 33, 34, 35, 37, 38, 39]; 

  const selectionPopup = document.getElementById("character-selection");
  const kpiPopup = document.getElementById("kpi-popup");
  const boardContainer = document.getElementById("board-container");
  const player = document.getElementById("player");
  const dice = document.getElementById("dice");

  // Hiển thị trạng thái người chơi
  const infoPanel = document.createElement("div");
  infoPanel.id = "player-info";
  infoPanel.style.width = "200px";
  infoPanel.style.position = "absolute";
  infoPanel.style.top = "20px";
  infoPanel.style.left = "1200px";
  infoPanel.style.background = "#fff9cc";
  infoPanel.style.padding = "10px 16px";
  infoPanel.style.borderRadius = "10px";
  infoPanel.style.boxShadow = "0 0 10px rgba(0,0,0,0.1)";
  infoPanel.style.fontSize = "14px";
  document.body.appendChild(infoPanel);

  function updateInfoPanel() {
    const state = JSON.parse(localStorage.getItem("playerState"));
    const kpi   = state.kpi;

  // Chuẩn bị chuỗi KPI
    const kpiText = `Cần ${ (kpi.moneyTarget).toLocaleString() }đ và sở hữu ${ (kpi.requiredTiles) } địa danh`
      + (kpi.requiredLocations
        ? ` trong đó có ${ kpi.requiredLocations.join(", ") }`
        : "");
    infoPanel.innerHTML = `
      <div style="margin-bottom: 6px;"><i class="bi bi-cash-coin"></i> <span style="margin-left: 6px;">${state.money.toLocaleString()} VND</span></div>
      <div style="margin-bottom: 6px;"><i class="bi bi-geo-alt-fill"></i> <span style="margin-left: 6px;">${state.ownedTiles.length} địa danh</span></div>
      <div style="margin-bottom: 6px;"><i class="bi bi-ticket-perforated"></i><span style="margin-left: 6px;"> ${state.freeJailCards} vé ra tù</span></div>
      <div>
        <i class="bi bi-flag"></i>
        <span style="margin-left:6px;font-weight:bold;color:#e63946;">
          KPI: ${ kpiText }
        </span>
      </div>
    `;
    const rollBtn = document.querySelector('.dice-container button');
    if (rollBtn) {
      rollBtn.disabled = state.jailStatus === true;
    }

    // --- đồng bộ state lên server ---
    fetch('/api/game_state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(state)
    });

    // Kiểm tra hoàn thành KPI:
  const hasMoney = state.money >= kpi.moneyTarget;
  const hasTiles = state.ownedTiles.length >= kpi.requiredTiles;
  const hasLocs  = !kpi.requiredLocations
    || kpi.requiredLocations.every(loc =>
         state.ownedTiles.some(i => {
           const tile = document.querySelector(`[data-index="${i}"]`);
           const name = tile && (tile.querySelector('.label')||tile.querySelector('.place-name')).textContent.trim();
           return name === loc;
         })
       );

  if (hasMoney && hasTiles && hasLocs) {
    fetch('/api/complete_kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(state)
    }).then(() => showCompletionPopup(data.completed_at));
  }
  };

  window.selectCharacter = function (characterId) {
    localStorage.setItem("selectedCharacter", `char${characterId}.png`);
    showProvincePopup();
  };

  function showProvincePopup() {
    const provincePopup = document.createElement("div");
    provincePopup.className = "popup active";
    provincePopup.innerHTML = `
      <h2>Chọn quê hương của bạn</h2>
      <input type="text" id="province-search" placeholder="Tìm tỉnh thành..." style="width: 100%; padding: 8px; margin-bottom: 12px;">
      <ul id="province-list" style="max-height: 200px; overflow-y: auto; text-align: left;"></ul>
    `;
    document.body.appendChild(provincePopup);

    const list = document.getElementById("province-list");
    const input = document.getElementById("province-search");

    function renderList(filter = "") {
      list.innerHTML = "";
      provinces
        .filter(p => p.toLowerCase().includes(filter.toLowerCase()))
        .forEach(province => {
          const li = document.createElement("li");
          li.textContent = province;
          li.style.cursor = "pointer";
          li.style.padding = "4px";
          li.addEventListener("click", () => {
            localStorage.setItem("playerHometown", province);
            provincePopup.remove();
            showKpiPopup();
          });
          list.appendChild(li);
        });
    }

    input.addEventListener("input", e => renderList(e.target.value));
    renderList();
  }
  
  // Random ô tham quan đặc biệt
  initializeSpecialTiles();
  highlightSpecialTiles();

  function showKpiPopup() {
    const character = localStorage.getItem("selectedCharacter");
    const hometown = localStorage.getItem("playerHometown");

    const kpiOptions = [
      {
        moneyTarget: 3000000,
        requiredTiles: 8,
        requiredLocations: ["Hà Nội", "Đà Nẵng"]
      },
      {
        moneyTarget: 4000000,
        requiredTiles: 6,
        requiredLocations: ["Huế"]
      },
      {
        moneyTarget: 3500000,
        requiredTiles: 7,
        requiredLocations: ["Hà Giang", "TP Hồ Chí Minh"]
      }
    ];
    const kpi = kpiOptions[Math.floor(Math.random() * kpiOptions.length)];

    const playerState = {
      character,
      hometown,
      currentTile: 0,
      ownedTiles: [],
      money: 0,
      kpi,
      cards: [],
      jailStatus: false,
      jailTurns: 0,
      freeJailCards: 0
    };

    localStorage.setItem("playerState", JSON.stringify(playerState));

    const kpiText = `Bạn cần kiếm ${kpi.moneyTarget.toLocaleString()}VND và sở hữu ${kpi.requiredTiles} địa danh, trong đó có ${kpi.requiredLocations.join(", ")}`;
    document.getElementById("kpi-text").innerText = kpiText;

    document.getElementById("character-selection").classList.remove("active");
    document.getElementById("kpi-popup").classList.add("active");
  }

  window.startGame = function () {
    document.getElementById("kpi-popup").classList.remove("active");
    document.getElementById("board-container").classList.remove("hidden");

    const state = JSON.parse(localStorage.getItem("playerState"));
    const token = document.getElementById("player");
    token.src = `/static/images/${state.character}`;
    token.style.display = "block";

    boardTiles = document.querySelectorAll('[data-index]');
    moveToTile(state.currentTile);
    updateInfoPanel();
  };

  window.rollDice = function () {
    if (isMoving)
      return;
    const diceEl = document.getElementById("dice");
    diceEl.style.animation = "shake 0.5s";
    setTimeout(() => {
      diceEl.style.animation = "";
      const die1 = Math.floor(Math.random()*6)+1;
      const die2 = Math.floor(Math.random()*6)+1;
      const value = die1 + die2;
      //test
      //const value = 40;
      diceEl.innerText = `🎲 ${value}`;
  
      // nếu đang chờ double để ra tù:
      const state = JSON.parse(localStorage.getItem("playerState"));
      if (state.jailStatus === "waitingDouble") {
        if (die1 === die2) {
          state.jailStatus = false;
          localStorage.setItem("playerState", JSON.stringify(state));
          setTimeout(() => {
            alert("Bạn đã tung đôi! Ra tù và di chuyển " + value + " bước.");;
          }, 300);
          animateMovement(value);
        } else {
          setTimeout(() => {
            alert("Chưa tung đôi, chờ lần sau!");;
          }, 300);;
        }
        return;
      }
  
      animateMovement(value);
    }, 500);
  };  

  function animateMovement(steps) {
    isMoving = true; // Bắt đầu di chuyển
    updateInfoPanel();
    let step = 0;
    const interval = setInterval(() => {
      // Lưu vị trí cũ để biết có vượt qua ô 0 không
      const prevPos = currentPosition;
      // Di chuyển
      currentPosition = (currentPosition + 1) % boardTiles.length;
      moveToTile(currentPosition);
  
      // Nếu từ cuối vòng (ví dụ 39) đi về 0 thì coi là đã vượt qua GO
      if (currentPosition === 0) {
        const state = JSON.parse(localStorage.getItem("playerState"));
        state.money += 200000;                              // cộng 200k
        localStorage.setItem("playerState", JSON.stringify(state));
        updateInfoPanel();
      }
  
      step++;
      if (step >= steps) {
        clearInterval(interval);
        updateCurrentPosition();
        // Kích hoạt tung xúc xắc
        isMoving = false; // Kết thúc di chuyển
        //setRollEnabled(true); // Kích hoạt lại nút tung xúc xắc
        if (rollBtn) rollBtn.disabled = false;
        updateInfoPanel();
      }
    }, 300);
  };

  function updateCurrentPosition() {
    const state = JSON.parse(localStorage.getItem("playerState"));
    state.currentTile = currentPosition;
    localStorage.setItem("playerState", JSON.stringify(state));
    updateInfoPanel();
    
    // Kiểm tra nếu ô hiện tại là ô đặc biệt
    handleSpecialTile(currentPosition);

    // Nếu người chơi ở ô bắt đầu, vô hiệu hóa nút tung xúc xắc
    if (currentPosition === 0) {
        setRollEnabled(true);
      return;
    }
  
    // disable nút tung xúc xắc
    setRollEnabled(false); 

    if (currentPosition === jailIndex) {
      handleJailTile();
    } else if (currentPosition === festivalIndex) {
      handleFestivalTile();
    } else if (currentPosition === airportIndex) {
      showAirportDialog();
    } else {
      showTileDialog(currentPosition);
    }
  }; 

  function moveToTile(index) {
    // Khóa tung xúc xắc 
    const rollBtn = document.querySelector('.dice-container button');
    if (rollBtn) rollBtn.disabled = true;
    updateInfoPanel();
    const tile = boardTiles[index];
    const rect = tile.getBoundingClientRect();
    const boardRect = document.querySelector(".board").getBoundingClientRect();
    const player = document.getElementById("player");

    const offsetX = rect.left - boardRect.left + tile.offsetWidth / 2;
    const offsetY = rect.top - boardRect.top + tile.offsetHeight / 2;

    player.style.left = `${offsetX}px`;
    player.style.top = `${offsetY}px`;
    // Kích hoạt lại
    if (rollBtn) rollBtn.disabled = false;
    updateInfoPanel();
  }; 

  // Hàm shuffle (Fisher–Yates) để trộn mảng câu hỏi
  function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function showTileDialog(index) {

    const state = JSON.parse(localStorage.getItem("playerState")) || {};
    // Nếu đã sở hữu thì không hiển thị
    if (state.ownedTiles && state.ownedTiles.includes(index)) return;
  
    const tileEl = document.querySelector(`[data-index="${index}"]`);
    if (!tileEl) return;
    if (tileEl.querySelector('.Gieo_Que')) {
      showGieoQueDialog();
      return;
    };
    const nameEl = tileEl.querySelector(".label");
    if (!nameEl) return;
    const placeKey = nameEl.textContent.trim();
  
    const quiz = quizData[placeKey];
    if (!quiz) return;

    // Chọn random 1 câu easy, 4 câu hard
    const easyPool = shuffle(quiz.easy).slice(0, 1);
    const hardPool = shuffle(quiz.hard).slice(0, 4);
  
    const pp = document.getElementById("purchase-popup");
    const titleEl = pp.querySelector("#purchase-title");
    if (titleEl) {
      titleEl.textContent = `Bạn có muốn sở hữu địa danh "${placeKey}" không?`;
    }
  
    pp.classList.remove("hidden");
    pp.classList.add("active");
  
    // Remove old listeners
    let yesBtn = document.getElementById("btn-purchase-yes");
    let noBtn  = document.getElementById("btn-purchase-no");
    yesBtn.replaceWith(yesBtn.cloneNode(true));
    noBtn.replaceWith(noBtn.cloneNode(true));
  
    // Add new listeners
    document.getElementById("btn-purchase-yes").addEventListener("click", () => {
      pp.classList.add("hidden");
      pp.classList.remove("active");
      launchQuiz(hardPool, placeKey, index);
    });
    document.getElementById("btn-purchase-no").addEventListener("click", () => {
      pp.classList.add("hidden");
      pp.classList.remove("active");
      launchQuiz(easyPool, placeKey, index);
    });
  }; 
  
  // function để di chuyển ngay đến index
  function animateMovementToIndex(targetIndex) {
    currentPosition = targetIndex;
    moveToTile(targetIndex);
    const state = JSON.parse(localStorage.getItem('playerState')) || {};
    state.currentTile = targetIndex;
    localStorage.setItem('playerState', JSON.stringify(state));
    updateInfoPanel();
  }; 
  
  // Disable nút tung xúc xắc
  function setRollEnabled(on) {
    const btn = document.querySelector('.dice-container button');
    if (btn) btn.disabled = !on;
  }

  // Disable nút tung xúc xắc trong n giây
  function disableRollForSeconds(seconds) {
    const btn = document.querySelector('.dice-container button');
    let remaining = seconds;
    const originalText = btn.innerText;      // lưu nhãn gốc (ví dụ: "Tung xúc xắc")
    btn.disabled = true;
    btn.innerText = `Đợi ${remaining}s`;    // hiển thị thời gian ban đầu
  
    const timerId = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        btn.innerText = `Đợi ${remaining}s`;
      } else {
        clearInterval(timerId);
        btn.disabled = false;
        btn.innerText = originalText;       // phục hồi nhãn gốc
      }
    }, 1000);
  }; 

  function showMetroDialog() {
    const modal = document.getElementById('popup-metro');
    const select = document.getElementById('metro-select');
    const btnOk  = document.getElementById('btn-confirm-metro');
    const btnX   = document.getElementById('btn-close-metro');
  
    // load options
    select.innerHTML = '';
    boardTiles.forEach(tile => {
      const idx = +tile.dataset.index;
      const nameEl = tile.querySelector('.label') || tile.querySelector('.place-name');
      const txt = nameEl ? nameEl.textContent.trim() : `Ô ${idx}`;
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${idx}: ${txt}`;
      select.appendChild(opt);
    });
  
    modal.classList.remove('hidden'); modal.classList.add('active');
  
    btnOk.onclick = () => {
      const target = +select.value;
      const total = boardTiles.length;
      // tính số bước theo vòng quanh bàn (xoay vòng nếu target < currentPosition)
      const steps = (target - currentPosition + total) % total;
      animateMovement(steps);           // dùng animation di chuyển qua từng ô
      modal.classList.add('hidden');
      modal.classList.remove('active');
    };
    btnX.onclick = () => modal.classList.add('hidden');
  }; 

  // Bộ thẻ gieo quẻ
  const chanceCards = [
    { id: 1,
      text: '[Quẻ MẠNG XÃ HỘI] Bạn bị tố cáo vi phạm clip “content” trên mạng → Đi thẳng vào “trại giáo dục văn hoá”.',
      effect: state => { 
        // di chuyển đến tù
        animateMovementToIndex(jailIndex);
        state.jailStatus = true;
        localStorage.setItem("playerState", JSON.stringify(state));
        updateInfoPanel();
        handleJailTile(); }
    },
    { id: 2,
      text: '[Quẻ TIKTOK] Bạn làm video review bún bò Huế nhưng nói nhầm là món Bắc. → Bị cộng đồng Huế phản ứng. Chờ 30s mới được chơi tiếp.',
      effect: state => { 
        // disable tung xúc xắc 30s
        disableRollForSeconds(30); }
    },
    { id: 3,
      text: '[Quẻ ĐẠI CÁT] Vì là người có tướng mạo xinh đẹp, trí thức ngời ngời. Nhận được 1 vé ra TÙ miễn phí.',
      effect: state => { 
        state.freeJailCards = (state.freeJailCards||0) + 1;
        localStorage.setItem("playerState", JSON.stringify(state));
        updateInfoPanel(); }
    },
    { id: 4,
      text: '[Quẻ VÙNG MIỀN] Vô tình đi nhầm lễ hội chợ trời – Đồ Sơn, Hải Phòng → Mất 30s nhưng có bài học văn hoá vùng miền.',
      effect: state => { disableRollForSeconds(30); }
    },
    { id: 5,
      // Quiz-type card
      text: '[Quẻ VĂN CHƯƠNG] Trong tác phẩm “Lão Hạc” của Nam Cao, Lão Hạc đã quyết định làm gì để giải thoát cho con chó của mình?',
      options: [
        'a) Đem bán nó cho người lạ',
        'b) Giết con chó trước khi người khác mua',
        'c) Để lại con chó cho người bạn thân',
        'd) Khác'
      ],
      answerIndex: 1,    // đáp án b)
      reward: 150000,     // được cộng 150k nếu đúng
      penalty: 50000      // trừ 50k nếu sai
    },
    { id: 6, text: '[Quẻ TÀU METRO] Bạn được lên tàu Metro – di chuyển tới bất cứ ô nào bạn muốn.', 
      effect: state => { showMetroDialog(); }
    }
    // ... các thẻ khác
  ];

  // Hàm hiển thị dialog Gieo Quẻ
  function showGieoQueDialog() {
    const modal = document.getElementById('popup-gieo-que');
    const body  = modal.querySelector('.gieo-que-body');
    const btnG0 = document.getElementById('btn-gieo-que');
    const btnC0 = document.getElementById('btn-close-gieo');
  
    // Hiển thị modal
    modal.classList.remove('hidden');
    modal.classList.add('active');
  
    // Reset body và nút Gieo
    body.innerHTML = `
    <p style="text-align:center;">
      Nhấn nút bên dưới để gieo quẻ và xem điềm báo:
    </p>
    <button id="btn-gieo-que" class="btn-gieo">Gieo</button>
    <div id="result-gieo" class="gieo-result hidden"></div>
  `;

    // Query lại các nút  
    const btnG = document.getElementById('btn-gieo-que');
    const btnC = document.getElementById('btn-close-gieo');
    const result = document.getElementById('result-gieo');
  
    // Rút thẻ ngẫu nhiên
    const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
    //test Gieo Quẻ
    //const card = chanceCards.find(c => c.id === 2);
    btnG.textContent = 'Gieo';
    btnG.disabled = false;
    btnG.onclick = () => {
    // Khi ấn Gieo:
    if (card.options) {
      // Quiz-type: hiển thị câu hỏi, options, đổi btn thành "Xác nhận"
      const qText = document.createElement('p');
      qText.className = 'quiz-text';
      qText.textContent = card.text;
      body.insertBefore(qText, btnG);

      const form = document.createElement('form');
      form.className = 'quiz';
      card.options.forEach((opt, idx) => {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.innerHTML = `<input type=\"radio\" name=\"choice\" value=\"${idx}\" /> ${opt}`;
        form.appendChild(label);
      });
      body.insertBefore(form, btnG);

      btnG.textContent = 'Xác nhận';
      // Gán lại listener xử lý đáp án
      btnG.onclick = e => {
        e.preventDefault();
        const sel = form.querySelector('input[name="choice"]:checked');
        const state = JSON.parse(localStorage.getItem('playerState')) || {};
        if (sel && Number(sel.value) === card.answerIndex) {
          state.money = (state.money || 0) + card.reward;
          alert(`Chính xác! +${card.reward.toLocaleString()}VND`);
          setRollEnabled(true);
        } else {
          state.money = Math.max(0, (state.money || 0) - card.penalty);
          alert(`Sai rồi! -${card.penalty.toLocaleString()}VND`);
          setRollEnabled(true);
        }
        localStorage.setItem('playerState', JSON.stringify(state));
        updateInfoPanel();
        modal.classList.add('hidden');
        modal.classList.remove('active');
      };
  
    } else {
      // Hiển thị nội dung thẻ vào result
      result.textContent = card.text;
      result.classList.remove('hidden');
      result.classList.add('visible');

      // Thẻ thường: apply effect ngay
      const state = JSON.parse(localStorage.getItem('playerState')) || {};
      card.effect(state);
      localStorage.setItem('playerState', JSON.stringify(state));
      updateInfoPanel();
  
      // Ẩn nút Gieo
      btnG.style.display = 'none';
      }
    };    
  
    // Handler đóng modal
    btnC.onclick = () => {
      modal.classList.add('hidden');
      modal.classList.remove('active');
      setRollEnabled(true);
    };
  }; 

  // Hàm thêm badge "Đã sở hữu" lên ô
function addOwnedBadge(index) {
  const tile = document.querySelector(`[data-index="${index}"]`);
  if (!tile || tile.querySelector('.owned-badge')) return;
  tile.style.position = 'relative';
  const badge = document.createElement('div');
  badge.className = 'owned-badge';
  badge.innerText = 'Đã sở hữu';
  tile.appendChild(badge);
}; 

  // Hàm thêm bage "Lễ hội" lên ô
  function addFestivalBadge(index) {
    const tile = document.querySelector(`[data-index="${index}"]`);
    if (!tile) return;
    // nếu đã có rồi thì thôi
    if (tile.querySelector('.festival-badge')) return;
  
    tile.style.position = 'relative';
    const badge = document.createElement('div');
    badge.className = 'festival-badge';
    badge.innerText = 'Lễ hội';
    tile.appendChild(badge);
  }

  // Hàm chạy quiz và cập nhật badge
function launchQuiz(questions, placeKey, index) {
  const placeSpan = document.getElementById('quiz-place');
  if (placeSpan) placeSpan.textContent = placeKey;

  const qp = document.getElementById("quiz-popup");
  const titleEl = qp.querySelector("#quiz-title");
  if (titleEl) {
    titleEl.textContent = questions.length > 1
      ? `Trả lời ${questions.length} câu hỏi khó về "${placeKey}"`
      : `Trả lời 1 câu hỏi đơn giản về "${placeKey}"`;
  }

  const form = document.getElementById("quiz-form");
  if (!form) return;
  form.innerHTML = '';
  questions.forEach((q, i) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('quiz-question');
    wrapper.innerHTML = `<p>${i+1}. ${q.question}</p>`;
    q.options.forEach((opt, idx) => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="radio" name="q${i}" value="${idx}" /> ${opt}`;
      wrapper.appendChild(label);
    });
    form.appendChild(wrapper);
  });
  
  // Show popup 
  qp.classList.remove('hidden'); 
  qp.classList.add('active');

  // Khóa nút tung xúc xắc
  setRollEnabled(false);
  // reset scroll về đầu
  const quizBody = qp.querySelector(".quiz-body");
  if (quizBody) quizBody.scrollTop = 0;

  let submitBtn = document.getElementById('btn-quiz-submit');
  submitBtn.replaceWith(submitBtn.cloneNode(true));
  document.getElementById('btn-quiz-submit').addEventListener('click', e => {
    e.preventDefault();
    let allCorrect = true;
    questions.forEach((q, i) => {
      const sel = form.querySelector(`input[name="q${i}"]:checked`);
      if (!sel || Number(sel.value) !== q.answerIndex) allCorrect = false;
    });
    
    // Đóng popup 
    qp.classList.add('hidden'); 
    qp.classList.remove('active');

    const state = JSON.parse(localStorage.getItem('playerState')) || {};
    state.ownedTiles = state.ownedTiles || [];
    if (allCorrect) {
      if (questions.length > 1 && !state.ownedTiles.includes(index)) {
        state.ownedTiles.push(index);
        // thêm badge ngay lập tức
        addOwnedBadge(index);
      }
      const bonus = questions.length > 1
        ? state.kpi.moneyTarget * 0.1
        : state.kpi.moneyTarget * 0.05;
      state.money = (state.money || 0) + bonus;
      localStorage.setItem('playerState', JSON.stringify(state));
      updateInfoPanel();
      alert('Chúc mừng! Bạn trả lời đúng.');
    } else {
      alert('Rất tiếc, bạn trả lời chưa đúng.');
    }
    setRollEnabled(true);
  });
}; 

function handleJailTile() {
  // Khóa nút tung xúc xắc
  // setRollEnabled(false);
  const state = JSON.parse(localStorage.getItem("playerState"));
  state.jailStatus = true;
  localStorage.setItem("playerState", JSON.stringify(state));
  updateInfoPanel();
  //document.querySelector('.dice-container button').disabled = true;
  const modal = document.getElementById("popup-jail");
  const msg   = document.getElementById("jail-message");
  const footer= document.getElementById("jail-buttons");
  
  // reset
  footer.innerHTML = "";

  if (state.freeJailCards > 0) {
    msg.textContent = `Bạn có ${state.freeJailCards} vé “Ra tù miễn phí”. Dùng 1 vé để ra ngay?`;
    // Nút có:
    const yes = document.createElement("button");
    yes.className = "btn-purchase-yes";
    yes.textContent = "Dùng thẻ";
    yes.onclick = () => {
      state.freeJailCards--;
      state.jailStatus = false;
      localStorage.setItem("playerState", JSON.stringify(state));
      updateInfoPanel();
      closeJailPopup();
    };
    // Nút không:
    const no = document.createElement("button");
    no.className = "btn-purchase-no";
    no.textContent = "Không dùng";
    no.onclick = () => {
      closeJailPopup();
      askJailChoice();
    };
    footer.append(yes, no);

  } else {
    // không có thẻ, hỏi bạn muốn:
    askJailChoice();
  }

  // show modal
  modal.classList.remove("hidden");
  modal.classList.add("active");
}; 

// Hàm hiển thị lựa chọn ra tù
function askJailChoice() {
  const state = JSON.parse(localStorage.getItem("playerState"));
  const modal = document.getElementById("popup-jail");
  const msg    = document.getElementById("jail-message");
  const footer = document.getElementById("jail-buttons");

  // đảm bảo modal đang mở
  modal.classList.remove("hidden");
  modal.classList.add("active");
 
  msg.textContent = "Bạn ở tù! Chọn cách ra:";
  footer.innerHTML = "";

  // 1) Trả 1 triệu
  const pay = document.createElement("button");
  pay.className = "btn-purchase-yes";
  pay.textContent = "Trả 1 Triệu";
  pay.onclick = () => {
    const st = JSON.parse(localStorage.getItem("playerState"));
    if (st.money >= 1_000_000) {
      st.money -= 1_000_000;
      st.jailStatus = false;
      localStorage.setItem("playerState", JSON.stringify(st));
      updateInfoPanel();
      closeJailPopup();
    } else {
      alert("Bạn không đủ tiền!");
      // giữ popup jail, không cần gọi lại
    }
  };

  // 2) Trả lời quiz
  const quizBtn = document.createElement("button");
  quizBtn.className = "btn-purchase-no";
  quizBtn.textContent = "Trả lời quiz";
  quizBtn.onclick = () => {
    closeJailPopup();
    launchJailQuiz();
  };

  // 3) Tung đôi
  const dbl = document.createElement("button");
  dbl.className = "btn-purchase-no";
  dbl.textContent = "Tung đôi";
  dbl.onclick = () => {
    closeJailPopup();
    const st = JSON.parse(localStorage.getItem("playerState"));
    st.jailStatus = "waitingDouble";
    localStorage.setItem("playerState", JSON.stringify(st));
    // Kích hoạt lại nút "Tung xúc xắc"
    const rollBtn = document.querySelector('.dice-container button');
    if (rollBtn) rollBtn.disabled = false;
    updateInfoPanel();
    alert("Bạn cần tung đôi để ra tù!");
  };

  footer.append(pay, quizBtn, dbl);
}

// Hàm đóng popup jail
function closeJailPopup() {
  const modal = document.getElementById("popup-jail");
  modal.classList.add("hidden");
  modal.classList.remove("active");
}

// Hàm quiz riêng cho Vào tù
function launchJailQuiz() {
  // 1) chuẩn bị bộ câu hỏi
  const jailQuiz = [
    {
      question: "Trong hệ thống tục lệ chầu cúng của người Việt, nghi thức 'Cầu an' thường được tổ chức vào dịp nào?",
      options: ["Đầu Xuân, mùng 1 Tết", "Rằm tháng Giêng", "Cuối mùa Thu", "Rằm tháng Bảy"],
      answerIndex: 1
    },
    {
      question: "Từ thời Lê, pháp luật nào quy định nghiêm khắc hình phạt cầm tù cho tội phạm chính trị?",
      options: ["Hình Luật Lê Thánh Tông", "Hình Luật Hồng Đức", "Hình Luật Thiệu Trị", "Hình Luật Gia Long"],
      answerIndex: 1
    },
    {
      question: "Trong văn hóa cung đình Huế, nghi lễ nào dùng để tống quan phạm tội xuống ngục?",
      options: ["Lễ Xử Binh", "Lễ Tống Ngục", "Lễ Trục Xuất", "Lễ Khai Phòng"],
      answerIndex: 1
    },
    {
      question: "Theo luật phong kiến nhà Nguyễn, tội 'phản quốc' hình phạt cao nhất là gì?",
      options: ["Đày biệt xứ", "Chém đầu", "Tống giam vô thời hạn", "Đánh đòn kinh phong"],
      answerIndex: 1
    },
    {
      question: "Năm 1829, vua Minh Mạng cho xây dựng ngục giam nào làm nòng cốt giam giữ tội phạm chính trị?",
      options: ["Ngục Nhà Lê", "Ngục Nhất Tự Sơn", "Ngục Quảng Đông", "Ngục Nhà Nguyễn"],
      answerIndex: 1
    }
  ];
  const questions = shuffle(jailQuiz).slice(0, 3);

  // 2) render lên quiz-popup
  const qp     = document.getElementById("quiz-popup");
  const title  = qp.querySelector(".quiz-title");
  const form   = document.getElementById("quiz-form");
  title.textContent =`Thử thách ra tù: trả lời ${questions.length} câu`;
  form.innerHTML     = "";

  questions.forEach((q, i) => {
    const container = document.createElement("div");
    container.className = "quiz-question";
    container.innerHTML = `<p>${i+1}. ${q.question}</p>`;
    q.options.forEach((opt, idx) => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `<input type="radio" name="jailQ${i}" value="${idx}" /> ${opt}`;
      container.appendChild(lbl);
    });
    form.appendChild(container);
  });

  // show popup
  qp.classList.remove("hidden");
  qp.classList.add("active");
  // Reset scroll về đầu
  const quizBody = qp.querySelector(".quiz-body");
  if (quizBody) {
    quizBody.scrollTop = 0;
  }

  // 3) handler submit
  const submit = document.getElementById("btn-quiz-submit");
  // clone để remove mọi listener cũ
  const newSubmit = submit.cloneNode(true);
  submit.replaceWith(newSubmit);
  newSubmit.addEventListener("click", e => {
    e.preventDefault();
    // kiểm tra đúng/sai
    let allCorrect = true;
    questions.forEach((q, i) => {
      const sel = form.querySelector(`input[name="jailQ${i}"]:checked`);
      if (!sel || +sel.value !== q.answerIndex) allCorrect = false;
    });
    // đóng quiz-popup
    qp.classList.add("hidden");
    qp.classList.remove("active");

    // xử lý kết quả
    const st = JSON.parse(localStorage.getItem("playerState"));
    if (allCorrect) {
      st.jailStatus = false;
      localStorage.setItem("playerState", JSON.stringify(st));
      updateInfoPanel();
      alert("Bạn đã trả lời đúng cả 3 câu! Ra tù và tiếp tục chơi.");
    } else {
      alert("Bạn chưa vượt qua thử thách, vẫn ở trong tù.");
      // quay lại popup jail choice
      askJailChoice();
    }
  });
};

function handleFestivalTile() {
  const state = JSON.parse(localStorage.getItem("playerState"));
  const owned = state.ownedTiles || [];
  if (owned.length === 0) {
    setTimeout(() => {
      alert("Bạn chưa có địa danh nào để tổ chức lễ hội!");
    }, 300);
    setRollEnabled(true);
    return;
  }

  // Chuẩn bị dialog
  const modal = document.getElementById("popup-festival");
  const sel   = document.getElementById("festival-select");
  sel.innerHTML = "";
  owned.forEach(idx => {
    const tile = document.querySelector(`[data-index="${idx}"]`);
    const name = tile.querySelector(".label, .place-name").textContent.trim();
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = name;
    sel.appendChild(opt);
  });

  // Show
  modal.classList.remove("hidden");
  modal.classList.add("active");

  // Nút OK
  const ok = document.getElementById("btn-festival-ok");
  ok.onclick = () => {
    const chosenIdx = +sel.value;
    const bonus = 200000;               // ví dụ: 200k
    state.money = (state.money || 0) + bonus;
    localStorage.setItem("playerState", JSON.stringify(state));
    updateInfoPanel();

    // gỡ badge Đã sở hữu (nếu có)
    const old = document.querySelector(`[data-index="${chosenIdx}"] .owned-badge`);
    if (old) old.remove();
    // thêm tem Lễ Hội
    addFestivalBadge(chosenIdx);

    closeFestivalPopup();
    alert(`Bạn đã tổ chức lễ hội tại "${sel.selectedOptions[0].text}" và nhận được ${bonus.toLocaleString()} VND!`);
    setRollEnabled(true);
  };

  // Nút Hủy
  const cancel = document.getElementById("btn-festival-cancel");
  cancel.onclick = closeFestivalPopup;
}

function closeFestivalPopup() {
  const modal = document.getElementById("popup-festival");
  modal.classList.add("hidden");
  modal.classList.remove("active");
  setRollEnabled(true);
};

function showAirportDialog() {
  const modal = document.getElementById('popup-airport');
  const select = document.getElementById('airport-select');
  const btnOk  = document.getElementById('btn-confirm-airport');
  const btnX   = document.getElementById('btn-close-airport');

  // 1. Build danh sách các ô
  select.innerHTML = '';
  boardTiles.forEach(tile => {
    const idx = +tile.dataset.index;
    const nameEl = tile.querySelector('.label') || tile.querySelector('.place-name');
    const txt = nameEl ? nameEl.textContent.trim() : `Ô ${idx}`;
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${idx}: ${txt}`;
    select.appendChild(opt);
  });

  // 2. Hiện popup
  modal.classList.remove('hidden');
  modal.classList.add('active');

  // 3. Bấm OK -> di chuyển
  btnOk.onclick = () => {
    const target = +select.value;
    const total  = boardTiles.length;
    // Số bước cần đi (xoay vòng nếu cần)
    const steps = (target - currentPosition + total) % total;
    animateMovement(steps);
    modal.classList.add('hidden');
    modal.classList.remove('active');
    setRollEnabled(true);
  };

  // 4. Bấm X đóng popup
  btnX.onclick = () => {
    modal.classList.add('hidden');
    modal.classList.remove('active');
    setRollEnabled(true);
  };
};

function showCompletionPopup() {
  const popup = document.getElementById("popup-complete");
  popup.classList.remove("hidden");
  popup.classList.add("active");

  // clear cũ & gắn listener
  const btnOk = document.getElementById("btn-complete-ok");
  btnOk.replaceWith(btnOk.cloneNode(true));
  document.getElementById("btn-complete-ok").addEventListener("click", () => {
    // Ẩn popup
    popup.classList.add("hidden");
    popup.classList.remove("active");
    document.getElementById("board-container").classList.add("hidden");
    // Quay về trang game
    window.location.href = '/game';
  });
};

//const validLandmarkTiles = [1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23, 24, 25, 26, 27, 29, 31, 32, 33, 34, 35, 37, 38, 39]; // Chỉ số các ô địa danh

function initializeSpecialTiles() {
  const specialTileCount = 3; // Số lượng ô đặc biệt
  const specialTiles = [];

  while (specialTiles.length < specialTileCount) {
    const randomIndex = Math.floor(Math.random() * validLandmarkTiles.length);
    const randomTile = validLandmarkTiles[randomIndex];
    if (!specialTiles.includes(randomTile)) {
      specialTiles.push(randomTile);
    }
  }

  // Lưu danh sách ô đặc biệt vào trạng thái người chơi
  const state = JSON.parse(localStorage.getItem("playerState")) || {};
  state.specialTiles = specialTiles;
  localStorage.setItem("playerState", JSON.stringify(state));

  console.log("Ô đặc biệt được chọn:", specialTiles);
};

function handleSpecialTile(tileIndex) {
  const state = JSON.parse(localStorage.getItem("playerState"));
  const playerRegion = localStorage.getItem("playerHometown"); // Vùng miền của người chơi
  const specialTiles = state.specialTiles || [];

  if (specialTiles.includes(tileIndex)) {
    const tileRegion = getRegionForTile(tileIndex); // Hàm trả về vùng miền của ô
    let taxAmount = 100000; // Số tiền bị trừ mặc định

    // Nếu người chơi đến từ vùng miền của ô, giảm số tiền bị trừ
    if (playerRegion === tileRegion) {
      taxAmount = 50000; // Người chơi quê ở đó bị trừ ít hơn
    }

    // Trừ tiền người chơi
    state.money = (state.money || 0) - taxAmount;
    localStorage.setItem("playerState", JSON.stringify(state));
    updateInfoPanel();

    alert(`Bạn đã đến ô tham quan đặc biệt! Bị trừ ${taxAmount.toLocaleString()} VND.`);
  }
};
function getRegionForTile(tileIndex) {
  const regionMapping = {
    1: "An Giang",
    3: "Kon Tum",
    4: "Cần Thơ",
    5: "Vũng Tàu",
    6: "Bắc Ninh",
    7: "Hải Phòng",
    8: "Cao Bằng",
    9: "Hà Nội",
    11:"Quảng Ninh",
    12:"Đồng tháp",
    13: "Bắc Kạn",
    14: "Lào Cai",
    15: "Tây Nguyên",
    16:"Ninh Thuận",
    18: "Tây Ninh",
    19: "Hà Giang",
    21: "Bạc liêu",
    22: "Phú Thọ",
    23: "Yên Bái",
    24: "Hà Nam",
    25: "Thanh Hóa",
    26: "Kiên Giang",
    27: "Lâm Đồng",
    29: "Hưng Yên",
    31:"Nghệ An",
    32: "Hòa Bình",
    33: "Huế",
    34: "Quảng Trị",
    35: "Sóc Trăng",
    37: "Đà Nẵng",
    38: "Quảng nam",
    39: "Khánh Hòa"
    // Thêm các ô và vùng miền tương ứng...
  };

  return regionMapping[tileIndex] || "Không xác định";
};

function highlightSpecialTiles() {
  const state = JSON.parse(localStorage.getItem("playerState"));
  const specialTiles = state.specialTiles || [];

  specialTiles.forEach(tileIndex => {
    const tile = document.querySelector(`[data-index="${tileIndex}"]`);
    if (tile) {
      tile.classList.add("special-tile"); // Thêm class CSS để làm nổi bật ô
    }
  });
};

};