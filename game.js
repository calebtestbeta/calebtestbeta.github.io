let cell = 24, cols, rows, snake, dir = 'RIGHT', foods = [], speed = 8, t = 0, timer = 60;
let stat = { carb: 0, protein: 0, caffeine: 0 }, ate = [];
let effectUntil = 0, postEffect = null;
let collectedChars = ['']; // 收集到的字詞數組
let foodChangeTimer = 0; // 食物變換計時器
const FOOD_CHANGE_INTERVAL = 5000; // 五秒間隔（毫秒）
let gameFont = 'sans-serif'; // 遊戲使用的字體
let responsiveTextRatio = 0.7; // 響應式文字大小比例
let gameState = 'START'; // 遊戲狀態: 'START', 'PLAYING', 'OVER'

function setup() {
    try {
        // 檢查必要的依賴
        if (!window.ITEMS) {
            console.error('ITEMS 物件未載入，請檢查 items.js');
            return;
        }
        if (!window.Ending) {
            console.error('Ending 物件未載入，請檢查 ending.js');
            return;
        }

        // 計算響應式參數
        calculateResponsiveParameters();

        // 響應式 Canvas 大小
        const maxWidth = windowWidth <= 480 ? windowWidth - 20 : Math.min(windowWidth, 600);
        const maxHeight = windowHeight <= 640 ? windowHeight - 120 : Math.min(windowHeight - 140, 700);
        createCanvas(maxWidth, maxHeight);
        frameRate(16);
        cols = floor(width / cell); rows = floor(height / cell);


        // 檢測並設置字體
        gameFont = detectAndSetFont();
        console.log('使用字體：', gameFont);

        // 顯示字體信息到頁面
        const fontInfoElement = select('#font-info');
        if (fontInfoElement) {
            fontInfoElement.html(gameFont);
        } else {
            console.warn('找不到字體顯示元素 #font-info');
        }

        resetGame();

        // 虛擬方向鍵 - 添加錯誤處理
        const setupButton = (id, direction) => {
            const button = sel(id);
            if (button) {
                button.mousePressed(() => turn(direction));
            } else {
                console.warn(`找不到按鈕元素: ${id}`);
            }
        };

        setupButton('#L', 'LEFT');
        setupButton('#R', 'RIGHT');
        setupButton('#U', 'UP');
        setupButton('#D', 'DOWN');

        // 設置開始遊戲按鈕
        const startButton = select('#start-button');
        if (startButton) {
            startButton.mousePressed(startGame);
        } else {
            console.warn('找不到開始按鈕元素 #start-button');
        }

        // 實體鍵
        window.addEventListener('keydown', e => {
            if (gameState === 'PLAYING') {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault(); // 阻止預設的頁面滾動行為
                    turn('LEFT');
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    turn('RIGHT');
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    turn('UP');
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    turn('DOWN');
                }
            }
        });

        // 遊戲開始時暫停，等待用戶點擊開始
        noLoop();

        console.log('遊戲初始化完成');
    } catch (error) {
        console.error('遊戲初始化時發生錯誤:', error);
    }
}

function startGame() {
    // 隱藏起始視窗
    const startScreen = select('#start-screen');
    if (startScreen) {
        startScreen.style('display', 'none');
    }

    // 顯示倒數視窗
    const countdownScreen = select('#countdown-screen');
    const countdownNumber = select('#countdown-number');
    if (countdownScreen && countdownNumber) {
        countdownScreen.style('display', 'flex');
        let count = 3;
        countdownNumber.html(count);
        let countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.html(count);
            } else {
                clearInterval(countdownInterval);
                countdownScreen.style('display', 'none');
                // 設置遊戲狀態為正在遊戲
                gameState = 'PLAYING';
                // 重置遊戲並開始
                resetGame();
                loop();
                console.log('遊戲開始！');
            }
        }, 1000);
    } else {
        // 若找不到倒數視窗則直接開始
        gameState = 'PLAYING';
        resetGame();
        loop();
        console.log('遊戲開始！');
    }
}

function resetGame() {
    snake = [
        { x: floor(cols / 2), y: floor(rows / 2) },
        { x: floor(cols / 2) - 1, y: floor(rows / 2) }
    ];
    collectedChars = ['']; // 重置字詞數組
    foods = []; for (let i = 0; i < 10; i++) spawnFood();
    dir = 'RIGHT'; speed = 8; t = 0; timer = 60;
    stat = { carb: 0, protein: 0, caffeine: 0 }; ate = [];
    effectUntil = 0; postEffect = null;
    foodChangeTimer = millis(); // 重置食物變換計時器
}

function draw() {
    try {
        background(10, 160, 10);
        // 邊框 - 修正：讓邊框與實際遊戲區域對齊
        noFill(); stroke(0); strokeWeight(2);
        rect(0, 0, cols * cell, rows * cell);

        // 只有在遊戲進行中才執行遊戲邏輯
        if (gameState === 'PLAYING') {
            // 倒數 & HUD - 添加安全檢查
            if (frameCount % 16 === 0 && timer > 0) timer--;
            const timeElement = select('#time');
            const lenElement = select('#len');
            if (timeElement) timeElement.html(timer);
            if (lenElement) lenElement.html(snake.length);

            // 更新速度（效果中）
            let curSpeed = speed;
            if (millis() < effectUntil) curSpeed = speed * (window.currentMul || 1);
            else if (postEffect) { applyMul(postEffect); postEffect = null; }

            // 以速度決定移動節奏
            t += curSpeed / 16;
            if (t >= 1) { t = 0; stepForward(); }

            // 檢查食物變換計時器
            if (millis() - foodChangeTimer >= FOOD_CHANGE_INTERVAL) {
                changeFoodRandomly();
                foodChangeTimer = millis(); // 重置計時器
            }

            // 結束
            if (timer <= 0) return gameOver();
        }

        // 繪製食物
        noStroke();
        if (foods && foods.length > 0) {
            foods.forEach(f => {
                if (f && typeof f.x === 'number' && typeof f.y === 'number' && f.char) {
                    fill(101, 67, 33); rect(f.x * cell, f.y * cell, cell - 1, cell - 1);
                    fill(255); textAlign(CENTER, CENTER); textSize(getResponsiveTextSize());
                    textFont(gameFont);
                    text(f.char, f.x * cell + cell / 2, f.y * cell + cell / 2);
                }
            });
        }

        // 繪製蛇
        if (snake && snake.length > 0) {
            fill(0);
            snake.forEach((s, i) => {
                if (s && typeof s.x === 'number' && typeof s.y === 'number') {
                    if (i === 0) {
                        // 蛇頭：繪製三角形箭頭
                        const centerX = s.x * cell + cell / 2;
                        const centerY = s.y * cell + cell / 2;
                        const size = cell * 0.4;

                        if (dir === 'RIGHT') {
                            triangle(centerX - size, centerY - size, centerX - size, centerY + size, centerX + size, centerY);
                        } else if (dir === 'LEFT') {
                            triangle(centerX + size, centerY - size, centerX + size, centerY + size, centerX - size, centerY);
                        } else if (dir === 'UP') {
                            triangle(centerX - size, centerY + size, centerX + size, centerY + size, centerX, centerY - size);
                        } else if (dir === 'DOWN') {
                            triangle(centerX - size, centerY - size, centerX + size, centerY - size, centerX, centerY + size);
                        }
                    } else {
                        // 蛇身：繪製方塊
                        rect(s.x * cell, s.y * cell, cell - 1, cell - 1);
                        // 根據索引顯示對應的字詞，最新的字在最前面
                        const charIndex = collectedChars.length - (i - 1) - 1;
                        if (charIndex >= 0 && charIndex < collectedChars.length && collectedChars[charIndex]) {
                            fill(255); textSize(getResponsiveTextSize()); textAlign(CENTER, CENTER);
                            textFont(gameFont);
                            text(collectedChars[charIndex], s.x * cell + cell / 2, s.y * cell + cell / 2);
                            fill(0);
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('繪製過程中發生錯誤:', error);
        // 確保遊戲不會因為繪製錯誤而停止
    }
}

function stepForward() {
    // 新頭
    const head = { ...snake[0] };
    if (dir === 'UP') head.y--; if (dir === 'DOWN') head.y++;
    if (dir === 'LEFT') head.x--; if (dir === 'RIGHT') head.x++;

    if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
        gameOver();
        return;
    }

    // 修正：撞自己檢測 - 只檢查蛇身部分（排除蛇頭）
    if (snake.slice(1).some((s) => s.x === head.x && s.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    // 吃字？
    const idx = foods.findIndex(f => f.x === head.x && f.y === head.y);
    if (idx > -1) {
        const ch = foods[idx].char;
        // 蛇變長：新字加到字詞數組末端，這樣新字會顯示在第一節蛇身
        collectedChars.push(ch);
        foods.splice(idx, 1); spawnFood();
        onEat(ch);
    } else {
        // 蛇保持長度：確保蛇身長度與字詞數組對應
        while (snake.length > collectedChars.length + 1) {
            snake.pop();
        }
    }
}

function onEat(ch) {
    // 統計
    const nut = (ITEMS.nutrition[ch] || {});
    for (const k in nut) stat[k] = (stat[k] || 0) + nut[k];
    ate.push(ch);

    // 即時效果
    const fx = ITEMS.effects[ch];
    if (fx) {
        applyMul({ speedMul: fx.speedMul, durationMs: fx.durationMs });
        if (fx.after) postEffect = fx.after;
    }
}

function applyMul({ speedMul = 1, durationMs = 1000 }) {
    window.currentMul = speedMul;
    effectUntil = millis() + durationMs;
}

function spawnFood() {
    try {
        // 檢查 ITEMS 物件是否可用
        if (!window.ITEMS || !window.ITEMS.pool || !Array.isArray(window.ITEMS.pool) || window.ITEMS.pool.length === 0) {
            console.error('ITEMS.pool 不可用，無法生成食物');
            return;
        }

        // 檢查網格大小是否有效
        if (!cols || !rows || cols <= 0 || rows <= 0) {
            console.error('網格大小無效，無法生成食物');
            return;
        }

        const char = random(ITEMS.pool);
        let p;
        let attempts = 0;
        const maxAttempts = 100; // 防止無限迴圈

        do {
            p = { x: floor(random(cols)), y: floor(random(rows)), char };
            attempts++;

            if (attempts > maxAttempts) {
                console.warn('食物生成達到最大嘗試次數，可能網格空間不足');
                break;
            }
        } while (
            snake.some(s => s.x === p.x && s.y === p.y) ||
            foods.some(f => f.x === p.x && f.y === p.y) ||
            // 避免出現在四個角落
            (p.x === 0 && p.y === 0) ||         // 左上角
            (p.x === cols - 1 && p.y === 0) || // 右上角
            (p.x === 0 && p.y === rows - 1) || // 左下角
            (p.x === cols - 1 && p.y === rows - 1) // 右下角
        );

        if (p && typeof p.x === 'number' && typeof p.y === 'number' && p.char) {
            foods.push(p);
        } else {
            console.error('食物生成失敗');
        }
    } catch (error) {
        console.error('食物生成過程中發生錯誤:', error);
    }
}

function turn(next) {
    // 只有在遊戲進行中才允許轉向
    if (gameState !== 'PLAYING') return;

    // 防止反方向移動，無論蛇的長度
    if (next === 'UP' && dir !== 'DOWN') dir = 'UP';
    if (next === 'DOWN' && dir !== 'UP') dir = 'DOWN';
    if (next === 'LEFT' && dir !== 'RIGHT') dir = 'LEFT';
    if (next === 'RIGHT' && dir !== 'LEFT') dir = 'RIGHT';
}

function gameOver() {
    noLoop();
    const tag = Ending.analyze(stat);
    const msg = Ending.line(tag);

    // 列表
    const listEl = document.getElementById('list');
    listEl.innerHTML = '';
    ate.forEach(ch => {
        const b = document.createElement('span');
        b.className = 'chip'; b.textContent = ch; listEl.appendChild(b);
    });
    // 顯示吃到的字的總數
    const totalChars = ate.length;
    document.getElementById('report').textContent = msg + `\n\n本局共吃到 ${totalChars} 個字。`;
    document.getElementById('over').style.display = 'flex';
}

function changeFoodRandomly() {
    // 如果沒有食物，就不執行
    if (foods.length === 0) return;

    // 隨機選擇一個食物進行變換
    const randomIndex = floor(random(foods.length));
    const foodToChange = foods[randomIndex];

    // 給它一個新的字符
    foodToChange.char = random(ITEMS.pool);

    // 重新定位到新位置
    let newPosition;
    do {
        newPosition = { x: floor(random(cols)), y: floor(random(rows)) };
    } while (
        snake.some(s => s.x === newPosition.x && s.y === newPosition.y) ||
        foods.some((f, i) => i !== randomIndex && f.x === newPosition.x && f.y === newPosition.y) ||
        // 避免出現在四個角落
        (newPosition.x === 0 && newPosition.y === 0) ||         // 左上角
        (newPosition.x === cols - 1 && newPosition.y === 0) || // 右上角
        (newPosition.x === 0 && newPosition.y === rows - 1) || // 左下角
        (newPosition.x === cols - 1 && newPosition.y === rows - 1) // 右下角
    );

    // 更新食物位置
    foodToChange.x = newPosition.x;
    foodToChange.y = newPosition.y;
}

function isFontAvailable(fontName) {
    // 建立一個測試畫布
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 測試文字（使用不同的測試字符）
    const testTexts = ['測試', 'Test', '字體', 'Font'];
    const fallbackFont = 'monospace';

    // 設定字體大小
    const fontSize = 72;

    for (let testText of testTexts) {
        // 測試預設字體寬度
        ctx.font = `${fontSize}px ${fallbackFont}`;
        const defaultWidth = ctx.measureText(testText).width;

        // 測試目標字體寬度（多種格式）
        const fontFormats = [
            `${fontSize}px "${fontName}", ${fallbackFont}`,
            `${fontSize}px '${fontName}', ${fallbackFont}`,
            `${fontSize}px ${fontName}, ${fallbackFont}`
        ];

        for (let format of fontFormats) {
            ctx.font = format;
            const testWidth = ctx.measureText(testText).width;

            // 如果寬度不同，表示字體有載入
            if (testWidth !== defaultWidth) {
                console.log(`字體檢測成功: ${fontName}, 使用格式: ${format}, 測試字: ${testText}`);
                return true;
            }
        }
    }

    return false;
}

function detectAndSetFont() {
    console.log('開始字體檢測...');

    const testFonts = [
        "LINE Seed TW_OTF Bold",
        "LINE Seed TW_OTF",
        "LINE Seed TW_OTF Regular",
        "LINE Seed TW_OTF ExtraBold",
        "LINE Seed TW_OTF Thin",
        "LINE Seed TW OTF Bold",
        "LINESeedTW-Bold",
        "LINE Seed TW Bold",
        "LINE Seed TW",
        "PingFang TC",
        "Microsoft JhengHei",
        "Noto Sans TC",
        "system-ui",
        "sans-serif"
    ];

    for (let font of testFonts) {
        console.log(`正在檢測字體: ${font}`);
        if (isFontAvailable(font)) {
            console.log(`✅ 找到可用字體: ${font}`);
            return font;
        } else {
            console.log(`❌ 字體不可用: ${font}`);
        }
    }

    console.log('❌ 沒有找到任何指定字體，使用預設字體: sans-serif');
    return 'sans-serif';
}

function calculateResponsiveParameters() {
    // 根據螢幕寬度計算響應式參數
    if (windowWidth <= 480) {
        // 小螢幕：增大 cell 和文字比例
        cell = Math.max(Math.floor(windowWidth / 15), 20); // 最小 20px，確保至少 15 格寬
        responsiveTextRatio = 0.85; // 較大的文字比例
    } else if (windowWidth <= 768) {
        // 中等螢幕
        cell = Math.max(Math.floor(windowWidth / 18), 24);
        responsiveTextRatio = 0.75;
    } else {
        // 大螢幕：保持較小的比例但增大基礎大小
        cell = Math.max(Math.floor(windowWidth / 20), 28);
        responsiveTextRatio = 0.7;
    }

    console.log(`響應式參數: 螢幕寬度=${windowWidth}, cell=${cell}, 文字比例=${responsiveTextRatio}`);
}

function getResponsiveTextSize() {
    return cell * responsiveTextRatio;
}

function windowResized() {
    try {
        // 暫停遊戲以防止調整過程中的異常
        const wasLooping = isLooping();
        if (wasLooping) noLoop();

        // 保存舊的網格大小
        const oldCols = cols;
        const oldRows = rows;

        // 重新計算響應式參數
        calculateResponsiveParameters();

        // 重新調整 Canvas 大小
        const maxWidth = windowWidth <= 480 ? windowWidth - 20 : Math.min(windowWidth, 600);
        const maxHeight = windowHeight <= 640 ? windowHeight - 120 : Math.min(windowHeight - 140, 700);
        resizeCanvas(maxWidth, maxHeight);

        // 重新計算網格
        cols = floor(width / cell);
        rows = floor(height / cell);

        console.log(`視窗大小改變: ${windowWidth}x${windowHeight}, Canvas: ${width}x${height}, 網格: ${cols}x${rows}`);

        // 檢查並修正遊戲物件位置
        if (snake && snake.length > 0) {
            adjustGameObjectsToNewGrid(oldCols, oldRows);
        }

        // 恢復遊戲
        if (wasLooping) loop();
    } catch (error) {
        console.error('視窗調整過程中發生錯誤:', error);
        // 發生錯誤時確保遊戲能繼續運行
        loop();
    }
}

function adjustGameObjectsToNewGrid(oldCols, oldRows) {
    // 檢查蛇是否超出新邊界
    let needsAdjustment = false;

    snake.forEach(segment => {
        if (segment.x >= cols || segment.y >= rows) {
            needsAdjustment = true;
        }
    });

    // 檢查食物是否超出新邊界
    foods.forEach(food => {
        if (food.x >= cols || food.y >= rows) {
            needsAdjustment = true;
        }
    });

    if (needsAdjustment) {
        console.log('偵測到物件超出新邊界，進行安全重新定位');

        // 安全重新定位蛇的位置
        const centerX = Math.max(1, Math.floor(cols / 2));
        const centerY = Math.max(1, Math.floor(rows / 2));

        // 確保蛇頭在安全區域
        snake[0].x = Math.min(centerX, cols - 2);
        snake[0].y = Math.min(centerY, rows - 2);

        // 重新定位蛇身，確保不超出邊界
        for (let i = 1; i < snake.length; i++) {
            if (dir === 'RIGHT') {
                snake[i].x = Math.max(0, snake[0].x - i);
                snake[i].y = snake[0].y;
            } else if (dir === 'LEFT') {
                snake[i].x = Math.min(cols - 1, snake[0].x + i);
                snake[i].y = snake[0].y;
            } else if (dir === 'DOWN') {
                snake[i].x = snake[0].x;
                snake[i].y = Math.max(0, snake[0].y - i);
            } else { // UP
                snake[i].x = snake[0].x;
                snake[i].y = Math.min(rows - 1, snake[0].y + i);
            }
        }

        // 重新生成所有食物確保位置有效
        foods = [];
        for (let i = 0; i < 10; i++) {
            spawnFood();
        }
    }
}

function sel(q) { return select(q); }