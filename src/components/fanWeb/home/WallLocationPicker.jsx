import UniversalLocationPicker from "../../location/UniversalLocationPicker";

export default function WallLocationPicker({ anchorRef, location, onClose, onSelect }) {
  return <UniversalLocationPicker allowCustom={false} allowWorldwide anchorRef={anchorRef} onClose={onClose} onSelect={onSelect} title="Your area" value={location} />;
}
