import {
    getElement
} from "../../../utils.js";

const STORAGE_OPTIONS = [
    {
        value: "booth",
        label: "BOOTH"
    },
    {
        value: "web",
        label: "Webサービス"
    },
    {
        value: "local",
        label: "PC"
    },
    {
        value: "cloud",
        label: "クラウド"
    },
    {
        value: "physical",
        label: "紙・書籍"
    },
    {
        value: "other",
        label: "その他"
    }
];

const STORAGE_LABELS = new Map(
    STORAGE_OPTIONS.map(option=>[
        option.value,
        option.label
    ])
);

export function initScenarioStorage(containerId){
    const container = getElement(containerId);
    const fragment = document.createDocumentFragment();

    STORAGE_OPTIONS.forEach(option=>{
        fragment.appendChild(
            createStorageOption(option)
        );
    });

    container.replaceChildren(fragment);
}

export function getSelectedStorageLocations(containerId){
    const container = getElement(containerId);

    return normalizeStorageLocations(
        [
            ...container.querySelectorAll(
                'input[type="checkbox"]:checked'
            )
        ]
        .map(input=>input.value)
    );
}

export function setSelectedStorageLocations(containerId, values){
    const selected = new Set(
        normalizeStorageLocations(values)
    );
    const container = getElement(containerId);

    container.querySelectorAll('input[type="checkbox"]')
    .forEach(input=>{
        input.checked = selected.has(input.value);
    });
}

export function normalizeStorageLocations(value){
    const values = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(",")
            : [];

    return [
        ...new Set(
            values
            .map(item=>String(item ?? "").trim())
            .filter(item=>STORAGE_LABELS.has(item))
        )
    ];
}

export function getStorageLocationLabels(value){
    return normalizeStorageLocations(value)
    .map(location=>STORAGE_LABELS.get(location));
}

export function getStorageLocationSummary(value){
    return getStorageLocationLabels(value)
    .join("・");
}

function createStorageOption(option){
    const label = document.createElement("label");
    label.className = "storage-location-option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = option.value;

    const text = document.createElement("span");
    text.textContent = option.label;

    label.append(input, text);
    return label;
}

