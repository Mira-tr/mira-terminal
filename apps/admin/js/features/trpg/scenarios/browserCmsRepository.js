import {
    createScenarioDraftRepository,
    assertScenarioDraftRepository
} from "./scenarioDraftRepository.js";

import {
    validateScenarioDraft
} from "./scenarioDraftValidation.js";

import {
    addScenarioCanonical,
    getOwnerScenarios,
    hydrateScenariosFromCms,
    updateScenarioCanonical
} from "./scenarioCmsStore.js";

export function createBrowserCmsRepository({
    ownerCreatorId = ""
} = {}){
    const localRepository = createScenarioDraftRepository({
        listDrafts: () => getOwnerScenarios(ownerCreatorId),
        createDraft: data => addScenarioCanonical(data, ownerCreatorId),
        updateDraft: data => updateScenarioCanonical(data, ownerCreatorId),
        validateDraft(data){
            return validateScenarioDraft(data, {
                ownerCreatorId
            });
        }
    });

    const repository = {
        ...localRepository,
        kind: "ScenarioCmsRepository",
        hydrate(){
            return hydrateScenariosFromCms(ownerCreatorId);
        }
    };

    assertScenarioDraftRepository(repository);
    return repository;
}
