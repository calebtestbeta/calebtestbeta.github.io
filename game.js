// 文字貪食蛇 - 早餐版 v0.2
const GAME_CONFIG = {
    // 固定網格設定
    GRID_COLS: 18,
    GRID_ROWS: 36,
    
    // 遊戲核心參數
    DEFAULT_SPEED: 8,
    GAME_DURATION: 60,
    FOOD_CHANGE_INTERVAL: 5000,
    FRAME_RATE: 16,
    
    // 食物系統配置
    INITIAL_FOOD_COUNT: 6,
    MAX_SPAWN_ATTEMPTS: 100,
    CAFFEINE_FOOD_PROBABILITY: 0.3,
    
    // 響應式設計
    RESPONSIVE_TEXT_RATIO: 0.7,
    MOBILE_BREAKPOINT: 480,
    TABLET_BREAKPOINT: 768,
    
    // 背景顏色配置
    DEFAULT_BACKGROUND_COLOR: [10, 160, 10],
    IOS_BACKGROUND_COLOR: [6, 199, 85],
    ANDROID_BACKGROUND_COLOR: [76, 199, 100],
    
    // Canvas 邊距
    CANVAS_PADDING: 40
};

// 遊戲狀態變數
let cell, cols = GAME_CONFIG.GRID_COLS, rows = GAME_CONFIG.GRID_ROWS;
let snake, dir = 'RIGHT', foods = [], speed = 8, t = 0, timer = 60;
let stat = { carb: 0, protein: 0, caffeine: 0 }, ate = [];
let effectUntil = 0, postEffect = null;
let collectedChars = [];
let collectedCharTypes = [];
let foodChangeTimer = 0;
let gameFont = 'sans-serif';
let responsiveTextRatio = GAME_CONFIG.RESPONSIVE_TEXT_RATIO;
let gameState = 'START';
let isPaused = false;
let gameBackgroundColor = [...GAME_CONFIG.DEFAULT_BACKGROUND_COLOR];
let previousScreen = 'START';
let difficulty = 'easy';
const DIFFICULTY_SETTINGS = {
    easy: { 
        name: '簡單', 
        speedMultiplier: 0.7, 
        description: '悠閒享受早餐時光',
        color: '#4CAF50'
    },
    normal: { 
        name: '普通', 
        speedMultiplier: 1.0, 
        description: '正常早餐節奏',
        color: '#FF9800'
    },
    hard: { 
        name: '困難', 
        speedMultiplier: 1.4, 
        description: '急忙趕早班的速度',
        color: '#F44336'
    }
};

// 實用工具函數
const Utils = {
    // 安全的數學運算
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    // 隨機整數
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    // 檢查位置是否在邊界內
    isValidPosition(x, y, cols, rows) {
        return x >= 0 && x < cols && y >= 0 && y < rows;
    },
    
    // 檢查兩個位置是否相同
    isSamePosition(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    },
    
    // 將十六進制顏色轉換為 RGB 陣列
    hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }
};

// DOM 元素管理器
const DOMManager = {
    elements: {},
    
    // 初始化時快取所有常用元素
    init() {
        this.elements = {
            // HUD 元素
            time: select('#time'),
            len: select('#len'),
            fontInfo: select('#font-info'),
            
            // 畫面元素
            startScreen: select('#start-screen'),
            countdownScreen: select('#countdown-screen'),
            countdownNumber: select('#countdown-number'),
            helpScreen: select('#help-screen'),
            overScreen: select('#over'),
            
            // 按鈕元素
            startButton: select('#start-button'),
            helpButton: select('#help-button'),
            helpFromEndButton: select('#help-from-end-button'),
            helpBackButton: select('#help-back-button'),
            
            // 內容容器
            foodCategories: select('#food-categories'),
            list: select('#list'),
            report: select('#report'),
            nutritionChart: select('#nutritionChart')
        };
        
        // 移除不存在的元素
        Object.keys(this.elements).forEach(key => {
            if (!this.elements[key]) {
                console.warn(`DOM元素不存在: #${key}`);
                delete this.elements[key];
            }
        });
    },
    
    // 安全獲取元素
    get(elementKey) {
        return this.elements[elementKey] || null;
    },
    
    // 設定元素內容
    setContent(elementKey, content) {
        const element = this.get(elementKey);
        if (element) {
            element.html(content);
        }
    },
    
    // 設定元素樣式
    setStyle(elementKey, property, value) {
        const element = this.get(elementKey);
        if (element) {
            element.style(property, value);
        }
    },
    
    // 顯示/隱藏元素
    show(elementKey) {
        this.setStyle(elementKey, 'display', 'flex');
    },
    
    hide(elementKey) {
        this.setStyle(elementKey, 'display', 'none');
    }
};

// 食物類型色彩系統
const FOOD_COLORS = {
    // 碳水化合物：藍色系
    carb: {
        background: '#E3F2FD',  // 淺藍色背景
        border: '#2196F3',      // 藍色邊框
        text: '#0D47A1'         // 深藍色文字
    },
    // 咖啡因：粉紅色系
    caffeine: {
        background: '#FCE4EC',  // 淺粉紅色背景
        border: '#E91E63',      // 粉紅色邊框
        text: '#880E4F'         // 深粉紅色文字
    },
    // 蛋白質：深黃色系（提高對比度）
    protein: {
        background: '#FFF3C4',  // 更深的淺黃色背景
        border: '#FFD700',      // 金黃色邊框（更鮮明）
        text: '#E65100'         // 更深的橘黃色文字（提高可讀性）
    },
    // 預設（其他類型）
    default: {
        background: '#F5F5F5',  // 灰色背景
        border: '#9E9E9E',      // 灰色邊框
        text: '#424242'         // 深灰色文字
    }
};

// 根據營養成分判斷食物主要類型
function getFoodType(char) {
    const nutrition = ITEMS.nutrition[char];
    if (!nutrition) return 'default';
    
    // 咖啡因優先（特殊類型）
    if (nutrition.caffeine && nutrition.caffeine > 0) {
        return 'caffeine';
    }
    
    // 比較蛋白質和碳水化合物
    const protein = nutrition.protein || 0;
    const carb = nutrition.carb || 0;
    
    if (protein > carb) {
        return 'protein';
    } else if (carb > 0) {
        return 'carb';
    }
    
    return 'default';
}

// 取得食物顏色
function getFoodColor(char) {
    const type = getFoodType(char);
    const color = FOOD_COLORS[type] || FOOD_COLORS.default;
    
    // 確保顏色物件完整
    if (!color || !color.background || !color.border || !color.text) {
        console.warn(`食物顏色不完整: char=${char}, type=${type}`, color);
        return FOOD_COLORS.default;
    }
    
    return color;
}

// 加權食物選擇函數 - 增加咖啡因食物出現概率
function getWeightedFood() {
    // 定義咖啡因食物
    const caffeineFoods = ['茶', '咖', '拿', '可', '抹'];
    
    // 使用配置中的咖啡因食物出現機率
    if (random() < GAME_CONFIG.CAFFEINE_FOOD_PROBABILITY) {
        return random(caffeineFoods);
    } else {
        // 從非咖啡因食物中選擇
        const nonCaffeineFoods = ITEMS.pool.filter(food => !caffeineFoods.includes(food));
        return random(nonCaffeineFoods);
    }
}

// 初始化系統
function initializeDependencies() {
    if (!window.ITEMS) {
        console.error('ITEMS 物件未載入，請檢查 items.js');
        return false;
    }
    if (!window.Ending) {
        console.error('Ending 物件未載入，請檢查 ending.js');
        return false;
    }
    return true;
}

function initializeCanvas() {
    const canvasSize = calculateOptimalCanvasSize();
    createCanvas(canvasSize.width, canvasSize.height);
    frameRate(GAME_CONFIG.FRAME_RATE);
    
    // 立即設置初始背景顏色，防止顯示黑色
    if (gameBackgroundColor && gameBackgroundColor.length === 3) {
        background(gameBackgroundColor[0], gameBackgroundColor[1], gameBackgroundColor[2]);
    } else {
        background(10, 160, 10); // 預設綠色
    }
    
    cell = canvasSize.cellSize;
    cols = GAME_CONFIG.GRID_COLS;
    rows = GAME_CONFIG.GRID_ROWS;
    
    console.log(`Canvas初始化: ${canvasSize.width}x${canvasSize.height}, Cell大小: ${cell}, 網格: ${GAME_CONFIG.GRID_COLS}x${GAME_CONFIG.GRID_ROWS}`);
}

function calculateOptimalCanvasSize() {
    // 檢測設備類型
    const isMobile = windowWidth <= GAME_CONFIG.MOBILE_BREAKPOINT;
    const isTablet = windowWidth > GAME_CONFIG.MOBILE_BREAKPOINT && windowWidth <= GAME_CONFIG.TABLET_BREAKPOINT;
    const isDesktop = windowWidth > GAME_CONFIG.TABLET_BREAKPOINT;
    
    // 根據設備類型設定邊距和可用空間
    let horizontalPadding, verticalReduction, maxCellSize, minCellSize;
    
    if (isMobile) {
        // 手機：極小邊距，最大化利用螢幕空間
        horizontalPadding = windowWidth <= 375 ? 8 : 12; // iPhone SE使用8px，其他手機12px
        verticalReduction = windowHeight <= 667 ? 240 : 260; // 大幅減少垂直空間占用
        maxCellSize = 40;  // 進一步增加手機最大cell大小
        minCellSize = 14;  // 提高最小cell大小確保可讀性
    } else if (isTablet) {
        // 平板：適中邊距
        horizontalPadding = 20;
        verticalReduction = 180;
        maxCellSize = 32;
        minCellSize = 16;
    } else {
        // 桌面：標準邊距
        horizontalPadding = GAME_CONFIG.CANVAS_PADDING;
        verticalReduction = 160;
        maxCellSize = 28;
        minCellSize = 18;
    }
    
    const availableWidth = windowWidth - (horizontalPadding * 2);
    const availableHeight = windowHeight - verticalReduction;
    
    const cellSizeByWidth = Math.floor(availableWidth / GAME_CONFIG.GRID_COLS);
    const cellSizeByHeight = Math.floor(availableHeight / GAME_CONFIG.GRID_ROWS);
    
    // 智能選擇cell大小：優先考慮充分利用螢幕寬度
    let optimalCellSize;
    if (isMobile) {
        // 手機：優先使用寬度計算，確保充分利用螢幕寬度
        optimalCellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
        // 如果寬度能提供更大的cell但仍在合理範圍內，優先考慮寬度
        if (cellSizeByWidth <= maxCellSize && cellSizeByWidth > optimalCellSize) {
            optimalCellSize = cellSizeByWidth;
        }
    } else {
        // 平板和桌面：平衡寬高比
        optimalCellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
    }
    
    // 確保cell大小在合理範圍內
    optimalCellSize = Math.max(minCellSize, Math.min(maxCellSize, optimalCellSize));
    
    const canvasWidth = optimalCellSize * GAME_CONFIG.GRID_COLS;
    const canvasHeight = optimalCellSize * GAME_CONFIG.GRID_ROWS;
    
    const deviceType = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';
    const screenUtilization = ((canvasWidth / windowWidth) * 100).toFixed(1);
    
    console.log(`Canvas計算 - 設備：${deviceType}`);
    console.log(`  視窗：${windowWidth}x${windowHeight}px`);
    console.log(`  邊距：H${horizontalPadding}px, V-${verticalReduction}px`);
    console.log(`  可用空間：${availableWidth}x${availableHeight}px`);
    console.log(`  Cell計算：寬度${cellSizeByWidth}px, 高度${cellSizeByHeight}px, 選用${optimalCellSize}px`);
    console.log(`  最終Canvas：${canvasWidth}x${canvasHeight}px`);
    console.log(`  螢幕寬度利用率：${screenUtilization}%`);
    
    // 提供設備特定的優化建議和警告
    if (isMobile) {
        if (optimalCellSize < 16) {
            console.warn('⚠️  手機cell大小偏小，可能影響操作體驗');
        } else if (optimalCellSize >= 25) {
            console.info('✅ 手機cell大小良好，遊戲體驗佳');
        }
        
        if (screenUtilization < 80) {
            console.warn(`⚠️  螢幕寬度利用率偏低(${screenUtilization}%)，建議檢查邊距設置`);
        } else {
            console.info(`✅ 螢幕利用率良好(${screenUtilization}%)`);
        }
    }
    
    return {
        width: canvasWidth,
        height: canvasHeight,
        cellSize: optimalCellSize
    };
}

function initializeGameSettings() {
    gameFont = detectAndSetFont();
    setGameBackgroundColor();
    
    // 確保背景顏色正確設置
    if (!gameBackgroundColor || gameBackgroundColor.length !== 3) {
        console.warn('背景顏色設置失敗，使用預設值');
        gameBackgroundColor = [10, 160, 10]; // 預設綠色
    }
    
    // 立即應用背景顏色到Canvas
    background(gameBackgroundColor[0], gameBackgroundColor[1], gameBackgroundColor[2]);
    
    console.log('使用字體：', gameFont);
    console.log('遊戲背景顏色設定：', gameBackgroundColor);
    
    DOMManager.setContent('fontInfo', gameFont);
}

function setupControls() {
    setupVirtualButtons();
    setupKeyboardControls();
    setupGameButtons();
    setupDifficultySelector();
}

function setupVirtualButtons() {
    const buttonMappings = [
        { id: '#L', direction: 'LEFT' },
        { id: '#R', direction: 'RIGHT' },
        { id: '#U', direction: 'UP' },
        { id: '#D', direction: 'DOWN' }
    ];
    
    buttonMappings.forEach(({ id, direction }) => {
        const button = select(id);
        if (button) {
            button.mousePressed(() => changeDirection(direction));
        } else {
            console.warn(`找不到按鈕元素: ${id}`);
        }
    });
}

function setupKeyboardControls() {
    window.addEventListener('keydown', handleKeyPress);
}

function handleKeyPress(event) {
    // 暫停功能
    if (event.key === 'p' || event.key === 'P') {
        if (gameState === 'PLAYING') {
            event.preventDefault();
            togglePause();
        }
        return;
    }
    
    // 方向鍵控制
    if (gameState === 'PLAYING' && !isPaused) {
        const keyDirectionMap = {
            'ArrowLeft': 'LEFT',
            'ArrowRight': 'RIGHT',
            'ArrowUp': 'UP',
            'ArrowDown': 'DOWN'
        };
        
        if (keyDirectionMap[event.key]) {
            event.preventDefault();
            changeDirection(keyDirectionMap[event.key]);
        }
    }
}

function setupGameButtons() {
    const startButton = DOMManager.get('startButton');
    if (startButton) {
        startButton.mousePressed(startGame);
    }
    
    setupHelpButtons();
}

function setup() {
    try {
        if (!initializeDependencies()) return;
        
        // 強制初始背景顏色設置
        console.log('Setup開始 - 強制設置初始背景');
        if (!gameBackgroundColor || gameBackgroundColor.length !== 3) {
            gameBackgroundColor = [10, 160, 10]; // 強制預設值
        }
        
        DOMManager.init();
        initializeCanvas();
        initializeGameSettings();
        resetGame();
        setupControls();
        
        // 在setup最後繪製一次背景，然後暫停等待用戶點擊開始
        // 確保初始背景顏色正確顯示
        if (gameBackgroundColor && gameBackgroundColor.length === 3) {
            background(gameBackgroundColor[0], gameBackgroundColor[1], gameBackgroundColor[2]);
        } else {
            background(10, 160, 10); // 預設綠色
        }
        
        // 繪製邊框
        noFill(); 
        stroke(0); 
        strokeWeight(2);
        rect(0, 0, cols * cell, rows * cell);
        
        noLoop();
        
        console.log('遊戲初始化完成');
        validateGameConfig();
        logColorVerification();
    } catch (error) {
        console.error('遊戲初始化時發生錯誤:', error);
    }
}

function logColorVerification() {
    console.log('=== 蛋白質顏色驗證 ===');
    console.log('新的蛋白質顏色設定：', FOOD_COLORS.protein);
    console.log('蛋白質食物顏色測試：', getFoodColor('蛋'));
    
    console.log('=== 背景顏色驗證 ===');
    console.log('當前背景顏色設定：', gameBackgroundColor);
    
    // 強制驗證背景顏色
    if (!gameBackgroundColor || gameBackgroundColor.length !== 3) {
        console.error('❌ 背景顏色設定錯誤，立即修正');
        gameBackgroundColor = [10, 160, 10];
        // 立即重新繪製背景
        background(gameBackgroundColor[0], gameBackgroundColor[1], gameBackgroundColor[2]);
    } else {
        console.log('✅ 背景顏色設定正確');
    }
}

// 驗證配置常數是否正確載入
function validateGameConfig() {
    console.log('=== 遊戲配置驗證 ===');
    
    const requiredConfigs = [
        'GRID_COLS', 'GRID_ROWS', 'DEFAULT_SPEED', 'GAME_DURATION', 'FOOD_CHANGE_INTERVAL',
        'RESPONSIVE_TEXT_RATIO', 'DEFAULT_BACKGROUND_COLOR', 'FRAME_RATE',
        'INITIAL_FOOD_COUNT', 'MAX_SPAWN_ATTEMPTS', 'CAFFEINE_FOOD_PROBABILITY',
        'MOBILE_BREAKPOINT', 'TABLET_BREAKPOINT', 'CANVAS_PADDING'
    ];
    
    requiredConfigs.forEach(config => {
        if (GAME_CONFIG[config] !== undefined) {
            console.log(`✓ ${config}: ${GAME_CONFIG[config]}`);
        } else {
            console.error(`✗ 缺少配置: ${config}`);
        }
    });
    
    // 驗證響應式畫布配置
    console.log('=== 響應式畫布配置驗證 ===');
    const canvasSize = calculateOptimalCanvasSize();
    console.log(`✓ 計算出的畫布大小: ${canvasSize.width}x${canvasSize.height}`);
    console.log(`✓ Cell 大小: ${canvasSize.cellSize}px`);
    console.log(`✓ 文字大小: ${getResponsiveTextSize()}px`);
    
    // 驗證設備檢測
    const isMobile = windowWidth <= GAME_CONFIG.MOBILE_BREAKPOINT;
    const isTablet = windowWidth > GAME_CONFIG.MOBILE_BREAKPOINT && windowWidth <= GAME_CONFIG.TABLET_BREAKPOINT;
    const deviceType = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';
    console.log(`✓ 設備類型: ${deviceType} (視窗: ${windowWidth}x${windowHeight})`);
    
    console.log('=== 配置驗證完成 ===');
}

function startGame() {
    // 隱藏起始視窗
    DOMManager.hide('startScreen');

    // 顯示倒數視窗
    DOMManager.show('countdownScreen');
    DOMManager.setContent('countdownNumber', 3);
    
    let count = 3;
    let countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            DOMManager.setContent('countdownNumber', count);
        } else {
            clearInterval(countdownInterval);
            DOMManager.hide('countdownScreen');
            // 設置遊戲狀態為正在遊戲
            gameState = 'PLAYING';
            // 重置遊戲並開始
            resetGame();
            // 確保背景顏色正確設置
            setGameBackgroundColor();
            loop();
            console.log('遊戲開始！');
        }
    }, 1000);
    
    // 如果找不到倒數視窗元素則直接開始
    if (!DOMManager.get('countdownScreen') || !DOMManager.get('countdownNumber')) {
        gameState = 'PLAYING';
        resetGame();
        // 確保背景顏色正確設置
        setGameBackgroundColor();
        loop();
        console.log('遊戲開始！');
    }
}

function resetGame() {
    // 隨機選擇初始方向
    dir = getRandomDirection();
    
    // 計算遊戲區域中心位置並初始化蛇的位置
    initializeSnake();
    
    // 重置遊戲狀態
    resetGameState();
    
    // 初始化食物
    initializeFoods();
    
    console.log(`遊戲重置 - 網格: ${cols}x${rows}, 初始方向: ${dir}, 蛇頭位置: (${snake[0].x}, ${snake[0].y}), 蛇身位置: (${snake[1].x}, ${snake[1].y})`);
}

function initializeSnake() {
    const centerX = floor(cols / 2);
    const centerY = floor(rows / 2);
    snake = getInitialSnakePosition(dir, centerX, centerY);
}

function resetGameState() {
    collectedChars = [];
    collectedCharTypes = [];
    speed = GAME_CONFIG.DEFAULT_SPEED;
    t = 0;
    timer = GAME_CONFIG.GAME_DURATION;
    stat = { carb: 0, protein: 0, caffeine: 0 };
    ate = [];
    effectUntil = 0;
    postEffect = null;
    foodChangeTimer = millis();
    isPaused = false;
}

function initializeFoods() {
    foods = [];
    for (let i = 0; i < GAME_CONFIG.INITIAL_FOOD_COUNT; i++) {
        spawnFood();
    }
}

function draw() {
    try {
        // 確保背景顏色正確設置，如果沒有則立即設置
        if (!gameBackgroundColor || gameBackgroundColor.length !== 3) {
            console.warn('背景顏色未正確初始化，立即設置');
            gameBackgroundColor = [10, 160, 10]; // 直接設置預設值
            setGameBackgroundColor(); // 嘗試重新設置
        }
        
        // 設置背景顏色
        if (gameBackgroundColor && gameBackgroundColor.length === 3) {
            background(gameBackgroundColor[0], gameBackgroundColor[1], gameBackgroundColor[2]);
        } else {
            // 最終回退到預設綠色
            background(10, 160, 10);
            gameBackgroundColor = [10, 160, 10]; // 確保變數同步
            console.warn('使用最終預設背景顏色');
        }
        
        // 僅在前10幀顯示調試信息
        if (frameCount <= 10) {
            console.log('Frame', frameCount, '背景顏色:', gameBackgroundColor);
        }
        // 邊框 - 修正：讓邊框與實際遊戲區域對齊
        noFill(); stroke(0); strokeWeight(2);
        rect(0, 0, cols * cell, rows * cell);

        // 只有在遊戲進行中且未暫停才執行遊戲邏輯
        if (gameState === 'PLAYING' && !isPaused) {
            // 倒數 & HUD - 添加安全檢查
            if (frameCount % 16 === 0 && timer > 0) timer--;
            // 使用 DOMManager 更新 HUD 元素
            DOMManager.setContent('time', timer);
            DOMManager.setContent('len', snake.length);

            // 更新速度（結合難度與效果）
            const baseSpeed = speed * DIFFICULTY_SETTINGS[difficulty].speedMultiplier;
            let curSpeed = baseSpeed;
            if (millis() < effectUntil) curSpeed = baseSpeed * (window.currentMul || 1);
            else if (postEffect) { applyMul(postEffect); postEffect = null; }

            // 以速度決定移動節奏
            t += curSpeed / 16;
            if (t >= 1) { t = 0; stepForward(); }

            // 檢查食物變換計時器
            if (millis() - foodChangeTimer >= GAME_CONFIG.FOOD_CHANGE_INTERVAL) {
                changeFoodRandomly();
                foodChangeTimer = millis(); // 重置計時器
            }

            // 結束
            if (timer <= 0) return gameOver();
        }

        // 繪製食物
        if (foods && foods.length > 0) {
            foods.forEach(f => {
                if (f && typeof f.x === 'number' && typeof f.y === 'number' && f.char) {
                    const foodColor = getFoodColor(f.char);
                    
                    // 繪製食物背景（帶顏色）
                    fill(foodColor.background);
                    stroke(foodColor.border);
                    strokeWeight(2);
                    rect(f.x * cell + 1, f.y * cell + 1, cell - 2, cell - 2, 4);
                    
                    // 繪製食物文字
                    fill(foodColor.text);
                    noStroke();
                    textAlign(CENTER, CENTER);
                    textSize(getResponsiveTextSize());
                    textFont(gameFont);
                    text(f.char, f.x * cell + cell / 2, f.y * cell + cell / 2);
                }
            });
        }

        // 繪製蛇
        if (snake && snake.length > 0) {
            snake.forEach((s, i) => {
                if (s && typeof s.x === 'number' && typeof s.y === 'number') {
                    if (i === 0) {
                        // 蛇頭：繪製三角形箭頭（黑色）
                        fill(0);
                        noStroke();
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
                        // 蛇身：根據字詞類型顯示顏色
                        const charIndex = i - 1; // 修正索引計算：i=1對應collectedChars[0]
                        if (charIndex >= 0 && charIndex < collectedChars.length && collectedChars[charIndex]) {
                            const char = collectedChars[charIndex];
                            const charType = collectedCharTypes[charIndex];
                            const foodColor = FOOD_COLORS[charType] || FOOD_COLORS.default;
                            
                            // 繪製蛇身背景（帶顏色）
                            fill(foodColor.background);
                            stroke(foodColor.border);
                            strokeWeight(1);
                            rect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2, 2);
                            
                            // 繪製字詞
                            fill(foodColor.text);
                            noStroke();
                            textSize(getResponsiveTextSize());
                            textAlign(CENTER, CENTER);
                            textFont(gameFont);
                            text(char, s.x * cell + cell / 2, s.y * cell + cell / 2);
                        } else {
                            // 沒有對應字詞的蛇身（預設黑色）
                            fill(0);
                            noStroke();
                            rect(s.x * cell, s.y * cell, cell - 1, cell - 1);
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
    const newHead = calculateNewHeadPosition();
    
    if (isCollision(newHead)) {
        gameOver();
        return;
    }

    snake.unshift(newHead);
    
    const eatenFood = checkFoodCollision(newHead);
    if (eatenFood) {
        handleFoodConsumption(eatenFood);
    } else {
        maintainSnakeLength();
    }
}

function calculateNewHeadPosition() {
    const head = { ...snake[0] };
    
    const movementMap = {
        'UP': { x: 0, y: -1 },
        'DOWN': { x: 0, y: 1 },
        'LEFT': { x: -1, y: 0 },
        'RIGHT': { x: 1, y: 0 }
    };
    
    const movement = movementMap[dir];
    head.x += movement.x;
    head.y += movement.y;
    
    return head;
}

function isCollision(position) {
    // 檢查邊界碰撞
    if (!Utils.isValidPosition(position.x, position.y, cols, rows)) {
        return true;
    }
    
    // 檢查自身碰撞（排除蛇頭）
    return snake.slice(1).some(segment => 
        Utils.isSamePosition(position, segment)
    );
}

function checkFoodCollision(position) {
    const foodIndex = foods.findIndex(food => 
        Utils.isSamePosition(position, food)
    );
    
    if (foodIndex !== -1) {
        const food = foods[foodIndex];
        foods.splice(foodIndex, 1);
        return food;
    }
    
    return null;
}

function handleFoodConsumption(food) {
    const char = food.char;
    const foodType = getFoodType(char);
    
    // 記錄收集到的食物
    collectedChars.push(char);
    collectedCharTypes.push(foodType);
    
    // 生成新食物
    spawnFood();
    
    // 應用食物效果
    onEat(char);
}

function maintainSnakeLength() {
    // 保持蛇的長度：初始長度2 + 收集的字符數
    const targetLength = 2 + collectedChars.length;
    while (snake.length > targetLength) {
        snake.pop();
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
    
    // 調試信息：記錄咖啡因食物的攝取
    if (['拿', '可', '抹'].includes(ch)) {
        console.log(`吃到咖啡因食物: ${ch}, 類型: ${getFoodType(ch)}, 咖啡因總量: ${stat.caffeine || 0}`);
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

        const char = getWeightedFood();
        let p;
        let attempts = 0;
        const maxAttempts = GAME_CONFIG.MAX_SPAWN_ATTEMPTS; // 防止無限迴圈

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

function changeDirection(newDirection) {
    // 只有在遊戲進行中且未暫停才允許轉向
    if (gameState !== 'PLAYING' || isPaused) return;

    // 防止反方向移動的映射
    const oppositeDirections = {
        'UP': 'DOWN',
        'DOWN': 'UP', 
        'LEFT': 'RIGHT',
        'RIGHT': 'LEFT'
    };

    // 防止反方向移動，無論蛇的長度
    if (oppositeDirections[newDirection] !== dir) {
        dir = newDirection;
    }
}

function gameOver() {
    noLoop();
    gameState = 'OVER';
    isPaused = false; // 重置暫停狀態
    
    try {
        // 安全地分析結果
        let tag, msg;
        try {
            tag = Ending.analyze(stat);
            msg = Ending.line(tag);
        } catch (error) {
            console.error('營養分析過程中發生錯誤:', error);
            // 使用備用分析邏輯
            const c = stat.carb || 0, p = stat.protein || 0, caf = stat.caffeine || 0;
            if (caf >= 2) tag = "highCaffeine";
            else if (p > c) tag = "highProtein";
            else if (c > p) tag = "highCarb";
            else tag = "balanced";
            
            msg = Ending.line(tag);
        }

        // 列表
        const listEl = document.getElementById('list');
        if (listEl) {
            listEl.innerHTML = '';
            ate.forEach(ch => {
                const b = document.createElement('span');
                b.className = 'chip';
                b.textContent = ch;
                
                // 根據食物類型設定顏色
                const foodType = getFoodType(ch);
                const foodColor = getFoodColor(ch); // 使用getFoodColor確保安全
                b.style.backgroundColor = foodColor.background;
                b.style.border = `2px solid ${foodColor.border}`;
                b.style.color = foodColor.text;
                
                listEl.appendChild(b);
            });
        }

        // 顯示吃到的字的總數
        const totalChars = ate.length;
        const reportEl = document.getElementById('report');
        if (reportEl) {
            reportEl.textContent = msg + `\n\n本局共吃到 ${totalChars} 個字。`;
        }

        // 顯示結束畫面
        const overEl = document.getElementById('over');
        if (overEl) {
            overEl.style.display = 'flex';
        }

        // 延遲渲染圖表，確保DOM已更新
        setTimeout(() => {
            try {
                renderNutritionChart();
            } catch (error) {
                console.error('圖表渲染失敗:', error);
            }
        }, 100);

    } catch (error) {
        console.error('遊戲結束處理過程中發生錯誤:', error);
        // 確保至少能顯示基本結束畫面
        const overEl = document.getElementById('over');
        if (overEl) {
            overEl.style.display = 'flex';
        }
    }
}

function renderNutritionChart() {
    const canvas = document.getElementById('nutritionChart');
    if (!canvas || typeof Chart === 'undefined') {
        console.warn('Chart.js未載入或Canvas元素不存在');
        return;
    }

    // 清除之前的圖表實例
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['咖啡因', '碳水化合物', '蛋白質'],
            datasets: [{
                data: [stat.caffeine || 0, stat.carb || 0, stat.protein || 0],
                backgroundColor: [
                    FOOD_COLORS.caffeine.border,  // 咖啡因：粉紅色
                    FOOD_COLORS.carb.border,      // 碳水化合物：藍色
                    FOOD_COLORS.protein.border    // 蛋白質：金黃色
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function changeFoodRandomly() {
    // 如果沒有食物，就不執行
    if (foods.length === 0) return;

    // 隨機選擇一個食物進行變換
    const randomIndex = floor(random(foods.length));
    const foodToChange = foods[randomIndex];

    // 給它一個新的字符
    foodToChange.char = getWeightedFood();

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
    // 已被 calculateOptimalCanvasSize 取代，保留此函數以防其他地方使用
    console.log('calculateResponsiveParameters 已被 calculateOptimalCanvasSize 取代');
}

function getResponsiveTextSize() {
    // 根據cell大小和設備類型調整文字大小
    const isMobile = windowWidth <= GAME_CONFIG.MOBILE_BREAKPOINT;
    const isTablet = windowWidth > GAME_CONFIG.MOBILE_BREAKPOINT && windowWidth <= GAME_CONFIG.TABLET_BREAKPOINT;
    
    let textRatio;
    if (isMobile) {
        // 手機上使用較大的文字比例以確保可讀性
        textRatio = cell <= 16 ? 0.8 : 0.75;
    } else if (isTablet) {
        textRatio = 0.7;
    } else {
        textRatio = 0.65; // 桌面使用較小比例
    }
    
    const baseSize = cell * textRatio;
    
    // 確保文字大小在合理範圍內
    const minSize = isMobile ? 10 : 12;
    const maxSize = isMobile ? 24 : 20;
    
    return Math.max(minSize, Math.min(maxSize, baseSize));
}

function windowResized() {
    try {
        // 暫停遊戲以防止調整過程中的異常
        const wasLooping = isLooping();
        if (wasLooping) noLoop();

        // 重新計算Canvas大小和cell大小
        const canvasSize = calculateOptimalCanvasSize();
        resizeCanvas(canvasSize.width, canvasSize.height);
        
        // 更新cell大小（網格大小保持固定）
        cell = canvasSize.cellSize;
        
        console.log(`視窗大小改變: ${windowWidth}x${windowHeight}, Canvas: ${canvasSize.width}x${canvasSize.height}, Cell: ${cell}, 網格: ${cols}x${rows}（固定）`);

        // 檢查並修正遊戲物件位置（如果需要）
        if (snake && snake.length > 0) {
            adjustGameObjectsToNewGrid(GAME_CONFIG.GRID_COLS, GAME_CONFIG.GRID_ROWS);
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

// 隨機方向相關函數
function getRandomDirection() {
    const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    return directions[floor(random(directions.length))];
}

function getInitialSnakePosition(direction, centerX, centerY) {
    // 確保有足夠空間：離邊界至少2格距離
    const minDistance = 2;
    const safeX = Math.max(minDistance, Math.min(centerX, cols - minDistance - 1));
    const safeY = Math.max(minDistance, Math.min(centerY, rows - minDistance - 1));
    
    let head, body;
    
    switch (direction) {
        case 'UP':
            // 向上移動：蛇身在蛇頭下方
            head = { x: safeX, y: safeY };
            body = { x: safeX, y: safeY + 1 };
            break;
        case 'DOWN':
            // 向下移動：蛇身在蛇頭上方
            head = { x: safeX, y: safeY };
            body = { x: safeX, y: safeY - 1 };
            break;
        case 'LEFT':
            // 向左移動：蛇身在蛇頭右方
            head = { x: safeX, y: safeY };
            body = { x: safeX + 1, y: safeY };
            break;
        case 'RIGHT':
        default:
            // 向右移動：蛇身在蛇頭左方
            head = { x: safeX, y: safeY };
            body = { x: safeX - 1, y: safeY };
            break;
    }
    
    // 雙重檢查：確保蛇的所有部分都在遊戲邊界內
    const validHead = head.x >= 0 && head.x < cols && head.y >= 0 && head.y < rows;
    const validBody = body.x >= 0 && body.x < cols && body.y >= 0 && body.y < rows;
    
    if (!validHead || !validBody) {
        console.warn(`初始位置警告: 方向=${direction}, 蛇頭=(${head.x},${head.y}), 蛇身=(${body.x},${body.y}), 網格大小=(${cols},${rows})`);
        // 如果計算出的位置無效，回到更安全的中心位置
        const fallbackX = Math.floor(cols / 2);
        const fallbackY = Math.floor(rows / 2);
        return [
            { x: fallbackX, y: fallbackY },
            { x: Math.max(0, fallbackX - 1), y: fallbackY }
        ];
    }
    
    return [head, body];
}

// 暫停功能相關函數
function togglePause() {
    if (gameState !== 'PLAYING') return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        pauseGame();
    } else {
        resumeGame();
    }
}

function pauseGame() {
    if (gameState !== 'PLAYING') return;
    
    noLoop();
    console.log('遊戲已暫停 - 按P鍵繼續');
}

function resumeGame() {
    if (gameState !== 'PLAYING') return;
    
    loop();
    console.log('遊戲已繼續');
}

function getGamePausedState() {
    return isPaused;
}

function setupDifficultySelector() {
    // 獲取所有難度按鈕
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    
    // 設定預設選中簡單難度
    const defaultButton = document.querySelector('[data-difficulty="easy"]');
    if (defaultButton) {
        defaultButton.classList.add('selected');
    }
    
    // 為每個按鈕添加點擊事件
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有按鈕的選中狀態
            difficultyButtons.forEach(btn => btn.classList.remove('selected'));
            
            // 設定當前按鈕為選中狀態
            button.classList.add('selected');
            
            // 更新難度設定
            difficulty = button.getAttribute('data-difficulty');
            
            console.log(`難度已變更為: ${DIFFICULTY_SETTINGS[difficulty].name}`);
        });
    });
    
    console.log('難度選擇器初始化完成，預設難度：簡單');
}

// 設置遊戲背景顏色函數
function setGameBackgroundColor() {
    try {
        // 檢查是否有全域的裝置檢測結果
        if (typeof window.detectDeviceAndSetBackground === 'function') {
            const deviceInfo = window.detectDeviceAndSetBackground();
            
            // 將十六進制顏色轉換為 RGB
            const hexColor = deviceInfo.backgroundColor;
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);
            
            gameBackgroundColor = [r, g, b];
            
            console.log(`遊戲背景顏色已設置為: RGB(${r}, ${g}, ${b}) - 裝置類型: ${deviceInfo.deviceType}`);
        } else {
            // 回退到手動檢測
            console.log('window.detectDeviceAndSetBackground 不可用，使用手動檢測');
            const userAgent = navigator.userAgent.toLowerCase();
            let r = 10, g = 160, b = 10; // 預設顏色
            
            if (/iphone|ipad|ipod/.test(userAgent)) {
                // iOS: #06C755
                r = 6; g = 199; b = 85;
            } else if (/android/.test(userAgent)) {
                // Android: #4CC764
                r = 76; g = 199; b = 100;
            }
            
            gameBackgroundColor = [r, g, b];
            console.log(`遊戲背景顏色已設置為: RGB(${r}, ${g}, ${b}) - 手動檢測`);
        }
    } catch (error) {
        console.error('設置背景顏色時發生錯誤:', error);
        // 使用最安全的預設顏色
        gameBackgroundColor = [10, 160, 10];
        console.log('使用預設背景顏色: RGB(10, 160, 10)');
    }
}

// 設置說明頁按鈕
function setupHelpButtons() {
    // 從開始頁進入說明頁
    const helpButton = select('#help-button');
    if (helpButton) {
        helpButton.mousePressed(() => {
            previousScreen = 'START';
            showHelpScreen();
        });
    } else {
        console.warn('找不到說明頁按鈕元素 #help-button');
    }
    
    // 從結束頁進入說明頁
    const helpFromEndButton = select('#help-from-end-button');
    if (helpFromEndButton) {
        helpFromEndButton.mousePressed(() => {
            previousScreen = 'END';
            showHelpScreen();
        });
    } else {
        console.warn('找不到結束頁說明按鈕元素 #help-from-end-button');
    }
    
    // 返回按鈕
    const helpBackButton = select('#help-back-button');
    if (helpBackButton) {
        helpBackButton.mousePressed(hideHelpScreen);
    } else {
        console.warn('找不到說明頁返回按鈕元素 #help-back-button');
    }
}

// 顯示說明頁
function showHelpScreen() {
    console.log(`顯示說明頁，上一頁：${previousScreen}`);
    
    // 隱藏所有其他畫面
    const startScreen = select('#start-screen');
    const overScreen = select('#over');
    if (startScreen) startScreen.style('display', 'none');
    if (overScreen) overScreen.style('display', 'none');
    
    // 生成食物說明內容
    generateFoodHelp();
    
    // 顯示說明頁
    const helpScreen = select('#help-screen');
    if (helpScreen) {
        helpScreen.style('display', 'flex');
    }
}

// 隱藏說明頁，返回上一頁
function hideHelpScreen() {
    console.log(`隱藏說明頁，返回：${previousScreen}`);
    
    const helpScreen = select('#help-screen');
    if (helpScreen) {
        helpScreen.style('display', 'none');
    }
    
    // 根據上一頁顯示對應畫面
    if (previousScreen === 'START') {
        const startScreen = select('#start-screen');
        if (startScreen) {
            startScreen.style('display', 'flex');
        }
    } else if (previousScreen === 'END') {
        const overScreen = select('#over');
        if (overScreen) {
            overScreen.style('display', 'flex');
        }
    }
}

// 生成食物說明內容
function generateFoodHelp() {
    const categoriesContainer = select('#food-categories');
    if (!categoriesContainer || !window.ITEMS) {
        console.warn('無法生成食物說明：容器或 ITEMS 資料不存在');
        return;
    }
    
    // 清空現有內容
    categoriesContainer.html('');
    
    // 食物分類
    const categories = {
        carb: {
            name: '🍚 碳水化合物',
            items: ['飯', '粥', '麵', '包', '餅'],
            description: '提供快速能量，短期加速效果'
        },
        protein: {
            name: '🥚 蛋白質',
            items: ['蛋', '豆', '奶', '魚', '肉'],
            description: '增加飽足感，穩定移動速度'
        },
        caffeine: {
            name: '☕ 咖啡因',
            items: ['茶', '咖', '拿', '可', '抹'],
            description: '先加速後減速，刺激但有後座力'
        },
        fat: {
            name: '🍗 脂肪/高熱量',
            items: ['腿', '培', '腸', '炸'],
            description: '使移動變慢但更有重量感'
        },
        fruit: {
            name: '🍎 水果',
            items: ['蘋', '蕉', '瓜', '莓'],
            description: '平衡營養，提供穩定能量'
        }
    };
    
    // 為每個分類創建 HTML
    Object.entries(categories).forEach(([key, category]) => {
        const categoryDiv = createDiv('');
        categoryDiv.addClass('food-category');
        
        const title = createElement('h4', category.name);
        categoryDiv.child(title);
        
        const itemsDiv = createDiv('');
        itemsDiv.addClass('food-items');
        
        category.items.forEach(char => {
            const itemDiv = createDiv('');
            itemDiv.addClass('food-item');
            
            // 根據食物類型設置顏色
            const foodType = getFoodType(char);
            const foodColor = FOOD_COLORS[foodType];
            itemDiv.style('background-color', foodColor.background);
            itemDiv.style('border', `2px solid ${foodColor.border}`);
            itemDiv.style('color', foodColor.text);
            
            // 添加字符和效果說明
            const charSpan = createSpan(char);
            charSpan.addClass('char');
            itemDiv.child(charSpan);
            
            // 獲取效果資訊
            const effect = ITEMS.effects[char];
            const nutrition = ITEMS.nutrition[char];
            let effectText = '';
            
            if (effect) {
                if (effect.speedMul > 1) {
                    effectText = '加速';
                } else if (effect.speedMul < 1) {
                    effectText = '減速';
                } else {
                    effectText = '穩定';
                }
            }
            
            if (effectText) {
                const effectSpan = createSpan(effectText);
                itemDiv.child(effectSpan);
            }
            
            itemsDiv.child(itemDiv);
        });
        
        categoryDiv.child(itemsDiv);
        
        const descDiv = createDiv(category.description);
        descDiv.addClass('category-desc');
        categoryDiv.child(descDiv);
        
        categoriesContainer.child(categoryDiv);
    });
    
    console.log('食物說明內容已生成');
}