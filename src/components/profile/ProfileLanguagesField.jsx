import { useEffect, useState } from "react";
import { useProfileLanguageOptions } from "../../hooks/useProfileLanguageOptions";
import { profileLanguageCode } from "../../utils/profileLanguages";

export default function ProfileLanguagesField({ preferredLanguage, onChange }) {
  const options = useProfileLanguageOptions();
  const selected = options.find((option) => option.code === profileLanguageCode(preferredLanguage, options));
  const [text, setText] = useState(selected?.name || preferredLanguage || "English");
  useEffect(() => { setText(selected?.name || preferredLanguage || "English"); }, [selected?.name, preferredLanguage]);
  return <label className="edit-profile-field">
    <span>Languages</span>
    <input aria-label="Languages" autoComplete="off" name="preferredLanguage" placeholder="English" required value={text} onChange={(event) => {
      const value = event.target.value;
      setText(value);
      const match = options.find((option) => option.name.toLowerCase() === value.trim().toLowerCase() || option.code.toLowerCase() === value.trim().toLowerCase());
      event.target.setCustomValidity(match ? "" : "Enter a supported language name, such as English, Tamil or Sinhala.");
      if (match) onChange({ target: { name: "preferredLanguage", value: match.code } });
    }} />
  </label>;
}
