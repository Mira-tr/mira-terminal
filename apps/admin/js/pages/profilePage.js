import {
    initProfileForm
} from "../features/profile/profileForm.js";

import {
    exportPublicProfile
} from "../features/profile/profilePublicExport.js";

initProfileForm();

document.getElementById("profilePublicExportBtn")
    .addEventListener("click", exportPublicProfile);
