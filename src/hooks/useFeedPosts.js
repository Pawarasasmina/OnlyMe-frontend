import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { postService } from "../services/postService";

export const postKeys = {
  all: ["feed-posts"],
  feed: (params = {}) => ["feed-posts", "feed", params],
  mine: (params = {}) => ["feed-posts", "mine", params],
  drafts: ["feed-posts", "drafts"],
};

function insertPostIntoFeed(queryClient, post) {
  queryClient.setQueriesData({ queryKey: ["feed-posts", "feed"] }, (current) => {
    if (!current?.items) return current;
    const withoutDuplicate = current.items.filter((item) => item.id !== post.id);
    return { ...current, items: [post, ...withoutDuplicate] };
  });
}

function replacePostInCaches(queryClient, post) {
  queryClient.setQueriesData({ queryKey: ["feed-posts"] }, (current) => {
    if (!current?.items) return current;
    return {
      ...current,
      items: current.items.map((item) => (
        item.id === post.id || item.originalPostId === post.id
          ? { ...item, ...post, id: item.id, originalPostId: item.originalPostId || post.id, shareId: item.shareId || post.shareId || null, sharedBy: item.sharedBy || post.sharedBy || null, shareCaption: item.shareCaption || post.shareCaption || "", feedCreatedAt: item.feedCreatedAt || post.feedCreatedAt }
          : item
      )),
    };
  });
}

function removePostFromCaches(queryClient, postId) {
  queryClient.setQueriesData({ queryKey: ["feed-posts"] }, (current) => {
    if (!current?.items) return current;
    return { ...current, items: current.items.filter((item) => item.id !== postId) };
  });
}

export function useFeedPosts(params = {}) {
  return useQuery({
    queryKey: postKeys.feed(params),
    queryFn: () => postService.getFeedPosts(params),
    retry: false,
  });
}

export function useMyFeedPosts(params = {}, options = {}) {
  return useQuery({
    queryKey: postKeys.mine(params),
    queryFn: () => postService.getMyPosts(params),
    retry: false,
    ...options,
  });
}

export function usePostDrafts(options = {}) {
  return useQuery({
    queryKey: postKeys.drafts,
    queryFn: () => postService.getDrafts(),
    retry: false,
    ...options,
  });
}

export function useCreateFeedPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formData, onUploadProgress, signal }) => postService.createPost(formData, { onUploadProgress, signal }),
    retry: false,
    onSuccess: (post) => {
      insertPostIntoFeed(queryClient, post);
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useSavePostDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formData, onUploadProgress, signal }) => postService.saveDraft(formData, { onUploadProgress, signal }),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.drafts }),
  });
}

export function useUpdateFeedPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, postId }) => postService.updatePost(postId, payload),
    retry: false,
    onSuccess: (post) => {
      replacePostInCaches(queryClient, post);
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useDeleteFeedPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postService.deletePost,
    retry: false,
    onSuccess: (_data, postId) => {
      removePostFromCaches(queryClient, postId);
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useReactToFeedPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, reaction }) => postService.reactToPost(postId, reaction),
    retry: false,
    onSuccess: (post) => {
      replacePostInCaches(queryClient, post);
    },
  });
}

export function useCreateFeedPostComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, text }) => postService.createComment(postId, text),
    retry: false,
    onSuccess: (post) => {
      replacePostInCaches(queryClient, post);
    },
  });
}

export function useToggleFeedPostSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postService.toggleSave,
    retry: false,
    onSuccess: (post) => {
      replacePostInCaches(queryClient, post);
      queryClient.invalidateQueries({ queryKey: ["saved-content"] });
    },
  });
}

export function useToggleFeedPostShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caption = "", postId }) => postService.toggleShare(postId, caption),
    retry: false,
    onSuccess: (post) => {
      replacePostInCaches(queryClient, post);
      queryClient.invalidateQueries({ queryKey: postKeys.all });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
    },
  });
}

export function useMarkFeedPostViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postService.markView,
    retry: false,
    onSuccess: (result, postId) => {
      const targetId = String(result?.postId || postId || "");
      const viewCount = Number(result?.viewCount);
      if (!targetId || !Number.isFinite(viewCount)) return;

      queryClient.setQueriesData({ queryKey: ["feed-posts"] }, (current) => {
        if (!current?.items) return current;
        return {
          ...current,
          items: current.items.map((item) => {
            const itemId = String(item.originalPostId || item.id || "");
            if (itemId !== targetId) return item;
            return { ...item, viewCount, viewerViewed: true };
          }),
        };
      });
    },
  });
}

export function useHideFeedPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, reason }) => postService.hidePost(postId, reason),
    retry: false,
    onSuccess: (_data, { postId }) => {
      removePostFromCaches(queryClient, postId);
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useReportFeedPost() {
  return useMutation({
    mutationFn: ({ payload, postId }) => postService.reportPost(postId, payload),
    retry: false,
  });
}

export function useBlockFeedPostAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postService.blockPostAuthor,
    retry: false,
    onSuccess: (data) => {
      if (data?.blockedUserId) {
        queryClient.setQueriesData({ queryKey: ["feed-posts"] }, (current) => {
          if (!current?.items) return current;
          return { ...current, items: current.items.filter((item) => String(item.author?.id || item.authorId || item.creatorId) !== String(data.blockedUserId)) };
        });
      }
      queryClient.invalidateQueries({ queryKey: postKeys.all });
      queryClient.invalidateQueries({ queryKey: ["orbit"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });
}
