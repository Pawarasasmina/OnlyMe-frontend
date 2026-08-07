import { useCallback, useMemo } from "react";
import { useDiscoverFollowMutation, useDiscoverQuery } from "../../hooks/useDiscoverQuery";
import HomeRightRail from "./home/HomeRightRail";

function FanWebRightRail({ user }) {
  const viewerId = user?.id || user?._id || "";
  const queryParams = useMemo(
    () => ({ _viewerId: viewerId, filter: "for_you", limit: 8 }),
    [viewerId],
  );
  const discoverQuery = useDiscoverQuery(queryParams);
  const followMutation = useDiscoverFollowMutation(queryParams);
  const recommendations = useMemo(
    () => discoverQuery.data?.recommendations || [],
    [discoverQuery.data?.recommendations],
  );
  const suggestedUsers = useMemo(() => (
    discoverQuery.data?.suggestedUsers?.length
      ? discoverQuery.data.suggestedUsers
      : recommendations
        .filter((person) => !(person.isFollowing || person.following || person.actions?.following))
        .slice(0, 4)
  ), [discoverQuery.data?.suggestedUsers, recommendations]);
  const toggleFollow = useCallback((person) => {
    if (person?.username) followMutation.mutate(person);
  }, [followMutation]);

  return (
    <HomeRightRail
      activity={discoverQuery.data?.activity}
      className="social-fixed-rail social-shared-right-rail"
      followPending={followMutation.isPending}
      freshSeens={discoverQuery.data?.freshSeens || []}
      onFollowToggle={toggleFollow}
      suggestedUsers={suggestedUsers}
      trendingSeen={discoverQuery.data?.trendingSeen || null}
    />
  );
}

export default FanWebRightRail;
