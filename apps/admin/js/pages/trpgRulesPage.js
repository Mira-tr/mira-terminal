import {
    initRulesForm
} from "../features/trpg/rules/rulesForm.js";

import {
    exportPublicRules
} from "../features/trpg/rules/rulesPublicExport.js";

initRulesForm();

document.getElementById("publicExportBtn")
    .addEventListener("click", exportPublicRules);
