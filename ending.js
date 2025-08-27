window.Ending = (() => {
    const lines = {
        highCarb: "能量來得快，也走得快，可能很快想加點心。",
        highProtein: "紮實的一口，讓飽足多撐一會兒。",
        highCaffeine: "精神滿滿，也稍微有點躁動。",
        highFat: "你感覺有點沉重，可能需要休息一下。",
        highFiber: "你感覺清爽，準備好迎接新的一天。",
        highDrink: "你喝了很多，可能需要稍微放慢腳步。",
        highSugar: "糖分攝取過多，注意血糖波動。",
        highCalorie: "熱量攝取過多，感覺有點疲憊。",
        lowCalorie: "攝取量不足，可能會感到疲倦。",
        balanced: "你的早餐挺均衡，能量與專注一起上線。"
    };
    function analyze(stat) {
        const c = stat.carb || 0, p = stat.protein || 0, caf = stat.caffeine || 0;
        const f = stat.fat || 0, fiber = stat.fiber || 0, sugar = stat.sugar || 0;
        const totalCalories = c + p + f + sugar;
        if (caf >= 2) return "highCaffeine";
        if (f > 10) return "highFat";
        if (fiber > 10) return "highFiber";
        if (c > p) return "highCarb";
        if (p > c) return "highProtein";
        if (sugar > 15) return "highSugar";
        if (totalCalories > 50) return "highCalorie";
        if (totalCalories < 20) return "lowCalorie";
        return "balanced";
    }
    function line(tag) { return lines[tag] || lines.balanced; }
    return { analyze, line };
})();
