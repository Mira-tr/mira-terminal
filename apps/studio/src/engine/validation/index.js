export function validateEngineBoundary({
    source = "",
    previewRendererShared = true,
    registryDriven = true,
    commandDriven = true
} = {}){
    const issues = [];

    if(!previewRendererShared){
        issues.push(`${source}: Preview must use the shared renderer.`);
    }

    if(!registryDriven){
        issues.push(`${source}: Blocks must be registry driven.`);
    }

    if(!commandDriven){
        issues.push(`${source}: Undo and Redo must use commands.`);
    }

    return issues;
}
