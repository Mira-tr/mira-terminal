export function createAvailabilityController(context){
    const {
        appState,
        root,
        WEEKDAY_LABELS,
        availabilityEntry,
        formatJapaneseDate,
        updateExceptionState,
        updateWeeklyState,
        removeException,
        updateAvailabilityRange,
        removeAvailabilityRange,
        addAvailabilityRange,
        MAX_AVAILABILITY_RANGES,
        validateAvailabilityPayload,
        createPersonalAvailabilityModel,
        el,
        sectionBlock,
        textButton,
        emptyState,
        feedbackMessage,
        actionButton,
        timeRangeEditor,
        minutesFromTimeFields,
        renderDashboard,
        setBusy,
        reportSchedulerError
    } = context;

    function renderAvailability(){
        const model = appState.availabilityEditor;
        const weeklyRows = WEEKDAY_LABELS.map((label, weekday) => availabilityWeekdayRow(model, weekday, label));
        const exceptions = Object.entries(model.exceptions).sort(([left], [right]) => left.localeCompare(right));

        root.replaceChildren(
            sectionBlock("MY AVAILABILITY", [
                textButton("← MY SESSIONS", () => {
                    appState.screen = "dashboard";
                    appState.availabilityFeedback = null;
                    renderDashboard();
                }),
                el("p", {
                    className: "v2-app-copy"
                }, "通常の参加可能時間を保存すると、候補日への回答を仮入力できます。確定済みの別卓と重なる時間は候補ごとに知らせます。"),
                el("div", {
                    className: "v2-availability-list"
                }, weeklyRows),
                el("div", {
                    className: "v2-availability-exceptions"
                }, [
                    el("div", {
                        className: "v2-availability-exceptions__head"
                    }, [
                        el("strong", {}, "特定日の例外"),
                        el("small", {}, "通常の週間予定より優先されます")
                    ]),
                    el("div", {
                        className: "v2-availability-add-date"
                    }, [
                        el("input", {
                            type: "date",
                            value: appState.availabilityNewDate,
                            "aria-label": "例外を追加する日付",
                            onChange(event){
                                appState.availabilityNewDate = event.currentTarget.value;
                            }
                        }),
                        actionButton("日付を追加", () => {
                            const dateKey = String(appState.availabilityNewDate ?? "");
                            if(!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)){
                                appState.availabilityFeedback = {
                                    kind: "error",
                                    text: "例外を設定する日付を入力してください。"
                                };
                                renderAvailability();
                                return;
                            }

                            appState.availabilityEditor = updateExceptionState(model, dateKey, "available");
                            appState.availabilityFeedback = null;
                            renderAvailability();
                        })
                    ]),
                    exceptions.length
                        ? el("div", { className: "v2-availability-exception-list" }, exceptions.map(([dateKey, entry]) => availabilityExceptionRow(model, dateKey, entry)))
                        : emptyState("特定日の例外はまだありません。")
                ]),
                appState.availabilityFeedback ? feedbackMessage(appState.availabilityFeedback) : null,
                actionButton("予定を保存", () => savePersonalAvailability(), "primary")
            ])
        );
    }

    function availabilityWeekdayRow(model, weekday, label){
        const entry = availabilityEntry(model, "weekly", weekday);
        return el("article", {
            className: "v2-availability-row"
        }, [
            el("strong", {}, label),
            availabilityStateSelect(entry.state, nextState => {
                appState.availabilityEditor = updateWeeklyState(model, weekday, nextState);
                appState.availabilityFeedback = null;
                renderAvailability();
            }),
            entry.state === "available"
                ? availabilityRangesEditor(model, "weekly", weekday, entry)
                : el("small", {}, entry.state === "unavailable" ? "参加不可" : "未設定")
        ]);
    }

    function availabilityExceptionRow(model, dateKey, entry){
        return el("article", {
            className: "v2-availability-exception"
        }, [
            el("div", {
                className: "v2-availability-exception__head"
            }, [
                el("strong", {}, formatJapaneseDate(dateKey)),
                textButton("削除", () => {
                    appState.availabilityEditor = removeException(model, dateKey);
                    appState.availabilityFeedback = null;
                    renderAvailability();
                })
            ]),
            availabilityStateSelect(entry.state, nextState => {
                appState.availabilityEditor = updateExceptionState(model, dateKey, nextState);
                appState.availabilityFeedback = null;
                renderAvailability();
            }, false),
            entry.state === "available"
                ? availabilityRangesEditor(model, "exception", dateKey, entry)
                : el("small", {}, "この日は参加不可")
        ]);
    }

    function availabilityStateSelect(value, onChange, allowUnset = true){
        return el("label", {
            className: "v2-availability-state"
        }, [
            el("span", {}, "予定"),
            el("select", {
                value,
                onChange(event){
                    onChange(event.currentTarget.value);
                }
            }, [
                ...(allowUnset ? [el("option", { value: "unset" }, "未設定")] : []),
                el("option", { value: "available" }, "参加できる"),
                el("option", { value: "unavailable" }, "参加できない")
            ])
        ]);
    }

    function availabilityRangesEditor(model, scope, key, entry){
        const rows = entry.ranges.map((range, index) => timeRangeEditor({
            scope: `availability-${scope}-${key}-${index}`,
            startMinute: range.startMinute,
            endMinute: range.endMinute,
            onChange(fields){
                const nextRange = minutesFromTimeFields(fields, range);
                if(!nextRange){
                    return;
                }
                appState.availabilityEditor = updateAvailabilityRange(model, scope, key, index, nextRange);
                appState.availabilityFeedback = null;
                renderAvailability();
            },
            onRemove: entry.ranges.length > 1 ? () => {
                appState.availabilityEditor = removeAvailabilityRange(model, scope, key, index);
                appState.availabilityFeedback = null;
                renderAvailability();
            } : null
        }));

        if(entry.ranges.length < MAX_AVAILABILITY_RANGES){
            rows.push(textButton("＋ 時間帯を追加", () => {
                appState.availabilityEditor = addAvailabilityRange(model, scope, key);
                appState.availabilityFeedback = null;
                renderAvailability();
            }));
        }

        return el("div", {
            className: "v2-availability-ranges"
        }, rows);
    }

    async function savePersonalAvailability(){
        if(appState.busy){
            return;
        }

        const validation = validateAvailabilityPayload(appState.availabilityEditor);
        if(!validation.ok){
            appState.availabilityFeedback = {
                kind: "error",
                text: validation.errors[0]
            };
            renderAvailability();
            return;
        }

        setBusy(true);

        try{
            const saved = await appState.repository.saveTrpgV31PersonalAvailability(validation.payload);
            appState.personalAvailability = createPersonalAvailabilityModel(saved);
            appState.availabilityEditor = createPersonalAvailabilityModel(saved);
            appState.availabilityFeedback = {
                kind: "success",
                text: "自分の予定を保存しました。"
            };
            renderAvailability();
        }catch(error){
            reportSchedulerError("save-personal-availability", error);
            appState.availabilityFeedback = {
                kind: "error",
                text: "予定の保存に失敗しました。時間をおいてもう一度お試しください。"
            };
            renderAvailability();
        }finally{
            setBusy(false);
        }
    }

    return {
        renderAvailability,
        availabilityWeekdayRow,
        availabilityExceptionRow,
        availabilityStateSelect,
        availabilityRangesEditor,
        savePersonalAvailability
    };
}
