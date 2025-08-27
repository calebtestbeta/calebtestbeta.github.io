// Breakfast Edition v1.0
window.ITEMS = {
    pool: [
        // 碳水
        "飯", "粥", "麵", "包", "餅",
        // 蛋白質
        "蛋", "豆", "奶", "魚", "肉",
        // 脂肪 / 高熱量
        "腿", "培", "腸", "炸",
        // 水果
        "蘋", "蕉", "瓜", "莓",
        // 飲品  
        "茶", "咖", "可", "抹", "拿"
    ],

    effects: {
        // ===== 碳水（短期加速，血糖快起快落）=====
        "飯": { kind: "carb", speedMul: 1.10, durationMs: 1500 },
        "粥": { kind: "carb", speedMul: 1.08, durationMs: 1500 },
        "麵": { kind: "carb", speedMul: 1.12, durationMs: 1500 },
        "包": { kind: "carb", speedMul: 1.08, durationMs: 1500 },
        "餅": { kind: "carb", speedMul: 1.09, durationMs: 1500 },

        // ===== 蛋白質（速度穩定，飽足↑）=====
        "蛋": { kind: "protein", speedMul: 0.92, durationMs: 2000 },
        "豆": { kind: "protein", speedMul: 0.95, durationMs: 2000 },
        "奶": { kind: "protein", speedMul: 0.95, durationMs: 2000 },
        "魚": { kind: "protein", speedMul: 0.90, durationMs: 2000 },
        "肉": { kind: "protein", speedMul: 0.90, durationMs: 2000 },

        // ===== 脂肪／高熱量（速度沉重、慣性↑）=====
        "腿": { kind: "fat", speedMul: 0.85, durationMs: 2000, inertia: true },
        "培": { kind: "fat", speedMul: 0.85, durationMs: 2000, inertia: true },
        "腸": { kind: "fat", speedMul: 0.87, durationMs: 2000, inertia: true },
        "炸": { kind: "fat", speedMul: 0.80, durationMs: 1500, inertia: true, scoreBonus: 1.2 },

        // ===== 水果／纖維（提亮、血糖穩定）=====
        "蘋": { kind: "fruit", speedMul: 1.0, durationMs: 2000, brighten: 0.1 },
        "蕉": { kind: "fruit", speedMul: 1.0, durationMs: 2000, brighten: 0.1 },
        "瓜": { kind: "fruit", speedMul: 1.0, durationMs: 2000, brighten: 0.1 },
        "莓": { kind: "fruit", speedMul: 1.0, durationMs: 2000, brighten: 0.1 },

        // ===== 飲品 =====
        "茶": { kind: "drink", speedMul: 1.05, durationMs: 1500 },
        "咖": {
            kind: "caff", speedMul: 1.25, durationMs: 1000,
            after: { speedMul: 0.98, durationMs: 5000 }
        },
        
        // ===== 新增咖啡因飲品 =====
        "拿": {
            kind: "caff", speedMul: 1.10, durationMs: 2000,
            after: { speedMul: 0.92, durationMs: 3500 }
        },
        "可": {
            kind: "caff", speedMul: 1.15, durationMs: 1200,
            after: { speedMul: 0.95, durationMs: 3000 }
        },
        "抹": {
            kind: "caff", speedMul: 1.20, durationMs: 1800,
            after: { speedMul: 0.90, durationMs: 4000 }
        }
    },

    nutrition: {
        // 碳水
        "飯": { carb: 10 },
        "粥": { carb: 8 },
        "麵": { carb: 12 },
        "包": { carb: 10 },
        "餅": { carb: 9 },

        // 蛋白質
        "蛋": { protein: 15 },
        "豆": { protein: 12 },
        "奶": { protein: 10 },
        "魚": { protein: 15 },
        "肉": { protein: 15 },

        // 脂肪
        "腿": { fat: 12, protein: 8 },
        "培": { fat: 15, protein: 5 },
        "腸": { fat: 15, protein: 5 },
        "炸": { fat: 20 },

        // 水果
        "蘋": { carb: 5, fiber: 8 },
        "蕉": { carb: 6, fiber: 7 },
        "瓜": { carb: 4, fiber: 6 },
        "莓": { carb: 4, fiber: 8 },

        // 飲品
        "茶": { caffeine: 0.3, carb: 0 },     // 純茶
        "咖": { caffeine: 1, carb: 0 },       // 美式咖啡
        "拿": { caffeine: 0.8, carb: 6, fat: 2 }, // 拿鐵
        
        // 其他咖啡因飲品
        "可": { caffeine: 0.8, carb: 3 },     // 可樂類飲品
        "抹": { caffeine: 0.6, carb: 1 }      // 抹茶類飲品
    }
};
