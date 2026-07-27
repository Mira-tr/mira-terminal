const LOCALIZED_SECTION_TITLES = Object.freeze({
    Projects: "\u4f5c\u54c1",
    Tools: "\u9053\u5177",
    Notes: "\u8a18\u9332",
    Creators: "\u6d3b\u52d5\u8005"
});

export function publicHomeConfigToComponentModel(config){
    const sections = Array.isArray(config?.sections)
        ? config.sections
        : [];

    return {
        schemaVersion: 1,
        id: "home",
        title: "Home",
        source: "public-home",
        components: sections.map(sectionToComponent)
    };
}

export function applyHomeComponentModelToDocument(documentRef, model){
    if(!documentRef || !model?.components){
        return;
    }

    const main = documentRef.querySelector("main.page");
    const entries = [];

    model.components.forEach((component, index) => {
        const section = findHomeSection(documentRef, component.id);

        if(!section){
            return;
        }

        applyComponentToExistingSection(section, component);
        entries.push({
            node: section,
            order: Number(component.props?.order),
            sourceIndex: index
        });
    });

    if(main){
        const staticEntries = Array.from(main.querySelectorAll("[data-home-static-order]"))
        .map((node, index) => ({
            node,
            order: Number(node.getAttribute("data-home-static-order")),
            sourceIndex: index + entries.length
        }))
        .filter(entry => Number.isFinite(entry.order));

        [...entries, ...staticEntries]
        .filter(entry => Number.isFinite(entry.order))
        .sort((a, b) => a.order - b.order || a.sourceIndex - b.sourceIndex)
        .forEach(entry => main.appendChild(entry.node));
    }
}

export function renderComponentModelPreview(documentRef, rootElement, model){
    if(!documentRef || !rootElement){
        return;
    }

    const surface = documentRef.createElement("div");
    surface.className = "studio-preview-surface";

    const theme = model?.theme || {};
    surface.style.setProperty("--preview-primary", theme.primary || "#19584d");
    surface.style.setProperty("--preview-secondary", theme.secondary || "#d8b35a");
    surface.style.setProperty("--preview-radius", `${Number(theme.radius || 8)}px`);
    surface.style.setProperty("--preview-shadow", `0 ${Number(theme.shadow || 2)}px ${Number(theme.shadow || 2) * 6}px rgba(0,0,0,.16)`);
    surface.style.setProperty("--preview-spacing", `${Number(theme.spacing || 16)}px`);
    surface.style.fontFamily = theme.typography || "system-ui, sans-serif";

    const assets = Array.isArray(model?.assets) ? model.assets : [];
    const bgm = createBgmControl(documentRef, model?.settings?.bgm, assets);
    if(bgm){
        surface.appendChild(bgm);
    }

    (model?.components || []).forEach(component => {
        surface.appendChild(createPreviewComponent(documentRef, component, assets, model?.selectedBlockId || ""));
    });

    rootElement.replaceChildren(surface);
}

function sectionToComponent(section){
    return {
        id: section.id,
        type: toComponentType(section),
        props: {
            title: localizeSectionTitle(section.title),
            description: section.description,
            enabled: section.enabled,
            hidden: section.enabled === false,
            order: section.order,
            layout: section.layout,
            displayMode: section.enabled === false ? "Hidden" : "Text"
        },
        children: [
            createFieldNode(section.id, "title", "Title"),
            createFieldNode(section.id, "description", "Description")
        ]
    };
}

function localizeSectionTitle(value){
    return LOCALIZED_SECTION_TITLES[value] || value;
}

function applyComponentToExistingSection(section, component){
    const props = component.props || {};
    const hidden = props.hidden || props.enabled === false || props.displayMode === "Hidden";
    section.hidden = Boolean(hidden);

    if(hidden){
        return;
    }

    if(component.id === "hero"){
        setText(section.querySelector("h1"), props.title);
        setOptionalText(section.querySelector(".section-description"), props.description);
        return;
    }

    setText(section.querySelector("[data-home-section-title]"), props.title);
    setOptionalText(section.querySelector("[data-home-section-description]"), props.description);
}

function createPreviewComponent(documentRef, component, assets = [], selectedBlockId = ""){
    const props = component.props || {};
    const article = documentRef.createElement("article");
    article.className = "studio-preview-component";
    article.dataset.component = component.id;
    if(component.id === selectedBlockId){
        article.classList.add("is-selected");
    }

    if(props.hidden || props.displayMode === "Hidden"){
        article.classList.add("is-hidden-preview");
        article.textContent = `${component.type} hidden`;
        return article;
    }

    const title = documentRef.createElement("h4");
    title.textContent = props.title || props.label || component.type;
    const description = documentRef.createElement("p");
    description.textContent = props.description || "Component preview";

    const media = createAssetPreview(documentRef, props, assets);

    if(media){
        article.appendChild(media);
    }

    article.append(title, description);

    const action = createPreviewAction(documentRef, props);
    if(action){
        article.appendChild(action);
    }

    return article;
}

function createPreviewAction(documentRef, props){
    if(props.displayMode === "Button"){
        const button = documentRef.createElement("span");
        button.className = "studio-preview-button";
        button.textContent = props.label || "Button";
        if(props.link){
            button.dataset.href = props.link;
        }
        return button;
    }

    if(props.displayMode === "Link"){
        const link = documentRef.createElement("span");
        link.className = "studio-preview-link-token";
        link.textContent = props.label || props.link || "Link";
        if(props.link){
            link.dataset.href = props.link;
        }
        return link;
    }

    if(props.displayMode === "Text"){
        const text = documentRef.createElement("span");
        text.className = "studio-preview-text-token";
        text.textContent = props.label || props.link || "";
        return text;
    }

    return null;
}

function createBgmControl(documentRef, bgm, assets){
    if(!bgm?.enabled){
        return null;
    }

    const asset = assets.find(item => item.id === bgm.assetId);
    const control = documentRef.createElement("section");
    control.className = "studio-preview-bgm";
    const title = documentRef.createElement("strong");
    title.textContent = asset ? `BGM: ${asset.name}` : "BGM: 素材未設定";
    const detail = documentRef.createElement("small");
    detail.textContent = `音量 ${Math.round(Number(bgm.volume ?? 0.6) * 100)}% / ${bgm.loop === false ? "1回再生" : "ループ"}`;
    control.append(title);

    if(asset?.src && bgm.showControl !== false){
        const audio = documentRef.createElement("audio");
        audio.controls = true;
        audio.src = asset.src;
        audio.loop = bgm.loop !== false;
        audio.volume = clampAudioVolume(bgm.volume);
        control.append(audio);
    }else{
        const button = documentRef.createElement("span");
        button.className = "studio-preview-text-token";
        button.textContent = bgm.showControl === false ? "ページBGM" : "再生ボタンを表示";
        control.append(button);
    }

    control.append(detail);
    return control;
}

function createAssetPreview(documentRef, props, assets){
    const assetId = props.imageAssetId || props.background || "";
    const asset = resolveAsset(assets, assetId);

    if(asset && (asset.type === "image" || asset.type === "svg")){
        const figure = documentRef.createElement("figure");
        figure.className = "studio-preview-asset";
        const media = asset.src
            ? documentRef.createElement("img")
            : documentRef.createElement("div");
        if(media.tagName === "IMG"){
            media.src = asset.src;
            media.alt = asset.alt || props.title || asset.name;
        }else{
            media.textContent = asset.name;
        }
        const caption = documentRef.createElement("figcaption");
        caption.textContent = props.title || asset.alt || "画像素材";
        figure.append(media, caption);
        return figure;
    }

    if(props.audioAssetId){
        const audio = resolveAsset(assets, props.audioAssetId);
        const panel = documentRef.createElement("div");
        panel.className = "studio-preview-asset is-audio";
        panel.textContent = audio ? `BGM: ${audio.name}` : "BGM素材未設定";
        return panel;
    }

    return null;
}

function resolveAsset(assets, assetId){
    return assets.find(asset => asset.id === assetId) || null;
}

function clampAudioVolume(value){
    const number = Number(value);
    if(!Number.isFinite(number)){
        return 0.6;
    }

    return Math.max(0, Math.min(1, number));
}

function findHomeSection(documentRef, id){
    return documentRef.querySelector(`[data-home-section="${id}"]`);
}

function toComponentType(section){
    if(section.id === "hero"){
        return "Hero";
    }

    if(section.id === "featured-projects"){
        return "Featured";
    }

    return section.type || section.id;
}

function createFieldNode(componentId, field, label){
    return {
        id: `${componentId}.${field}`,
        type: "Field",
        props: {
            field,
            label
        },
        children: []
    };
}

function setText(element, value){
    if(!element || value === undefined || value === null){
        return;
    }

    element.textContent = String(value);
}

function setOptionalText(element, value){
    if(value === ""){
        return;
    }

    setText(element, value);
}
