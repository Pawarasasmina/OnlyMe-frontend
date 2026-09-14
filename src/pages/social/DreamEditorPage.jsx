import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DreamEditor } from "../../components/profile/ProfileDream";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { dreamService } from "../../services/dreamService";
import { profileService } from "../../services/profileService";

export default function DreamEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["unified-profile", "me"],
    queryFn: () => profileService.getUnifiedMe().then((response) => response.data.data),
    retry: false,
  });
  const username = profileQuery.data?.profile?.username;
  const dreamQuery = useQuery({
    queryKey: ["creator-dream", username],
    queryFn: () => dreamService.getCreatorDream(username).then((response) => response.data.data),
    enabled: Boolean(username),
    retry: false,
  });

  if (profileQuery.isLoading || dreamQuery.isLoading) return <div className="profile-dream-page"><LoadingSkeleton className="h-[520px]" count={1} /></div>;
  if (profileQuery.isError || dreamQuery.isError) return <div className="profile-dream-page profile-dream-page-state"><strong>Dream editor could not load.</strong><button onClick={() => navigate("/profile")} type="button">Back to profile</button></div>;

  const dream = dreamQuery.data?.dream?.status === "ACTIVE" ? dreamQuery.data.dream : null;
  return <main className="profile-dream-page">
    <DreamEditor
      dream={dream}
      fullPage
      onClose={() => navigate("/profile")}
      onSaved={async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["creator-dream"] }),
          queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
        ]);
        navigate("/profile");
      }}
    />
  </main>;
}
