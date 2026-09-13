export const BRAND_SITE_SCHEMA_VERSION = 1;
export const BRAND_SITE_MODULE = "brand-site";

export const BRAND_NAVIGATION_KEYS = Object.freeze([
    "home",
    "projects",
    "tools",
    "notes",
    "creators",
    "about",
    "contact"
]);

const DEFAULT_CONFIG = Object.freeze({
    schemaVersion: BRAND_SITE_SCHEMA_VERSION,
    navigation: Object.freeze({
        home: "ホーム",
        projects: "作品",
        tools: "道具",
        notes: "記録",
        creators: "活動者",
        about: "ブランド",
        contact: "連絡"
    }),
    about: Object.freeze({
        heading: Object.freeze({
            label: "About / RELMUA",
            title: "制作が戻ってくる、\nひとつの場所。",
            body: "RELMUAは、制作中の企画、記録、活動者の現在地を整理し、次の制作へつなぐクリエイティブブランドです。"
        }),
        story: Object.freeze({
            label: "RELMUAとは",
            title: "完成品だけでは、\n制作は残らない。",
            body: "RELMUAは、完成した成果だけでなく、企画の判断、制作記録、活動者の視点まで整理して、次の制作へ戻ってこられる場所をつくります。"
        }),
        areas: Object.freeze({
            label: "公開領域",
            title: "ブランドが扱うもの",
            body: "いま実際に公開できる3つの入口だけを並べています。",
            items: Object.freeze([
                Object.freeze({ title: "企画", body: "現在進めている構想を、完成度と未公開部分も含めて紹介します。" }),
                Object.freeze({ title: "記録", body: "制作の判断や試作の記録を、読み返せる紙面として残します。" }),
                Object.freeze({ title: "活動者", body: "人物の入口を用意し、個人の活動はCreatorサイトへ分けます。" })
            ])
        }),
        relation: Object.freeze({
            label: "活動者との関係",
            title: "入口を静かに整える。",
            body: "RELMUAは、制作物と活動者が増えても、見る人が迷わないための入口です。企画は企画として、記録は記録として、役割を分けて届けます。",
            secondary: "個人活動はCreatorサイトへ分け、ブランド側では全体の見通しを保ちます。"
        }),
        philosophy: Object.freeze({
            label: "Why",
            title: "小さな判断も、\n未来の素材になる。",
            body: "制作中のメモ、試した道具、公開の順番。完成前の情報も、丁寧に残せば次の作品を支える資産になります。"
        })
    }),
    contact: Object.freeze({
        heading: Object.freeze({
            label: "Contact / RELMUA",
            title: "言葉を、\n正しい窓口へ。",
            body: "ブランドへの連絡と、活動者個人への連絡を分けて案内します。送る前に、いま利用できる窓口をここで確認できます。"
        }),
        guide: Object.freeze({
            label: "連絡方針",
            title: "誰に届ける言葉かを、\n最初に選ぶ。",
            body: "ブランド全体のことはRELMUAへ。個人の活動は、それぞれのCreatorサイトへ。窓口を分けることで、必要な場所へ届きやすくします。"
        }),
        routes: Object.freeze({
            label: "連絡方針",
            title: "連絡先の選び方",
            body: "公開されている導線だけを使ってください。未設定の連絡先や外部サービス名は掲載しません。",
            brand: Object.freeze({
                label: "Brand",
                title: "公式窓口",
                body: "作品掲載、ブランドサイト、公開情報の扱いなど、RELMUA全体に関する内容です。公式窓口は準備が整い次第、このページに掲載します。"
            }),
            creator: Object.freeze({
                label: "Creator",
                title: "活動者への連絡",
                body: "個人活動、外部リンク、制作内容の詳細は個人サイト側で扱います。まずは活動者一覧から目的の人物を選んでください。"
            })
        }),
        faq: Object.freeze({
            label: "注意",
            title: "今の受付状況",
            items: Object.freeze([
                Object.freeze({ title: "公式メールはありますか？", body: "現在は公開できる窓口を整えています。未公開の連絡先を推測して送信しないでください。" }),
                Object.freeze({ title: "Creator個人へ連絡できますか？", body: "各Creatorサイトで公開されている導線がある場合のみ利用できます。" }),
                Object.freeze({ title: "個人活動について聞きたい場合は？", body: "各Creatorサイトで公開されている案内に従ってください。" })
            ])
        })
    })
});

export function getDefaultBrandSiteConfig(){
    return clone(DEFAULT_CONFIG);
}

export function normalizeBrandSiteConfig(value){
    const source = isRecord(value) ? value : {};
    const defaults = getDefaultBrandSiteConfig();

    return {
        schemaVersion: BRAND_SITE_SCHEMA_VERSION,
        navigation: normalizeNavigation(source.navigation, defaults.navigation),
        about: {
            heading: normalizeCopy(source.about?.heading, defaults.about.heading),
            story: normalizeCopy(source.about?.story, defaults.about.story),
            areas: {
                ...normalizeCopy(source.about?.areas, defaults.about.areas),
                items: normalizeItems(source.about?.areas?.items, defaults.about.areas.items, 3)
            },
            relation: normalizeRelation(source.about?.relation, defaults.about.relation),
            philosophy: normalizeCopy(source.about?.philosophy, defaults.about.philosophy)
        },
        contact: {
            heading: normalizeCopy(source.contact?.heading, defaults.contact.heading),
            guide: normalizeCopy(source.contact?.guide, defaults.contact.guide),
            routes: {
                ...normalizeCopy(source.contact?.routes, defaults.contact.routes),
                brand: normalizeCopy(source.contact?.routes?.brand, defaults.contact.routes.brand),
                creator: normalizeCopy(source.contact?.routes?.creator, defaults.contact.routes.creator)
            },
            faq: {
                label: normalizeText(source.contact?.faq?.label, defaults.contact.faq.label, 80),
                title: normalizeText(source.contact?.faq?.title, defaults.contact.faq.title, 160),
                items: normalizeItems(source.contact?.faq?.items, defaults.contact.faq.items, 3)
            }
        }
    };
}

export function validateBrandSiteConfig(value){
    const config = normalizeBrandSiteConfig(value);
    const errors = [];

    if(config.schemaVersion !== BRAND_SITE_SCHEMA_VERSION){
        errors.push("Brand Site schemaVersion must be 1.");
    }

    BRAND_NAVIGATION_KEYS.forEach(key => {
        if(!config.navigation[key]) errors.push(`navigation.${key} is required.`);
    });

    [
        ["about.heading", config.about.heading],
        ["about.story", config.about.story],
        ["about.areas", config.about.areas],
        ["about.philosophy", config.about.philosophy],
        ["contact.heading", config.contact.heading],
        ["contact.guide", config.contact.guide],
        ["contact.routes", config.contact.routes]
    ].forEach(([path, block]) => validateCopy(path, block, errors));

    if(!config.about.relation.label || !config.about.relation.title || !config.about.relation.body || !config.about.relation.secondary){
        errors.push("about.relation fields are required.");
    }

    if(config.about.areas.items.length !== 3 || config.contact.faq.items.length !== 3){
        errors.push("Brand Site requires exactly three About area items and three Contact FAQ items.");
    }

    config.about.areas.items.forEach((item, index) => validateItem(`about.areas.items[${index}]`, item, errors));
    config.contact.faq.items.forEach((item, index) => validateItem(`contact.faq.items[${index}]`, item, errors));
    validateCopy("contact.routes.brand", config.contact.routes.brand, errors);
    validateCopy("contact.routes.creator", config.contact.routes.creator, errors);

    if(!config.contact.faq.label || !config.contact.faq.title){
        errors.push("contact.faq label and title are required.");
    }

    if(errors.length){
        throw new Error(errors.join("\n"));
    }

    return true;
}

function normalizeNavigation(value, defaults){
    const source = isRecord(value) ? value : {};
    return Object.fromEntries(BRAND_NAVIGATION_KEYS.map(key => [
        key,
        normalizeText(source[key], defaults[key], 40)
    ]));
}

function normalizeCopy(value, defaults){
    const source = isRecord(value) ? value : {};
    return {
        label: normalizeText(source.label, defaults.label, 80),
        title: normalizeText(source.title, defaults.title, 240, true),
        body: normalizeText(source.body, defaults.body, 1200)
    };
}

function normalizeRelation(value, defaults){
    const source = isRecord(value) ? value : {};
    return {
        label: normalizeText(source.label, defaults.label, 80),
        title: normalizeText(source.title, defaults.title, 240, true),
        body: normalizeText(source.body, defaults.body, 1200),
        secondary: normalizeText(source.secondary, defaults.secondary, 1200)
    };
}

function normalizeItems(value, defaults, count){
    const source = Array.isArray(value) ? value : [];
    return Array.from({ length: count }, (_, index) => {
        const fallback = defaults[index];
        const item = isRecord(source[index]) ? source[index] : {};
        return {
            title: normalizeText(item.title, fallback.title, 180),
            body: normalizeText(item.body, fallback.body, 1200)
        };
    });
}

function normalizeText(value, fallback, maxLength, preserveNewlines = false){
    const source = typeof value === "string" ? value : fallback;
    const normalized = preserveNewlines
        ? source.replace(/\r\n?/g, "\n").split("\n").map(line => line.trim()).filter(Boolean).join("\n")
        : source.replace(/\s+/g, " ").trim();
    return normalized.slice(0, maxLength);
}

function validateCopy(path, block, errors){
    if(!block?.label || !block?.title || !block?.body){
        errors.push(`${path} label, title and body are required.`);
    }
}

function validateItem(path, item, errors){
    if(!item?.title || !item?.body){
        errors.push(`${path} title and body are required.`);
    }
}

function isRecord(value){
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value){
    return JSON.parse(JSON.stringify(value));
}
