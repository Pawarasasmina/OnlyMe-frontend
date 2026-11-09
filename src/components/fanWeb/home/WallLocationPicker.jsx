import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { msg as __msg } from "../../../i18n/runtime.js";
import UniversalLocationPicker from "../../location/UniversalLocationPicker";

export default function WallLocationPicker({ anchorRef, location, onClose, onSelect }) {
  __useUiLanguage();
  return <UniversalLocationPicker allowCustom={false} allowWorldwide anchorRef={anchorRef} onClose={onClose} onSelect={onSelect} title={__msg("system.WallLocationPicker.1084e4ffd9")} value={location} />;
}
