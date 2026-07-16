import {
    getScenarios,
    addScenario,
    updateScenario
} from "./scenarioStore.js";

import {
    createScenarioDraftRepository
} from "./scenarioDraftRepository.js";

import {
    validateScenarioDraft
} from "./scenarioDraftValidation.js";

export function createBrowserLocalStorageRepository({
    ownerCreatorId = ""
} = {}){
    return createScenarioDraftRepository({
        listDrafts: getScenarios,
        createDraft: addScenario,
        updateDraft: updateScenario,
        validateDraft(data){
            return validateScenarioDraft(data, {
                ownerCreatorId
            });
        }
    });
}
