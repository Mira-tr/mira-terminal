import {
    hydrateBrandSiteFromCms,
    loadBrandSiteConfig,
    saveBrandSiteCanonical
} from "../features/brand/brandSiteStore.js";
import {
    BRAND_NAVIGATION_KEYS
} from "../features/brand/brandSiteConfig.js";

const NAVIGATION_LABELS = Object.freeze({
    home: "Home",
    projects: "Projects",
    tools: "Tools",
    notes: "Notes",
    creators: "Creators",
    about: "About",
    contact: "Contact"
});

const ABOUT_FIELDS = Object.freeze([
    group("ページ見出し", [
        text("about.heading.label", "ラベル"),
        textarea("about.heading.title", "タイトル", 2),
        textarea("about.heading.body", "説明", 3)
    ]),
    group("RELMUAとは", [
        text("about.story.label", "ラベル"),
        textarea("about.story.title", "タイトル", 2),
        textarea("about.story.body", "本文", 3)
    ]),
    group("公開領域", [
        text("about.areas.label", "ラベル"),
        text("about.areas.title", "タイトル"),
        textarea("about.areas.body", "説明", 2),
        text("about.areas.items.0.title", "入口1 タイトル"),
        textarea("about.areas.items.0.body", "入口1 説明", 2),
        text("about.areas.items.1.title", "入口2 タイトル"),
        textarea("about.areas.items.1.body", "入口2 説明", 2),
        text("about.areas.items.2.title", "入口3 タイトル"),
        textarea("about.areas.items.2.body", "入口3 説明", 2)
    ]),
    group("活動者との関係", [
        text("about.relation.label", "ラベル"),
        text("about.relation.title", "タイトル"),
        textarea("about.relation.body", "本文", 3),
        textarea("about.relation.secondary", "補足", 2)
    ]),
    group("Why", [
        text("about.philosophy.label", "ラベル"),
        textarea("about.philosophy.title", "タイトル", 2),
        textarea("about.philosophy.body", "本文", 3)
    ])
]);

const CONTACT_FIELDS = Object.freeze([
    group("ページ見出し", [
        text("contact.heading.label", "ラベル"),
        textarea("contact.heading.title", "タイトル", 2),
        textarea("contact.heading.body", "説明", 3)
    ]),
    group("連絡方針", [
        text("contact.guide.label", "ラベル"),
        textarea("contact.guide.title", "タイトル", 2),
        textarea("contact.guide.body", "本文", 3)
    ]),
    group("連絡先の選び方", [
        text("contact.routes.label", "ラベル"),
        text("contact.routes.title", "タイトル"),
        textarea("contact.routes.body", "説明", 2),
        text("contact.routes.brand.label", "Brand ラベル"),
        text("contact.routes.brand.title", "Brand タイトル"),
        textarea("contact.routes.brand.body", "Brand 説明", 3),
        text("contact.routes.creator.label", "Creator ラベル"),
        text("contact.routes.creator.title", "Creator タイトル"),
        textarea("contact.routes.creator.body", "Creator 説明", 3)
    ]),
    group("受付状況 / FAQ", [
        text("contact.faq.label", "ラベル"),
        text("contact.faq.title", "タイトル"),
        text("contact.faq.items.0.title", "FAQ 1 質問"),
        textarea("contact.faq.items.0.body", "FAQ 1 回答", 2),
        text("contact.faq.items.1.title", "FAQ 2 質問"),
        textarea("contact.faq.items.1.body", "FAQ 2 回答", 2),
        text("contact.faq.items.2.title", "FAQ 3 質問"),
        textarea("contact.faq.items.2.body", "FAQ 3 回答", 2)
    ])
]);

let config = null;

try{
    config = await hydrateBrandSiteFromCms();
}catch(error){
    console.warn("[brand-site] Settings hydrate fell back to local cache", error);
    config = loadBrandSiteConfig();
}

initBrandSettings();

function initBrandSettings(){
    const navigationMount = document.getElementById("brandNavigationEditor");
    const aboutMount = document.getElementById("brandAboutEditor");
    const contactMount = document.getElementById("brandContactEditor");

    if(navigationMount){
        navigationMount.replaceChildren(createNavigationForm());
    }
    if(aboutMount){
        aboutMount.replaceChildren(createEditorForm("Aboutを保存", ABOUT_FIELDS));
    }
    if(contactMount){
        contactMount.replaceChildren(createEditorForm("Contactを保存", CONTACT_FIELDS));
    }
}

function createNavigationForm(){
    const descriptors = [group("共有ナビゲーション", BRAND_NAVIGATION_KEYS.map(key => (
        text(`navigation.${key}`, NAVIGATION_LABELS[key])
    )))];
    return createEditorForm("Navigationを保存", descriptors);
}

function createEditorForm(buttonLabel, groups){
    const form = document.createElement("form");
    form.className = "brand-settings-form";

    const fields = groups.map(groupDescriptor => createGroup(groupDescriptor));
    const actions = document.createElement("div");
    actions.className = "brand-settings-actions";

    const button = document.createElement("button");
    button.type = "submit";
    button.className = "primary-button";
    button.textContent = buttonLabel;

    const status = document.createElement("p");
    status.className = "brand-settings-status";
    status.setAttribute("role", "status");
    status.textContent = "保存するとCMSの正本を更新します。Webへの反映はPublishで行います。";

    actions.append(button, status);
    form.append(...fields, actions);
    form.addEventListener("submit", async event => {
        event.preventDefault();
        button.disabled = true;
        status.dataset.state = "saving";
        status.textContent = "保存しています…";

        try{
            const next = clone(config);
            form.querySelectorAll("[data-brand-path]").forEach(control => {
                setPath(next, control.dataset.brandPath, control.value);
            });
            config = await saveBrandSiteCanonical(next);
            status.dataset.state = "success";
            status.textContent = "保存しました。Publishを実行するとWebへ同じ内容が公開されます。";
        }catch(error){
            console.error(error);
            status.dataset.state = "error";
            status.textContent = error?.message || "保存できませんでした。";
        }finally{
            button.disabled = false;
        }
    });

    return form;
}

function createGroup(descriptor){
    const fieldset = document.createElement("fieldset");
    fieldset.className = "brand-settings-group";
    const legend = document.createElement("legend");
    legend.textContent = descriptor.label;
    fieldset.append(legend, ...descriptor.fields.map(createField));
    return fieldset;
}

function createField(descriptor){
    const label = document.createElement("label");
    label.className = "brand-settings-field";
    const name = document.createElement("span");
    name.textContent = descriptor.label;
    const control = descriptor.type === "textarea"
        ? document.createElement("textarea")
        : document.createElement("input");

    if(descriptor.type === "textarea"){
        control.rows = descriptor.rows || 3;
    }else{
        control.type = "text";
    }
    control.required = true;
    control.maxLength = descriptor.type === "textarea" ? 1200 : 240;
    control.dataset.brandPath = descriptor.path;
    control.value = String(getPath(config, descriptor.path) ?? "");
    label.append(name, control);
    return label;
}

function setPath(target, path, value){
    const segments = String(path).split(".");
    let cursor = target;
    segments.slice(0, -1).forEach(segment => {
        const key = /^\d+$/.test(segment) ? Number(segment) : segment;
        cursor = cursor[key];
    });
    const last = segments.at(-1);
    cursor[/^\d+$/.test(last) ? Number(last) : last] = String(value);
}

function getPath(target, path){
    return String(path).split(".").reduce((value, segment) => {
        if(value === null || value === undefined) return undefined;
        const key = /^\d+$/.test(segment) ? Number(segment) : segment;
        return value[key];
    }, target);
}

function group(label, fields){
    return Object.freeze({ label, fields: Object.freeze(fields) });
}

function text(path, label){
    return Object.freeze({ path, label, type: "text" });
}

function textarea(path, label, rows = 3){
    return Object.freeze({ path, label, type: "textarea", rows });
}

function clone(value){
    return JSON.parse(JSON.stringify(value));
}
