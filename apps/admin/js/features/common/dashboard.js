export function updateDashboard(scenarios = []){
    const list = Array.isArray(scenarios) ? scenarios : [];

    document.getElementById("totalCount").textContent =
        list.length;

    document.getElementById("draftCount").textContent =
        list.filter(item=>item.status === "draft").length;

    document.getElementById("publicCount").textContent =
        list.filter(item=>item.status === "public").length;
}