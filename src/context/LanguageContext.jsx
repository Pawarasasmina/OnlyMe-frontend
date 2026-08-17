import { useCallback, useEffect, useMemo, useState } from "react";
import { LanguageContext } from "./LanguageContext";

const LANGUAGE_KEY = "atseen_language";
const supported = new Set(["en", "ar", "ru", "es", "fr", "pt"]);

const russian = {
  Home: "Главная", Seen: "Просмотрено", Discover: "Обзор", Messages: "Сообщения", Activity: "Активность", Profile: "Профиль",
  Verification: "Верификация", "Your space": "Ваше пространство", "Create ✦": "Создать ✦", "Verify ✦": "Подтвердить ✦",
  "Account settings": "Настройки аккаунта", "Account identifiers are shown here as read-only.": "Данные аккаунта доступны только для просмотра.",
  Email: "Эл. почта", Role: "Роль", "Preferred language": "Предпочитаемый язык", "Time zone": "Часовой пояс", "Phone number": "Номер телефона",
  "Save account": "Сохранить", "Saving...": "Сохранение...", "Change password": "Изменить пароль", "Your current password is required.": "Требуется текущий пароль.",
  "Current password": "Текущий пароль", "New password": "Новый пароль", "Confirm new password": "Подтвердите пароль", "Changing...": "Изменение...",
  "Loading account settings...": "Загрузка настроек...", "Unable to load account settings.": "Не удалось загрузить настройки аккаунта.",
  "Account preferences saved.": "Настройки аккаунта сохранены.", "Password changed successfully. Please sign in again on other devices.": "Пароль изменён. Войдите заново на других устройствах.",
  Privacy: "Конфиденциальность", Notifications: "Уведомления", Account: "Аккаунт",
};

const arabic = {
  Home: "الرئيسية", Seen: "المشاهدات", Discover: "اكتشف", Messages: "الرسائل", Activity: "النشاط", Profile: "الملف الشخصي", Verification: "التحقق", "Your space": "مساحتك", "Create ✦": "إنشاء ✦", "Verify ✦": "تحقق ✦",
  "Account settings": "إعدادات الحساب", "Account identifiers are shown here as read-only.": "تظهر بيانات الحساب هنا للقراءة فقط.", Email: "البريد الإلكتروني", Role: "الدور", "Preferred language": "اللغة المفضلة", "Time zone": "المنطقة الزمنية", "Phone number": "رقم الهاتف", "Save account": "حفظ الحساب", "Saving...": "جارٍ الحفظ...", "Change password": "تغيير كلمة المرور", "Your current password is required.": "كلمة المرور الحالية مطلوبة.", "Current password": "كلمة المرور الحالية", "New password": "كلمة المرور الجديدة", "Confirm new password": "تأكيد كلمة المرور", "Changing...": "جارٍ التغيير...", Privacy: "الخصوصية", Notifications: "الإشعارات", Account: "الحساب",
};
const spanish = {
  Home: "Inicio", Seen: "Vistos", Discover: "Descubrir", Messages: "Mensajes", Activity: "Actividad", Profile: "Perfil", Verification: "Verificación", "Your space": "Tu espacio", "Create ✦": "Crear ✦", "Verify ✦": "Verificar ✦",
  "Account settings": "Configuración de la cuenta", "Account identifiers are shown here as read-only.": "Los datos de la cuenta se muestran como solo lectura.", Email: "Correo electrónico", Role: "Rol", "Preferred language": "Idioma preferido", "Time zone": "Zona horaria", "Phone number": "Número de teléfono", "Save account": "Guardar cuenta", "Saving...": "Guardando...", "Change password": "Cambiar contraseña", "Your current password is required.": "Se requiere tu contraseña actual.", "Current password": "Contraseña actual", "New password": "Nueva contraseña", "Confirm new password": "Confirmar contraseña", "Changing...": "Cambiando...", Privacy: "Privacidad", Notifications: "Notificaciones", Account: "Cuenta",
};
const french = {
  Home: "Accueil", Seen: "Vus", Discover: "Découvrir", Messages: "Messages", Activity: "Activité", Profile: "Profil", Verification: "Vérification", "Your space": "Votre espace", "Create ✦": "Créer ✦", "Verify ✦": "Vérifier ✦",
  "Account settings": "Paramètres du compte", "Account identifiers are shown here as read-only.": "Les informations du compte sont affichées en lecture seule.", Email: "E-mail", Role: "Rôle", "Preferred language": "Langue préférée", "Time zone": "Fuseau horaire", "Phone number": "Numéro de téléphone", "Save account": "Enregistrer", "Saving...": "Enregistrement...", "Change password": "Changer le mot de passe", "Your current password is required.": "Votre mot de passe actuel est requis.", "Current password": "Mot de passe actuel", "New password": "Nouveau mot de passe", "Confirm new password": "Confirmer le mot de passe", "Changing...": "Modification...", Privacy: "Confidentialité", Notifications: "Notifications", Account: "Compte",
};
const portuguese = {
  Home: "Início", Seen: "Vistos", Discover: "Descobrir", Messages: "Mensagens", Activity: "Atividade", Profile: "Perfil", Verification: "Verificação", "Your space": "Seu espaço", "Create ✦": "Criar ✦", "Verify ✦": "Verificar ✦",
  "Account settings": "Configurações da conta", "Account identifiers are shown here as read-only.": "Os dados da conta são exibidos somente para leitura.", Email: "E-mail", Role: "Função", "Preferred language": "Idioma preferido", "Time zone": "Fuso horário", "Phone number": "Número de telefone", "Save account": "Salvar conta", "Saving...": "Salvando...", "Change password": "Alterar senha", "Your current password is required.": "Sua senha atual é obrigatória.", "Current password": "Senha atual", "New password": "Nova senha", "Confirm new password": "Confirmar nova senha", "Changing...": "Alterando...", Privacy: "Privacidade", Notifications: "Notificações", Account: "Conta",
};
const translations = { ar: arabic, es: spanish, fr: french, pt: portuguese, ru: russian };

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return supported.has(saved) ? saved : "en";
  });
  const setLanguage = useCallback((value) => setLanguageState(supported.has(value) ? value : "en"), []);
  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (text) => translations[language]?.[text] || text }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
