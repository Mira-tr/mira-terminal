import {
    renderTerminalShell
} from "../features/terminal/terminalShell.js";

import {
    initToastService
} from "../features/common/toastService.js";

initToastService();
initTerminalPage();

function initTerminalPage(){
    renderTerminalShell({
        breadcrumbContainer: document.getElementById("terminalBreadcrumb"),
        workspaceOverviewContainer: document.getElementById("workspaceOverviewList"),
        workspaceDetailContainer: document.getElementById("workspaceDetailList"),
        statusElement: document.getElementById("terminalRegistryStatus")
    });
}
