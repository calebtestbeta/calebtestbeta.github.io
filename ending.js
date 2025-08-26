window.Ending = (() => {
    const lines = {
        highCarb: "能量來得快，也走得快，可能很快想加點心。",
        highProtein: "紮實的一口，讓飽足多撐一會兒。",
        highCaffeine: "精神滿滿，也稍微有點躁動。",
        balanced: "你的早餐挺均衡，能量與專注一起上線。"
    };
    function analyze(stat) {
        const c = stat.carb || 0, p = stat.protein || 0, caf = stat.caffeine || 0;
        if (caf >= 2) return "highCaffeine";
        if (p > c) return "highProtein";
        if (c > p) return "highCarb";
        return "balanced";
    }
    function line(tag) { return lines[tag] || lines.balanced; }
    return { analyze, line };
})();