import {
    APP_NAME
} from "../../appIdentity.js";

import {
    getTools
} from "./toolStore.js";

import {
    showToast
} from "../common/toastService.js";

import {
    recordPublicExport
} from "../common/operationMeta.js";

import {
    getCreatorCollection,
    resolveCreatorIds,
    validateCreatorIds
} from "../creators/creatorCore.js";

const PUBLIC_EXPORT_FILENAME = "public-tools.json";
const PUBLIC_EXPORT_DESTINATION = "apps/web/tools/data/public-tools.json";

export function createPublicToolsPayload(value = getTools()){
    const creators = getCreatorCollection();

    return {
        app: APP_NAME,
        module: "tools",
        exportType: "public-tools",
        exportVersion: "1.0.0",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        tools: value.tools
            .filter(tool => tool.status === "public")
            .map(({
                id,
                name,
                summary,
                description,
                category,
                path,
                url,
                tags,
                maintainerCreatorIds,
                order
            }) => {
                const resolvedMaintainers = resolveCreatorIds(maintainerCreatorIds, creators);
                validateCreatorIds(resolvedMaintainers, creators, `Tool ${id} maintainer`);

                return {
                    id,
                    name,
                    summary,
                    description,
                    category,
                    path,
                    url,
                    tags,
                    maintainerCreatorIds: resolvedMaintainers,
                    order
                };
            })
            .sort((a, b) => a.order - b.order)
    };
}

export function exportPublicTools(){
    download(createPublicToolsPayload(), PUBLIC_EXPORT_FILENAME);
    recordPublicExport("tools");
    showToast("Public JSONを出力しました", "success");
}

function download(data, filename){
    const url = URL.createObjectURL(
        new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json" }
        )
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
