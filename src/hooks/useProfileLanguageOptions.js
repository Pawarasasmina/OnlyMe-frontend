import { useQuery } from "@tanstack/react-query";
import { voiceService } from "../services/voiceService";
import { FALLBACK_PROFILE_LANGUAGES } from "../utils/profileLanguages";
export function useProfileLanguageOptions() {
  const query = useQuery({ queryKey: ["profile-language-options"], queryFn: () => voiceService.getVoiceTranslationLanguages(), staleTime: 5 * 60 * 1000, retry: false });
  return query.data?.languages?.length ? query.data.languages : FALLBACK_PROFILE_LANGUAGES;
}
