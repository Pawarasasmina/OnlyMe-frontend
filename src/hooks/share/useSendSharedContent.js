import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shareService } from "../../services/shareService";

export function useSendSharedContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ message = "", recipients = [], sharedContent }) => shareService.sendSharedContent({
      recipientIds: recipients.map((recipient) => recipient.id),
      text: message,
      sharedContent: {
        contentType: sharedContent.contentType,
        contentId: sharedContent.contentId,
      },
    }).then((response) => response.data.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      (data?.sent || []).forEach((item) => {
        if (item.recipientId) queryClient.invalidateQueries({ queryKey: ["messages", item.recipientId] });
      });
      queryClient.invalidateQueries({ queryKey: ["share-recipients"] });
    },
  });
}
