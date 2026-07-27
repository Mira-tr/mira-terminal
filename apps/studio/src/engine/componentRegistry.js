export const COMPONENT_DISPLAY_MODES = Object.freeze(["Button", "Link", "Text", "Hidden"]);
export const LINK_TARGET_TYPES = Object.freeze(["内部ページ", "外部URL", "メール", "素材", "なし"]);

export const COMPONENT_REGISTRY = Object.freeze([
    createDefinition("header", "Header", "layout", [
        createField("title", "サイト名", "text", "RELMUA", "property"),
        createField("description", "メニュー", "textarea", "Home\nProjects\nTools\nNotes\nCreators\nAbout\nContact", "property"),
        createField("displayMode", "表示形式", "select", "Text", "behavior", COMPONENT_DISPLAY_MODES),
        createField("linkType", "リンクの種類", "select", "内部ページ", "behavior", LINK_TARGET_TYPES),
        createField("link", "リンク先", "url", "/", "behavior"),
        createField("spacing", "Spacing", "range", "16", "style"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ], ["Button"]),
    createDefinition("hero", "Hero", "layout", [
        createField("title", "タイトル", "text", "RELMUA", "property"),
        createField("description", "説明", "textarea", "A visual web builder for the public site.", "property"),
        createField("imageAssetId", "画像", "text", "", "property"),
        createField("label", "ボタンの文字", "text", "Start", "property"),
        createField("displayMode", "表示形式", "select", "Button", "behavior", COMPONENT_DISPLAY_MODES),
        createField("linkType", "リンクの種類", "select", "内部ページ", "behavior", LINK_TARGET_TYPES),
        createField("link", "リンク先", "url", "/projects/", "behavior"),
        createField("newTab", "新しいタブ", "checkbox", false, "behavior"),
        createField("audioAssetId", "BGM", "text", "", "behavior"),
        createField("hidden", "非表示", "checkbox", false, "behavior"),
        createField("background", "背景", "text", "", "style")
    ], ["Title", "Description", "Button", "Background"]),
    createDefinition("featured", "Featured", "collection", [
        createField("title", "タイトル", "text", "Featured", "property"),
        createField("description", "説明", "textarea", "Selected work and updates.", "property"),
        createField("label", "リンクの文字", "text", "View all", "property"),
        createField("displayMode", "表示形式", "select", "Link", "behavior", COMPONENT_DISPLAY_MODES),
        createField("linkType", "リンクの種類", "select", "内部ページ", "behavior", LINK_TARGET_TYPES),
        createField("link", "リンク先", "url", "/projects/", "behavior"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ], ["Card"]),
    createDefinition("gallery", "Gallery", "media", [
        createField("title", "タイトル", "text", "Gallery", "property"),
        createField("description", "説明", "textarea", "", "property"),
        createField("imageAssetId", "画像", "text", "", "property"),
        createField("hidden", "非表示", "checkbox", false, "behavior"),
        createField("radius", "角丸", "range", "8", "style")
    ], ["Image"]),
    createDefinition("card-grid", "Card Grid", "collection", [
        createField("title", "タイトル", "text", "Cards", "property"),
        createField("description", "説明", "textarea", "", "property"),
        createField("layout", "並べ方", "select", "Grid", "style", ["Grid", "List"]),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ], ["Card"]),
    createDefinition("card", "Card", "content", [
        createField("title", "タイトル", "text", "Card Title", "property"),
        createField("description", "説明", "textarea", "Card description.", "property"),
        createField("linkType", "リンクの種類", "select", "内部ページ", "behavior", LINK_TARGET_TYPES),
        createField("link", "リンク先", "url", "", "behavior"),
        createField("newTab", "新しいタブ", "checkbox", false, "behavior"),
        createField("radius", "角丸", "range", "8", "style"),
        createField("shadow", "影", "range", "2", "style"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("cta", "CTA", "layout", [
        createField("title", "タイトル", "text", "Contact", "property"),
        createField("description", "説明", "textarea", "A clear next action for visitors.", "property"),
        createField("label", "ボタンの文字", "text", "Contact", "property"),
        createField("displayMode", "表示形式", "select", "Button", "behavior", COMPONENT_DISPLAY_MODES),
        createField("linkType", "リンクの種類", "select", "内部ページ", "behavior", LINK_TARGET_TYPES),
        createField("link", "リンク先", "url", "/contact/", "behavior"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ], ["Button"]),
    createDefinition("footer", "Footer", "layout", [
        createField("title", "タイトル", "text", "RELMUA", "property"),
        createField("description", "説明", "textarea", "Footer message and navigation.", "property"),
        createField("label", "リンクの文字", "text", "Back to top", "property"),
        createField("displayMode", "表示形式", "select", "Text", "behavior", COMPONENT_DISPLAY_MODES),
        createField("linkType", "リンクの種類", "select", "内部ページ", "behavior", LINK_TARGET_TYPES),
        createField("link", "リンク先", "url", "/", "behavior"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ], ["Button"]),
    createDefinition("button", "Button", "action", [
        createField("label", "文字", "text", "Button", "property"),
        createField("displayMode", "表示形式", "select", "Button", "behavior", COMPONENT_DISPLAY_MODES),
        createField("linkType", "リンクの種類", "select", "内部ページ", "behavior", LINK_TARGET_TYPES),
        createField("link", "リンク先", "url", "/", "behavior"),
        createField("newTab", "新しいタブ", "checkbox", false, "behavior"),
        createField("variant", "種類", "select", "Primary", "style", ["Primary", "Secondary"]),
        createField("radius", "角丸", "range", "8", "style"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("image", "Image", "media", [
        createField("title", "画像の説明", "text", "", "property"),
        createField("imageAssetId", "画像", "text", "", "property"),
        createField("linkType", "リンクの種類", "select", "なし", "behavior", LINK_TARGET_TYPES),
        createField("link", "リンク先", "url", "", "behavior"),
        createField("radius", "角丸", "range", "8", "style"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("audio", "Audio", "media", [
        createField("title", "タイトル", "text", "BGM", "property"),
        createField("audioAssetId", "音声", "text", "", "property"),
        createField("loop", "ループ", "checkbox", true, "behavior"),
        createField("volume", "音量", "range", "0.6", "behavior"),
        createField("showControl", "再生ボタン", "checkbox", true, "behavior"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("divider", "Divider", "layout", [
        createField("title", "名前", "text", "", "property"),
        createField("spacing", "余白", "range", "16", "style"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("markdown", "Markdown", "content", [
        createField("title", "タイトル", "text", "Markdown", "property"),
        createField("description", "本文", "textarea", "", "property"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("quote", "Quote", "content", [
        createField("description", "引用文", "textarea", "", "property"),
        createField("title", "引用元", "text", "", "property"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("timeline", "Timeline", "content", [
        createField("title", "タイトル", "text", "Timeline", "property"),
        createField("description", "項目", "textarea", "", "property"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("accordion", "Accordion", "content", [
        createField("title", "タイトル", "text", "Accordion", "property"),
        createField("description", "中身", "textarea", "", "property"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("video", "Video", "media", [
        createField("title", "タイトル", "text", "Video", "property"),
        createField("linkType", "リンクの種類", "select", "外部URL", "behavior", LINK_TARGET_TYPES),
        createField("link", "Video URL", "url", "", "behavior"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ]),
    createDefinition("map", "Map", "embed", [
        createField("title", "場所", "text", "Map", "property"),
        createField("linkType", "リンクの種類", "select", "外部URL", "behavior", LINK_TARGET_TYPES),
        createField("link", "Map URL", "url", "", "behavior"),
        createField("hidden", "非表示", "checkbox", false, "behavior")
    ])
]);

export function getComponentDefinition(type){
    return COMPONENT_REGISTRY.find(definition => definition.type === type) || null;
}

export function getStarterBlockTypes(pageId){
    if(pageId === "home"){
        return ["hero", "gallery", "card-grid", "cta", "footer"];
    }

    return ["hero", "card-grid", "cta", "footer"];
}

export function createBlockFromRegistry(type, index = 0, overrides = {}){
    const definition = getComponentDefinition(type);
    if(!definition){
        throw new Error(`Unknown block type: ${type}`);
    }

    const id = overrides.id || `${definition.type}-${index + 1}`;
    const props = {
        ...Object.fromEntries(definition.fields.map(field => [field.id, field.defaultValue])),
        ...(overrides.props || {})
    };

    return {
        id,
        type: definition.type,
        label: definition.label,
        order: overrides.order ?? (index + 1) * 10,
        components: [
            {
                id: `${id}:main`,
                type: definition.label,
                props,
                properties: definition.fields.map(field => ({
                    id: field.id,
                    label: field.label,
                    group: field.group,
                    binding: createFieldBinding(id, field.id)
                }))
            },
            ...definition.children.map(child => ({
                id: `${id}:${toComponentId(child)}`,
                type: child,
                props: {},
                properties: []
            }))
        ]
    };
}

export function createFieldBinding(blockId, fieldId){
    return Object.freeze({
        beginner: toBeginnerLabel(blockId, fieldId),
        advanced: `Page -> Block -> ${blockId} -> Component -> main -> Property -> ${fieldId}`,
        outputPath: `${blockId}.components.main.props.${fieldId}`
    });
}

function createDefinition(type, label, category, fields, children = []){
    return Object.freeze({
        type,
        label,
        category,
        fields: Object.freeze(fields),
        children: Object.freeze(children)
    });
}

function createField(id, label, type, defaultValue, group, options = []){
    return Object.freeze({
        id,
        label,
        type,
        defaultValue,
        group,
        options: Object.freeze(options)
    });
}

function toBeginnerLabel(blockId, fieldId){
    if(blockId.startsWith("hero") && fieldId === "title"){
        return "Home title";
    }

    if(blockId.startsWith("hero") && fieldId === "description"){
        return "Home description";
    }

    return `${blockId} ${fieldId}`;
}

function toComponentId(value){
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
