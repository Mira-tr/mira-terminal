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
        workspaceContainer: document.getElementById("workspaceRegistryList"),
        moduleContainer: document.getElementById("moduleRegistryList"),
        statusElement: document.getElementById("terminalRegistryStatus")
    });
}
