import fs from "node:fs";
const locales = ["en", "ar", "ru", "uk", "es", "pt", "fr", "de"];
const rows = {
  "activity.savePeopleCount": [
    "{count, plural, one {# person} other {# people}}",
    "{count, plural, zero {لا أحد} one {شخص واحد} two {شخصان} few {# أشخاص} many {# شخصًا} other {# شخص}}",
    "{count, plural, one {# человек} few {# человека} many {# человек} other {# человека}}",
    "{count, plural, one {# людина} few {# людини} many {# людей} other {# людини}}",
    "{count, plural, one {# persona} other {# personas}}",
    "{count, plural, one {# pessoa} other {# pessoas}}",
    "{count, plural, one {# personne} other {# personnes}}",
    "{count, plural, one {# Person} other {# Personen}}"
  ],
  "activity.savedByPeople": [
    "{count, plural, one {# person} other {# people}} saved your {target}",
    "{count, plural, zero {لم يحفظ أحد} one {حفظ شخص واحد} two {حفظ شخصان} few {حفظ # أشخاص} many {حفظ # شخصًا} other {حفظ # شخص}} {target} الخاص بك",
    "{count, plural, one {# человек сохранил} few {# человека сохранили} many {# человек сохранили} other {# человека сохранили}} ваш {target}",
    "{count, plural, one {# людина зберегла} few {# людини зберегли} many {# людей зберегли} other {# людини зберегли}} ваш {target}",
    "{count, plural, one {# persona guardó} other {# personas guardaron}} tu {target}",
    "{count, plural, one {# pessoa guardou} other {# pessoas guardaram}} o teu {target}",
    "{count, plural, one {# personne a enregistré} other {# personnes ont enregistré}} ton {target}",
    "{count, plural, one {# Person hat} other {# Personen haben}} deinen {target} gespeichert"
  ],
  "social.item": [
    "{value0, plural, one {# item} other {# items}}",
    "{value0, plural, zero {لا عناصر} one {عنصر واحد} two {عنصران} few {# عناصر} many {# عنصرًا} other {# عنصر}}",
    "{value0, plural, one {# элемент} few {# элемента} many {# элементов} other {# элемента}}",
    "{value0, plural, one {# елемент} few {# елементи} many {# елементів} other {# елемента}}",
    "{value0, plural, one {# elemento} other {# elementos}}",
    "{value0, plural, one {# item} other {# itens}}",
    "{value0, plural, one {# élément} other {# éléments}}",
    "{value0, plural, one {# Element} other {# Elemente}}"
  ],
  "payments.activeSubscriptions": [
    "{count, plural, one {# active subscription} other {# active subscriptions}}",
    "{count, plural, zero {لا اشتراكات نشطة} one {اشتراك نشط واحد} two {اشتراكان نشطان} few {# اشتراكات نشطة} many {# اشتراكًا نشطًا} other {# اشتراك نشط}}",
    "{count, plural, one {# активная подписка} few {# активные подписки} many {# активных подписок} other {# активной подписки}}",
    "{count, plural, one {# активна підписка} few {# активні підписки} many {# активних підписок} other {# активної підписки}}",
    "{count, plural, one {# suscripción activa} other {# suscripciones activas}}",
    "{count, plural, one {# subscrição ativa} other {# subscrições ativas}}",
    "{count, plural, one {# abonnement actif} other {# abonnements actifs}}",
    "{count, plural, one {# aktives Abonnement} other {# aktive Abonnements}}"
  ],
  "system.perMonth": ["/mo", "/شهر", "/мес.", "/міс.", "/mes", "/mês", "/mois", "/Monat"],
  "system.perMonthFull": ["/month", "/شهر", "/месяц", "/місяць", "/mes", "/mês", "/mois", "/Monat"],
  "system.previewUsage": ["{count, number} / 1 · 60s", "{count, number} / ١ · ٦٠ ث", "{count, number} / 1 · 60 с", "{count, number} / 1 · 60 с", "{count, number} / 1 · 60 s", "{count, number} / 1 · 60 s", "{count, number} / 1 · 60 s", "{count, number} / 1 · 60 Sek."],
  "system.chapterPosition": ["Chapter {current} of {total}", "الفصل {current} من {total}", "Глава {current} из {total}", "Розділ {current} із {total}", "Capítulo {current} de {total}", "Capítulo {current} de {total}", "Chapitre {current} sur {total}", "Kapitel {current} von {total}"],
  "system.interestsRemaining": [
    "{count, plural, one {Pick # more interest} other {Pick # more interests}}",
    "{count, plural, zero {اختر المزيد من الاهتمامات} one {اختر اهتمامًا آخر} two {اختر اهتمامين آخرين} few {اختر # اهتمامات أخرى} many {اختر # اهتمامًا آخر} other {اختر # اهتمام آخر}}",
    "{count, plural, one {Выберите ещё # интерес} few {Выберите ещё # интереса} many {Выберите ещё # интересов} other {Выберите ещё # интереса}}",
    "{count, plural, one {Виберіть ще # інтерес} few {Виберіть ще # інтереси} many {Виберіть ще # інтересів} other {Виберіть ще # інтересу}}",
    "{count, plural, one {Elige # interés más} other {Elige # intereses más}}",
    "{count, plural, one {Escolhe mais # interesse} other {Escolhe mais # interesses}}",
    "{count, plural, one {Choisis encore # centre d’intérêt} other {Choisis encore # centres d’intérêt}}",
    "{count, plural, one {Wähle noch # Interesse} other {Wähle noch # Interessen}}",
  ],
  "system.interestsSelected": [
    "{count, plural, one {# interest selected} other {# interests selected}}",
    "{count, plural, zero {لم يتم اختيار أي اهتمام} one {تم اختيار اهتمام واحد} two {تم اختيار اهتمامين} few {تم اختيار # اهتمامات} many {تم اختيار # اهتمامًا} other {تم اختيار # اهتمام}}",
    "{count, plural, one {Выбран # интерес} few {Выбрано # интереса} many {Выбрано # интересов} other {Выбрано # интереса}}",
    "{count, plural, one {Вибрано # інтерес} few {Вибрано # інтереси} many {Вибрано # інтересів} other {Вибрано # інтересу}}",
    "{count, plural, one {# interés seleccionado} other {# intereses seleccionados}}",
    "{count, plural, one {# interesse selecionado} other {# interesses selecionados}}",
    "{count, plural, one {# centre d’intérêt sélectionné} other {# centres d’intérêt sélectionnés}}",
    "{count, plural, one {# Interesse ausgewählt} other {# Interessen ausgewählt}}",
  ],
  "system.noMatchingTargets": ["No matches found.", "لم يتم العثور على نتائج مطابقة.", "Совпадений не найдено.", "Збігів не знайдено.", "No se encontraron coincidencias.", "Não foram encontrados resultados.", "Aucun résultat trouvé.", "Keine Treffer gefunden."],
  "system.herWorld": ["Her World", "عالمها", "Её World", "Її World", "Su World", "O World dela", "Son World", "Ihr World"],
  "system.languageLoadError": ["Could not load this language. Please try again.", "تعذر تحميل هذه اللغة. حاول مرة أخرى.", "Не удалось загрузить язык. Попробуйте ещё раз.", "Не вдалося завантажити мову. Спробуйте ще раз.", "No se pudo cargar este idioma. Inténtalo de nuevo.", "Não foi possível carregar este idioma. Tenta novamente.", "Impossible de charger cette langue. Réessaie.", "Diese Sprache konnte nicht geladen werden. Bitte versuche es erneut."],
};
const aliases = JSON.parse(fs.readFileSync("src/i18n/aliases.json", "utf8"));
for (const [index, locale] of locales.entries()) {
  const file = `src/i18n/locales/${locale}.json`;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, row] of Object.entries(rows)) data[key] = row[index];
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}
for (const [key, row] of Object.entries(rows)) aliases[row[0]] = key;
fs.writeFileSync("src/i18n/aliases.json", JSON.stringify(aliases, null, 2) + "\n");

for (const file of ["src/components/onboarding/InterestStoryPicker.jsx", "src/components/onboarding/PrototypeInterestPicker.jsx"]) {
  let source = fs.readFileSync(file, "utf8");
  source = source.replaceAll('__msg("system.InterestStoryPicker.b06d5f01b8", { value0: remaining, value1: remaining === 1 ? "" : "s" })', '__msg("system.interestsRemaining", { count: remaining })');
  source = source.replace('{selected.length} {__msg("system.PrototypeInterestPicker.b729ffe026")}', '{__msg("system.interestsSelected", { count: selected.length })}');
  fs.writeFileSync(file, source);
}
for (const file of ["src/pages/creator/WorldPublishingPage.jsx", "src/pages/social/WorldReaderPage.jsx"]) {
  let source = fs.readFileSync(file, "utf8").replaceAll('/mo</', '{__msg("system.perMonth")}</');
  fs.writeFileSync(file, source);
}
