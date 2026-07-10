import {
    RULES_KEY,
    load,
    save
} from "../../../store.js";

export const RULE_STATUSES = [
    "draft",
    "public",
    "private"
];

export const DEFAULT_RULE_CATEGORY = "未分類";

export const RULE_CATEGORY_OPTIONS = [
    "基本",
    "探索者作成",
    "判定",
    "探索",
    "狂気・回復",
    "戦闘",
    "その他"
];

const DEFAULT_RULES = {
    systems: [
        {
            id: "coc6",
            label: "CoC6版",
            title: "MIRA卓 CoC6版 ハウスルール",
            version: "1.0",
            description: "MIRA卓で使用するクトゥルフ神話TRPG 6版のハウスルールです。",
            status: "public",
            sections: [
                {
                    id: "intro",
                    category: "基本",
                    title: "はじめに",
                    body: "MIRA卓では、以下の方針でTRPGを行います。\n\n- ルールブックの基本ルールを尊重する\n- 不明点はGMの裁定に従う\n- プレイヤーの提案を柔軟に検討する\n- 楽しくプレイすることを最優先する",
                    order: 1,
                    status: "public"
                },
                {
                    id: "system",
                    category: "基本",
                    title: "使用ルール",
                    body: "主に以下のルールブックを使用します。\n\n- クトゥルフの呼び声 第6版（CoC6）\n- クトゥルフの呼び声 第7版（CoC7）\n- エモクロア コアルールブック\n- その他、シナリオに応じたルール",
                    order: 2,
                    status: "public"
                },
                {
                    id: "character",
                    category: "探索者作成",
                    title: "キャラクター作成",
                    body: "能力値\n基本的にルールブック通りのロールで決定します。ただし、GMの許可があればポイントバイ方式も可能です。\n\n技能\n技能ポイントはルールブック通りに配分してください。職業技能は職業に応じたものを選択します。\n\n技能上限\n初期段階での技能上限は以下の通りです。\n\n- 職業技能：最大75%\n- 興味技能：最大50%\n- ただし、シナリオによって上限が変更される場合があります",
                    order: 3,
                    status: "public"
                },
                {
                    id: "english-skills",
                    category: "探索者作成",
                    title: "英語技能の初期値",
                    body: "英語技能の初期値はルールブック通りに設定してください。シナリオによっては初期値が変更される場合があります。",
                    order: 4,
                    status: "public"
                },
                {
                    id: "skills-growth",
                    category: "判定",
                    title: "技能・成長",
                    body: "技能の成長はルールブック通りに行います。セッション終了後に技能ロールを行い、成功した場合のみ技能値が上昇します。",
                    order: 5,
                    status: "public"
                },
                {
                    id: "sanity",
                    category: "狂気・回復",
                    title: "狂気",
                    body: "SAN値チェック\nルールブック通りのSAN値チェックを行います。失敗した場合の狂気症状は、GMが状況に応じて決定します。\n\n一時的狂気\n一時的狂気になったPCは、GMの指示に従ってロールプレイを行います。他のプレイヤーも協力して演出に参加してください。\n\n不定の狂気\n不定の狂気になった場合、そのセッション中は回復しません。セッション終了後に治療が必要です。",
                    order: 6,
                    status: "public"
                },
                {
                    id: "combat",
                    category: "戦闘",
                    title: "戦闘",
                    body: "イニシアチブ\n戦闘開始時のDEXロールで決定します。同値の場合はDEXの高い順、それも同じ場合はGMの裁定で決定します。\n\n射撃\n射撃武器の使用には技能ロールが必要です。失敗した場合、弾薬を消費しても命中しません。ファンブルの場合はジャムや誤射の可能性があります。\n\n部位狙い\n部位狙いを行う場合、通常の難易度に加えてペナルティを受けます。具体的な難易度はGMが状況に応じて決定します。\n\nかばう\n「かばう」アクションを行うには、DEXロールか技能ロールが必要です。成功した場合、対象が受けるダメージを肩代わりします。\n\n致死ダメージ\n致死ダメージを受けた場合、即死チェックを行います。失敗した場合、そのPCは死亡します。",
                    order: 7,
                    status: "public"
                },
                {
                    id: "special-rulings",
                    category: "その他",
                    title: "特殊裁定",
                    body: "シナリオ固有の特殊裁定がある場合、GMが事前に説明します。不明点はセッション中に確認してください。",
                    order: 8,
                    status: "public"
                },
                {
                    id: "r18-rating",
                    category: "基本",
                    title: "年齢区分",
                    body: "全年齢（All）\n一般的なTRPGシナリオです。年齢制限はありません。\n\nR18\n18歳未満は閲覧・参加できません。暴力描写や性的描写などの細かな注意要素はタグで案内します。",
                    order: 9,
                    status: "public"
                },
                {
                    id: "notice",
                    category: "基本",
                    title: "参加時のお願い",
                    body: "時間厳守\n開始時間は厳守してください。遅刻の場合、途中参加となる可能性があります。\n\n環境\n騒音の少ない環境で参加してください。マイクの使用は推奨します。\n\nマナー\n他のプレイヤーへの敬意を持ってロールプレイを行ってください。不快な言動は慎んでください。\n\n休憩\n適宜休憩を挟みます。休憩中は雑談や準備を行ってください。\n\nキャンセル\nやむを得ずキャンセルする場合は、事前にGMへ連絡してください。",
                    order: 10,
                    status: "public"
                }
            ]
        },
        {
            id: "coc7",
            label: "CoC7版",
            title: "MIRA卓 CoC7版 ハウスルール",
            version: "",
            description: "MIRA卓で使用するクトゥルフ神話TRPG 7版のハウスルールです。",
            status: "draft",
            sections: []
        }
    ]
};

export function loadRules(){
    return normalizeRules(
        load(
            RULES_KEY,
            DEFAULT_RULES
        )
    );
}

export function saveRules(rules){
    return save(
        RULES_KEY,
        normalizeRules(rules)
    );
}

export function getRules(){
    return loadRules();
}

export function setRules(rules){
    return saveRules(rules);
}

export function getSystem(systemId){
    const rules = getRules();
    return rules.systems.find(s => s.id === systemId);
}

export function updateSystem(systemId, updates){
    const rules = getRules();
    const systemIndex = rules.systems.findIndex(s => s.id === systemId);

    if(systemIndex === -1){
        return "";
    }

    rules.systems[systemIndex] = {
        ...rules.systems[systemIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    const normalized = normalizeRules(rules);
    if(!setRules(normalized)){
        return "";
    }

    return normalized.systems[systemIndex]?.id || "";
}

export function addSection(systemId, section){
    const rules = getRules();
    const system = rules.systems.find(s => s.id === systemId);

    if(!system){
        return "";
    }

    const sectionId = createUniqueSectionId(
        system.sections,
        section.id || section.title || "section"
    );

    system.sections.push({
        id: sectionId,
        category: section.category || DEFAULT_RULE_CATEGORY,
        title: section.title || "",
        body: section.body || "",
        order: system.sections.length + 1,
        status: section.status || "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    if(!setRules(rules)){
        return "";
    }

    return sectionId;
}

export function updateSection(systemId, sectionId, updates){
    const rules = getRules();
    const system = rules.systems.find(s => s.id === systemId);

    if(!system){
        return false;
    }

    const sectionIndex = system.sections.findIndex(s => s.id === sectionId);

    if(sectionIndex === -1){
        return false;
    }

    system.sections[sectionIndex] = {
        ...system.sections[sectionIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    return setRules(rules);
}

export function deleteSection(systemId, sectionId){
    const rules = getRules();
    const system = rules.systems.find(s => s.id === systemId);

    if(!system){
        return false;
    }

    system.sections = system.sections.filter(s => s.id !== sectionId);

    return setRules(rules);
}

export function duplicateSection(systemId, sectionId){
    const rules = getRules();
    const system = rules.systems.find(s => s.id === systemId);

    if(!system){
        return "";
    }

    const sectionIndex = system.sections.findIndex(s => s.id === sectionId);

    if(sectionIndex === -1){
        return "";
    }

    const source = system.sections[sectionIndex];
    const newId = createUniqueSectionId(
        system.sections,
        `${source.id || "section"}-copy`
    );

    system.sections.splice(sectionIndex + 1, 0, {
        ...source,
        id: newId,
        title: source.title ? `${source.title} コピー` : "",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    if(!setRules(reassignSectionOrders(rules))){
        return "";
    }

    return newId;
}

export function moveSection(systemId, sectionId, direction){
    const rules = getRules();
    const system = rules.systems.find(s => s.id === systemId);

    if(!system){
        return false;
    }

    const sectionIndex = system.sections.findIndex(s => s.id === sectionId);

    if(sectionIndex === -1){
        return false;
    }

    const targetIndex = direction === "up" ? sectionIndex - 1 : sectionIndex + 1;

    if(targetIndex < 0 || targetIndex >= system.sections.length){
        return false;
    }

    const [section] = system.sections.splice(sectionIndex, 1);
    system.sections.splice(targetIndex, 0, section);

    return setRules(reassignSectionOrders(rules));
}

export function normalizeRules(rules){
    const sourceSystems = Array.isArray(rules?.systems)
        ? rules.systems
        : DEFAULT_RULES.systems;
    const usedSystemIds = new Set();

    return {
        systems: sourceSystems
            .filter(system => system && typeof system === "object")
            .map((system, index) => normalizeSystem(
                system,
                index,
                usedSystemIds
            ))
    };
}

function normalizeSystem(system, index, usedIds){
    const label = toText(system.label) || `System ${index + 1}`;
    const id = createUniqueId(
        system.id || label,
        usedIds,
        `system-${index + 1}`
    );
    const title = toText(system.title) || label;

    return {
        id,
        label,
        title,
        version: toText(system.version),
        description: toText(system.description),
        status: normalizeStatus(system.status, "public"),
        sections: normalizeSections(system.sections),
        ...pickManagedTimestamps(system)
    };
}

function normalizeSections(sections){
    if(!Array.isArray(sections)){
        return [];
    }

    const usedSectionIds = new Set();

    return sections
        .filter(section => section && typeof section === "object")
        .map((section, index) => ({
            ...section,
            originalIndex: index,
            order: normalizeOrder(section.order, index)
        }))
        .sort((a, b) => {
            if(a.order !== b.order){
                return a.order - b.order;
            }

            return a.originalIndex - b.originalIndex;
        })
        .map((section, index) => normalizeSection(
            section,
            index,
            usedSectionIds
        ));
}

function normalizeSection(section, index, usedIds){
    const title = toText(section.title);

    return {
        id: createUniqueId(
            section.id || title || section.category,
            usedIds,
            `section-${index + 1}`
        ),
        order: index + 1,
        category: toText(section.category) || DEFAULT_RULE_CATEGORY,
        title,
        status: normalizeStatus(section.status, "public"),
        body: toTextPreserveLines(section.body),
        ...pickManagedTimestamps(section)
    };
}

function reassignSectionOrders(rules){
    rules.systems.forEach(system => {
        system.sections.forEach((section, index) => {
            section.order = index + 1;
        });
    });

    return rules;
}

function createUniqueSectionId(sections, value){
    const usedIds = new Set(
        sections.map(section => section.id)
    );

    return createUniqueId(
        value,
        usedIds,
        `section-${sections.length + 1}`
    );
}

function createUniqueId(value, usedIds, fallback){
    const base = toSafeId(value) || fallback;
    let id = base;
    let suffix = 2;

    while(usedIds.has(id)){
        id = `${base}-${suffix}`;
        suffix += 1;
    }

    usedIds.add(id);
    return id;
}

function toSafeId(value){
    return toText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeStatus(value, fallback){
    const status = toText(value);

    return RULE_STATUSES.includes(status)
        ? status
        : fallback;
}

function normalizeOrder(value, index){
    const order = Number(value);

    return Number.isFinite(order) && order > 0
        ? order
        : index + 1;
}

function toText(value){
    return String(value ?? "").trim();
}

function toTextPreserveLines(value){
    return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function pickManagedTimestamps(item){
    const timestamps = {};

    if(item.createdAt !== undefined){
        timestamps.createdAt = item.createdAt;
    }

    if(item.updatedAt !== undefined){
        timestamps.updatedAt = item.updatedAt;
    }

    return timestamps;
}
