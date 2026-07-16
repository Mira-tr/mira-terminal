import {
    getCollectionStorageMapping
} from "../../collections/collectionRegistry.js";

import {
    createCollectionContext
} from "../../collections/collectionContext.js";

import {
    createBrowserLocalStorageRepository
} from "./browserLocalStorageRepository.js";

import {
    createScenarioEditorController
} from "./scenarioEditorController.js";

import {
    createScenarioExportAdapter
} from "./scenarioExportAdapter.js";

import {
    createScenarioPreviewAdapter
} from "./scenarioPreviewAdapter.js";

import {
    validateScenarioDraft
} from "./scenarioDraftValidation.js";

const TRPG_COLLECTION_TYPE = "trpg";
const TRPG_OWNER_ID = "creator-chikage";

export function createDefaultScenarioEditorController(context = createCollectionContext()){
    const mapping = getCollectionStorageMapping(
        context.collectionTypeId || TRPG_COLLECTION_TYPE,
        context.ownerCreatorId || TRPG_OWNER_ID
    ) || getTrpgStorageMapping();
    const repository = createBrowserLocalStorageRepository({
        ownerCreatorId: mapping.ownerCreatorId
    });
    const previewAdapter = createScenarioPreviewAdapter({
        repository,
        previewPath: mapping.previewPath
    });
    const exportAdapter = createScenarioExportAdapter({
        repository
    });

    return createScenarioEditorController({
        context: {
            ...context,
            ownerCreatorId: mapping.ownerCreatorId
        },
        repository,
        previewAdapter,
        exportAdapter
    });
}

const defaultController = createDefaultScenarioEditorController();

export function loadDraft(controller = defaultController){
    return controller.loadDrafts();
}

export function saveDraft(data, options = {}, controller = defaultController){
    return controller.saveDraft(data, options);
}

export function validateDraft(data){
    return validateScenarioDraft(data, {
        ownerCreatorId: TRPG_OWNER_ID
    });
}

export function exportPublicData(options = {}, controller = defaultController){
    return controller.exportPublicData(options);
}

export function previewDraft(data = null, controller = defaultController){
    return controller.previewDraft(data);
}

export function getTrpgStorageMapping(){
    return getCollectionStorageMapping(TRPG_COLLECTION_TYPE, TRPG_OWNER_ID);
}
