import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "../../services/profileService";
import { useFanToast } from "../fanWeb/shared/FanToastContext";

export default function ActivityFollowAction({ username }) {
  const client = useQueryClient();
  const { showToast } = useFanToast();
  const profile = useQuery({ queryKey: ["unified-profile", username], queryFn: () => profileService.getUnifiedProfile(username).then((response) => response.data.data), staleTime: 30000 });
  const follow = useMutation({
    mutationFn: () => profileService.toggleFollow(username),
    onMutate: () => client.cancelQueries({ queryKey: ["unified-profile", username], exact: true }),
    onSuccess: (response, wasFollowing) => {
      const active = response.data?.data?.relationship?.active;
      const following = typeof active === "boolean" ? active : !wasFollowing;
      client.setQueryData(["unified-profile", username], (current) => current ? {
        ...current,
        viewerRelationship: { ...current.viewerRelationship, following },
      } : current);
      return Promise.all([
        ["profile"], ["unified-profile"], ["fan", "activity"], ["wall-stories"], ["discover"],
      ].map((queryKey) => client.invalidateQueries({ queryKey })));
    },
    onError: () => showToast("Could not update following. Try again."),
  });
  if (profile.isError) return null;
  const following = Boolean(profile.data?.viewerRelationship?.following);
  return <button className={`activity-follow-action${following ? " is-following" : ""}`} disabled={profile.isPending || follow.isPending} onClick={(event) => { event.stopPropagation(); follow.mutate(following); }} onKeyDown={(event) => event.stopPropagation()} type="button">{following ? "Following" : "Follow back"}</button>;
}
