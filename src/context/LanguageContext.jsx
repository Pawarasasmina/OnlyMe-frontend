import { useCallback, useEffect, useMemo, useState } from "react";
import { LanguageContext } from "./LanguageContext";

const LANGUAGE_KEY = "atseen_language";
const supported = new Set(["en", "ar", "ru", "uk", "es", "pt", "fr", "de"]);
const rtlLanguages = new Set(["ar"]);
const normalizeLanguage = (value) => {
  const base = String(value || "").trim().toLowerCase().split(/[-_]/u)[0];
  return supported.has(base) ? base : "en";
};

const common = {
  ar: ["الرئيسية", "المشاهدات", "اكتشف", "الرسائل", "النشاط", "الملف الشخصي", "التحقق", "مساحتك", "إنشاء ✦", "مشاهدة مجانية", "مشاهدة مدفوعة", "الفصول", "متابعة", "السعر والنشر", "عرض المشتري", "معاينة", "مقفل", "إضافة فصل", "إضافة مشاهدة", "تم", "التعليقات", "المشاهدات المدفوعة بالداخل"],
  ru: ["Главная", "Просмотрено", "Обзор", "Сообщения", "Активность", "Профиль", "Верификация", "Ваше пространство", "Создать ✦", "Бесплатный Seen", "Платный Seen", "Главы", "Продолжить", "Цена и публикация", "Вид покупателя", "Предпросмотр", "Закрыто", "Добавить главу", "Добавить Seen", "Готово", "Комментарии", "Платные Seen внутри"],
  uk: ["Головна", "Переглянуто", "Огляд", "Повідомлення", "Активність", "Профіль", "Перевірка", "Ваш простір", "Створити ✦", "Безкоштовний Seen", "Платний Seen", "Розділи", "Продовжити", "Ціна й публікація", "Вигляд покупця", "Попередній перегляд", "Заблоковано", "Додати розділ", "Додати Seen", "Готово", "Коментарі", "Платні Seen усередині"],
  es: ["Inicio", "Vistos", "Descubrir", "Mensajes", "Actividad", "Perfil", "Verificación", "Tu espacio", "Crear ✦", "Seen gratis", "Seen de pago", "Capítulos", "Continuar", "Precio y publicación", "Vista del comprador", "Vista previa", "Bloqueado", "Añadir capítulo", "Añadir un Seen", "Listo", "Comentarios", "Seens de pago incluidos"],
  fr: ["Accueil", "Vus", "Découvrir", "Messages", "Activité", "Profil", "Vérification", "Votre espace", "Créer ✦", "Seen gratuit", "Seen payant", "Chapitres", "Continuer", "Prix et publication", "Vue acheteur", "Aperçu", "Verrouillé", "Ajouter un chapitre", "Ajouter un Seen", "Terminé", "Commentaires", "Seens payants inclus"],
  pt: ["Início", "Vistos", "Descobrir", "Mensagens", "Atividade", "Perfil", "Verificação", "Seu espaço", "Criar ✦", "Seen grátis", "Seen pago", "Capítulos", "Continuar", "Preço e publicação", "Visão do comprador", "Prévia", "Bloqueado", "Adicionar capítulo", "Adicionar um Seen", "Concluído", "Comentários", "Seens pagos incluídos"],
  de: ["Startseite", "Gesehen", "Entdecken", "Nachrichten", "Aktivität", "Profil", "Verifizierung", "Dein Bereich", "Erstellen ✦", "Kostenloser Seen", "Bezahlter Seen", "Kapitel", "Weiter", "Preis & veröffentlichen", "Käuferansicht", "Vorschau", "Gesperrt", "Kapitel hinzufügen", "Seen hinzufügen", "Fertig", "Kommentare", "Enthaltene bezahlte Seens"],
};
const commonKeys = ["Home", "Seen", "Discover", "Messages", "Activity", "Profile", "Verification", "Your space", "Create ✦", "Free Seen", "Paid Seen", "Chapters", "Continue", "Price & publish", "Buyer view", "Preview", "Locked", "Add chapter", "Add a Seen", "Done", "Comments", "Paid Seens inside"];
const translations = Object.fromEntries(Object.entries(common).map(([language, values]) => [language, Object.fromEntries(commonKeys.map((key, index) => [key, values[index]]))]));
Object.assign(translations.ar, { "Account settings": "إعدادات الحساب", Email: "البريد الإلكتروني", Role: "الدور", "Preferred language": "اللغة المفضلة", "Time zone": "المنطقة الزمنية", "Phone number": "رقم الهاتف", "Save account": "حفظ الحساب", "Saving...": "جارٍ الحفظ...", Privacy: "الخصوصية", Notifications: "الإشعارات", Account: "الحساب" });
Object.assign(translations.ru, { "Account settings": "Настройки аккаунта", Email: "Эл. почта", Role: "Роль", "Preferred language": "Предпочитаемый язык", "Time zone": "Часовой пояс", "Phone number": "Номер телефона", "Save account": "Сохранить", "Saving...": "Сохранение...", Privacy: "Конфиденциальность", Notifications: "Уведомления", Account: "Аккаунт" });
Object.assign(translations.uk, { "Account settings": "Налаштування облікового запису", Email: "Електронна пошта", Role: "Роль", "Preferred language": "Бажана мова", "Time zone": "Часовий пояс", "Phone number": "Номер телефону", "Save account": "Зберегти", "Saving...": "Збереження...", Privacy: "Конфіденційність", Notifications: "Сповіщення", Account: "Обліковий запис" });
Object.assign(translations.es, { "Account settings": "Configuración de la cuenta", Email: "Correo electrónico", Role: "Rol", "Preferred language": "Idioma preferido", "Time zone": "Zona horaria", "Phone number": "Número de teléfono", "Save account": "Guardar cuenta", "Saving...": "Guardando...", Privacy: "Privacidad", Notifications: "Notificaciones", Account: "Cuenta" });
Object.assign(translations.fr, { "Account settings": "Paramètres du compte", Email: "E-mail", Role: "Rôle", "Preferred language": "Langue préférée", "Time zone": "Fuseau horaire", "Phone number": "Numéro de téléphone", "Save account": "Enregistrer", "Saving...": "Enregistrement...", Privacy: "Confidentialité", Notifications: "Notifications", Account: "Compte" });
Object.assign(translations.pt, { "Account settings": "Configurações da conta", Email: "E-mail", Role: "Função", "Preferred language": "Idioma preferido", "Time zone": "Fuso horário", "Phone number": "Número de telefone", "Save account": "Salvar conta", "Saving...": "Salvando...", Privacy: "Privacidade", Notifications: "Notificações", Account: "Conta" });
Object.assign(translations.de, { "Account settings": "Kontoeinstellungen", Email: "E-Mail", Role: "Rolle", "Preferred language": "Bevorzugte Sprache", "Time zone": "Zeitzone", "Phone number": "Telefonnummer", "Save account": "Konto speichern", "Saving...": "Wird gespeichert...", Privacy: "Datenschutz", Notifications: "Benachrichtigungen", Account: "Konto" });

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => normalizeLanguage(localStorage.getItem(LANGUAGE_KEY) || navigator.language));
  const setLanguage = useCallback((value) => setLanguageState(normalizeLanguage(value)), []);
  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = rtlLanguages.has(language) ? "rtl" : "ltr";
    document.documentElement.dataset.language = language;
  }, [language]);
  const value = useMemo(() => ({ language, locale: language, direction: rtlLanguages.has(language) ? "rtl" : "ltr", setLanguage, t: (text) => translations[language]?.[text] || text }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const languageContextTestUtils = { normalizeLanguage, rtlLanguages, translations };
