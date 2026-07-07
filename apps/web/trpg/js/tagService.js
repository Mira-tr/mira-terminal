export function getTagsByUsageCount(scenarios){
    const counts = new Map();

    scenarios.forEach(scenario=>{
        const tags = Array.isArray(scenario.tags)
            ? scenario.tags
            : [];

        tags.forEach(tag=>{
            const name = String(tag ?? "").trim();

            if(!name){
                return;
            }

            counts.set(
                name,
                (counts.get(name) || 0) + 1
            );
        });
    });

    return [...counts.entries()]
    .sort((a, b)=>{
        const countDiff = b[1] - a[1];

        if(countDiff !== 0){
            return countDiff;
        }

        return a[0].localeCompare(b[0], "ja");
    })
    .map(([tag])=>tag);
}

export function getUniqueSystems(scenarios){
    return [
        ...new Set(
            scenarios
            .map(scenario=>String(scenario.system ?? "").trim())
            .filter(Boolean)
        )
    ].sort((a, b)=>a.localeCompare(b, "ja"));
}