/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useProfileLanguageOptions } from "../../hooks/useProfileLanguageOptions";
import { profileLanguageCode } from "../../utils/profileLanguages";

export default function ProfileLanguagesField({ preferredLanguage, onChange }) {
  __useUiLanguage();
  const options = useProfileLanguageOptions();
  const selected = options.find((option) => option.code === profileLanguageCode(preferredLanguage, options));
  const [text, setText] = useState(selected?.name || preferredLanguage || "English");
  useEffect(() => { setText(selected?.name || preferredLanguage || __msg("profile.english")); }, [selected?.name, preferredLanguage]);
  return <label className="edit-profile-field">
    <span>{__msg("Spoken language")}</span>
    <input aria-label={__msg("Spoken language")} autoComplete="off" name="preferredLanguage" placeholder={__msg("profile.english")} required value={text} onChange={(event) => {
      const value = event.target.value;
      setText(value);
      const match = options.find((option) => option.name.toLowerCase() === value.trim().toLowerCase() || option.code.toLowerCase() === value.trim().toLowerCase());
      event.target.setCustomValidity(match ? "" : "Enter a supported language name, such as English, Tamil or Sinhala.");
      if (match) onChange({ target: { name: "preferredLanguage", value: match.code } });
    }} />
  </label>;
}
