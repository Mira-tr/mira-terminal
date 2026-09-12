(() => {
    const adminRootUrl = new URL("../", document.currentScript.src);
    const navigationRegistryPromise = import("./features/navigation/adminRouteRegistry.js");
    const surfaceConsolePromise = import("./features/site/adminSurfaceConsole.js");

    const PAGE_LABELS = Object.freeze({
        "": "編集ホーム",
        "brand/": "サイト編集",
        "brand/structure/": "サイト構成",
        "home/": "トップページ",
        "game/": "作品",
        "tools/": "ツール",
        "notes/": "ノート",
        "creators/": "千景・活動者",
        "creators/chikage/": "千景サイト",
        "profile/": "千景プロフィール",
        "trpg/": "TRPG",
        "trpg/rules/": "ハウスルール",
        "system/": "サイト運用",
        "system/database/": "データ接続",
        "system/backup/": "バックアップ",
        "system/validation/": "公開前チェック",
        "system/publish/": "公開する",
        "system/export/": "公開データ",
        "system/import/": "復元",
        "system/logs/": "操作履歴",
        "system/settings/": "公開設定",
        "system/guide/": "使い方"
    });

    const FRIENDLY_COPY = new Map([
        ["RELMUA Admin", "編集ホーム"],
        ["Dashboard", "ホーム"],
        ["Creators", "活動者"],
        ["System", "サイト運用"],
        ["Site Structure", "サイト構成"],
        ["Home", "トップページ"],
        ["Projects", "作品"],
        ["Tools", "ツール"],
        ["Notes", "ノート"],
        ["Database", "データ接続"],
        ["Validation", "公開前チェック"],
        ["Public Snapshot", "公開データ"],
        ["Backup", "バックアップ"],
        ["Import", "復元"],
        ["Build / Publish", "公開する"],
        ["Activity Log", "操作履歴"],
        ["Settings", "公開設定"],
        ["Operations Guide", "使い方"],
        ["Workspaces", "編集する場所"],
        ["Today", "いまの状態"],
        ["Last Backup", "最後のバックアップ"],
        ["Public Build", "公開サイト"],
        ["Open System", "公開・復旧を管理"],
        ["Creators Backup", "活動者データのバックアップ"],
        ["Creators Public Export", "公開用データ"],
        ["Backup Export", "バックアップを保存"],
        ["Backup Import", "バックアップから復元"],
        ["Public Export", "公開用データを書き出す"],
        ["Save", "保存"],
        ["Delete", "削除"],
        ["Draft", "下書き"],
        ["Public", "公開"],
        ["Private", "非公開"],
        ["Bio", "自己紹介"],
        ["Activities（改行区切り）", "活動内容（1行ずつ）"],
        ["Databaseを確認", "データ接続を確認"],
        ["Daily flow", "公開までの流れ"],
        ["Recovery & history", "復旧と履歴"],
        ["Mark Reviewed", "確認済みにする"]
    ]);

    async function createPrimaryNavigation(){
        const navigation = document.querySelector(".admin-header .header-nav");
        if(!navigation){
            return;
        }

        const { getAdminPrimaryNavigation } = await navigationRegistryPromise;
        const currentSection = getCurrentAdminSection(location.pathname);
        const links = getAdminPrimaryNavigation().map(route => {
            const link = document.createElement("a");
            link.className = "nav-item";
            link.href = new URL(route.adminHref, adminRootUrl).href;
            link.textContent = route.label;
            link.dataset.adminRoot = route.id;
            if(route.id === currentSection){
                link.classList.add("is-current");
                link.setAttribute("aria-current", "page");
            }
            return link;
        });

        navigation.setAttribute("aria-label", "RELMUA編集メニュー");
        navigation.replaceChildren(...links);
        document.body.dataset.adminSection = currentSection;
    }

    function getRelativeAdminPath(pathname){
        const path = String(pathname || "").replaceAll("\\", "/").toLowerCase();
        const adminRootPath = adminRootUrl.pathname.toLowerCase();
        return path.startsWith(adminRootPath)
            ? path.slice(adminRootPath.length)
            : path.replace(/^\/+/, "");
    }

    function getCurrentAdminSection(pathname){
        const relativePath = getRelativeAdminPath(pathname);
        if(relativePath.startsWith("system/")) return "admin-system";
        if(relativePath.startsWith("creators/") || relativePath.startsWith("profile/") || relativePath.startsWith("trpg/")) return "admin-creators";
        if(relativePath.startsWith("brand/") || relativePath.startsWith("home/") || relativePath.startsWith("game/") || relativePath.startsWith("tools/") || relativePath.startsWith("notes/")) return "admin-relmua";
        return "admin-home";
    }

    function enhanceHeader(){
        const relativePath = getRelativeAdminPath(location.pathname);
        const label = PAGE_LABELS[relativePath] || "編集室";
        const heading = document.querySelector(".admin-header h1");
        const description = document.querySelector(".admin-header p");

        if(heading){
            heading.textContent = "RELMUA";
            heading.classList.add("admin-header-site");
        }
        if(description){
            description.textContent = label;
            description.classList.add("admin-header-section");
        }
        document.title = `${label} | RELMUA 編集室`;
    }

    function createOperationGuide(){
        const main = document.querySelector(".admin-main");
        if(!main || main.classList.contains("system-main") || main.classList.contains("creator-workspace-main") || document.querySelector(".dashboard-overview")){
            return;
        }

        const guide = document.createElement("aside");
        guide.className = "admin-operation-guide";
        guide.setAttribute("aria-label", "この画面の操作について");
        [
            ["保存", "編集内容を管理データへ保存します。"],
            ["公開用データ", "公開サイトに出してよい情報だけを書き出します。"],
            ["バックアップ", "非公開情報も含め、元に戻せる復旧データを保存します。"],
            ["復元", "バックアップの内容を確認してから管理データへ戻します。"]
        ].forEach(([title, description]) => {
            const item = document.createElement("div");
            const strong = document.createElement("strong");
            const text = document.createElement("span");
            strong.textContent = title;
            text.textContent = description;
            item.append(strong, text);
            guide.appendChild(item);
        });
        main.querySelector(".admin-breadcrumb")?.after(guide);
    }

    function enhanceOperationZones(){
        document.querySelectorAll(".panel-sub, .home-public-export-section").forEach(zone => {
            const text = zone.textContent || "";
            const importButton = zone.querySelector('[id*="Import"], [id="importBtn"]');
            const resetButton = zone.querySelector('[id*="reset" i]');
            let description = "";

            if(importButton){
                zone.classList.add("operation-zone", "operation-zone--backup");
                description = "復元すると現在の編集内容が置き換わることがあります。先にバックアップを保存してから使ってください。";
            }else if(resetButton){
                zone.classList.add("operation-zone", "operation-zone--danger");
                description = "初期状態へ戻す操作です。影響する範囲を確認してから実行してください。";
            }else if(text.includes("Public Export") || text.includes("公開用データ") || zone.classList.contains("home-public-export-section")){
                zone.classList.add("operation-zone", "operation-zone--publish");
                description = "公開サイト向けのデータだけを作ります。管理メモなどの非公開情報は含めません。";
            }else if(text.includes("Backup") || text.includes("バックアップ")){
                zone.classList.add("operation-zone", "operation-zone--backup");
                description = "困ったときに元へ戻すためのデータです。公開サイトには置きません。";
            }

            if(description && !zone.querySelector(".operation-zone-description")){
                const note = document.createElement("p");
                note.className = "operation-zone-description";
                note.textContent = description;
                zone.querySelector("h2, h3")?.after(note);
            }
        });

        document.querySelectorAll("button").forEach(button => {
            if(button.closest(".system-main")) return;
            const id = button.id.toLowerCase();
            const label = button.textContent.trim();
            if(id.includes("import")) button.classList.add("button-import");
            if(id.includes("reset")) button.classList.add("button-reset");
            if(id.includes("delete") || label === "Delete" || label === "削除") button.classList.add("button-delete");
            if(id.includes("import")) addDangerNotice(button, "復元", "現在の編集内容を上書きする可能性があります。内容を確認し、先にバックアップを保存してください。");
            if(id.includes("reset")) addDangerNotice(button, "初期状態へ戻す", "保存済みの設定を初期値へ戻します。実行前に影響範囲を確認してください。");
        });
    }

    function addDangerNotice(button, title, description){
        if(button.previousElementSibling?.classList.contains("operation-danger-inline")) return;
        const notice = document.createElement("div");
        notice.className = "operation-danger-inline";
        notice.id = `${button.id || "danger-action"}-description`;
        const strong = document.createElement("strong");
        const text = document.createElement("span");
        strong.textContent = `注意が必要 / ${title}`;
        text.textContent = description;
        notice.append(strong, text);
        button.before(notice);
        button.setAttribute("aria-describedby", notice.id);
    }

    function enhanceFormSemantics(){
        ["creatorDisplayName", "gameTitleInput", "toolName", "noteTitle", "title"]
            .map(id => document.getElementById(id))
            .filter(Boolean)
            .forEach(field => {
                field.required = true;
                field.setAttribute("aria-required", "true");
            });
        document.querySelectorAll(".form-message").forEach(message => {
            if(!message.hasAttribute("role")) message.setAttribute("role", "status");
        });
    }

    function applyFriendlyCopy(){
        const selectors = [
            ".admin-breadcrumb a",
            ".admin-breadcrumb li",
            ".panel-sub > h2",
            ".panel-sub > h3",
            ".dashboard-section-heading > h3",
            ".dashboard-workspaces-heading > h3",
            ".dashboard-backup-summary h3",
            ".dashboard-backup-summary .button",
            ".system-home-step-copy > strong",
            ".system-home-links strong",
            ".system-home-eyebrow",
            ".button",
            ".form-field > label",
            "select option"
        ].join(",");

        document.querySelectorAll(selectors).forEach(element => {
            const original = element.textContent.trim();
            const replacement = FRIENDLY_COPY.get(original);
            if(replacement && replacement !== original){
                element.textContent = replacement;
            }
        });
    }

    document.documentElement.style.colorScheme = "light";
    document.addEventListener("DOMContentLoaded", async () => {
        enhanceHeader();
        createPrimaryNavigation();
        createOperationGuide();
        enhanceOperationZones();
        enhanceFormSemantics();
        applyFriendlyCopy();

        try{
            const { initAdminSurfaceConsole } = await surfaceConsolePromise;
            initAdminSurfaceConsole({ adminRootUrl });
        }catch(error){
            console.warn("[admin] Public surface console could not start", error);
        }

        new MutationObserver(() => {
            enhanceOperationZones();
            applyFriendlyCopy();
        }).observe(document.body, { childList: true, subtree: true });
    });
})();
